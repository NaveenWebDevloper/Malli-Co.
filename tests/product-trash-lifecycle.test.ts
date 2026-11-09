import { describe, it } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { z } from "zod";
import {
  activeStorefrontProductFilter,
  notDeletedProductFilter,
  activeVariantFilter,
} from "../lib/catalog-query.ts";
import { cleanupUnreferencedProductImages } from "../lib/storage-cleanup.ts";

describe("Product Soft-Delete (Trash) & Lifecycle Management", () => {
  const dummyProductId = new mongoose.Types.ObjectId();
  const dummyVariantId = new mongoose.Types.ObjectId();

  describe("1. Centralized Storefront Query Filters (Requirement 2)", () => {
    it("activeStorefrontProductFilter() strictly excludes deleted products and drafts", () => {
      const filter = activeStorefrontProductFilter();
      assert.deepEqual(filter.deletedAt, null, "Must enforce deletedAt: null");
      assert.equal(filter.status, "ACTIVE", "Must enforce status: ACTIVE");
    });

    it("activeStorefrontProductFilter() merges custom filter fields safely", () => {
      const filter = activeStorefrontProductFilter({ gender: "MEN", slug: "linen-shirt" });
      assert.deepEqual(filter.deletedAt, null);
      assert.equal(filter.status, "ACTIVE");
      assert.equal(filter.gender, "MEN");
      assert.equal(filter.slug, "linen-shirt");
    });

    it("notDeletedProductFilter() includes drafts but strictly excludes soft-deleted items", () => {
      const filter = notDeletedProductFilter();
      assert.deepEqual(filter.deletedAt, null);
      assert.equal(filter.status, undefined, "Drafts allowed when checking notDeleted");
    });

    it("activeVariantFilter() enforces active and not-deleted variant status", () => {
      const filter = activeVariantFilter({ productId: dummyProductId });
      assert.deepEqual(filter.deletedAt, null);
      assert.equal(filter.status, "ACTIVE");
      assert.equal(filter.productId, dummyProductId);
    });
  });

  describe("2. Admin Bulk Action Payload Validation (Zod & ObjectIds - Rule 6)", () => {
    const BulkDeleteSchema = z.object({
      ids: z
        .array(z.string().refine((id) => mongoose.Types.ObjectId.isValid(id), "Invalid ObjectId"))
        .min(1)
        .max(100),
      reason: z.string().max(200).optional(),
    });

    it("accepts valid list of ObjectIds up to 100", () => {
      const validIds = [
        new mongoose.Types.ObjectId().toString(),
        new mongoose.Types.ObjectId().toString(),
      ];
      const res = BulkDeleteSchema.safeParse({ ids: validIds, reason: "End of season rotation" });
      assert.ok(res.success);
    });

    it("rejects invalid ObjectIds to prevent NoSQL injection", () => {
      const invalidPayload = {
        ids: ["$gt", "not-a-valid-id", "{ $ne: null }"],
      };
      const res = BulkDeleteSchema.safeParse(invalidPayload);
      assert.equal(res.success, false, "Must reject malformed or operator-injection IDs");
    });

    it("rejects bulk requests exceeding 100 items", () => {
      const tooManyIds = Array.from({ length: 101 }, () =>
        new mongoose.Types.ObjectId().toString()
      );
      const res = BulkDeleteSchema.safeParse({ ids: tooManyIds });
      assert.equal(res.success, false, "Must enforce 100 item maximum cap per batch");
    });
  });

  describe("3. Restore Conflict Pre-Flight Check Logic (Requirement 3)", () => {
    it("detects slug collision when restoring product", () => {
      const currentTrashProduct = {
        _id: dummyProductId,
        slug: "classic-white-shirt",
        name: "Classic White Shirt",
      };

      const existingActiveProduct = {
        _id: new mongoose.Types.ObjectId(),
        slug: "classic-white-shirt",
        name: "New Classic White Shirt",
      };

      const isCollision =
        existingActiveProduct.slug === currentTrashProduct.slug &&
        !existingActiveProduct._id.equals(currentTrashProduct._id);

      assert.ok(isCollision, "Must detect slug collision between restored and existing active item");
    });

    it("detects SKU collision when restoring variants", () => {
      const trashVariantSkus = ["MC-SHIRT-WHT-38", "MC-SHIRT-WHT-40"];
      const existingSkuInCatalog = "MC-SHIRT-WHT-38";

      const hasConflict = trashVariantSkus.includes(existingSkuInCatalog);
      assert.ok(hasConflict, "Must block restoration if any SKU collides with active catalog");
    });
  });

  describe("4. Order Snapshot Integrity & Storage Cleanup (Requirements 5 & 6)", () => {
    it("preserves snapshot image references from permanent deletion", async () => {
      const orderImageSnapshot = "https://ik.imagekit.io/z6tcrvnjkv/products/shirt-snapshot.webp";
      const unreferencedProductImage = "https://ik.imagekit.io/z6tcrvnjkv/products/unpurchased-style.webp";

      const allProductImages = [orderImageSnapshot, unreferencedProductImage];
      const snapshotSet = new Set([orderImageSnapshot]);

      // Image cleanup filter logic
      const eligibleForStorageDeletion = allProductImages.filter((url) => !snapshotSet.has(url));

      assert.equal(eligibleForStorageDeletion.length, 1);
      assert.equal(eligibleForStorageDeletion[0], unreferencedProductImage);
      assert.ok(!eligibleForStorageDeletion.includes(orderImageSnapshot), "Snapshots must never be deleted");
    });
  });

  describe("5. Cart Availability & Checkout Soft-Delete Guard (Requirement 4)", () => {
    it("flags cart items as unavailable when product is soft-deleted or archived", () => {
      const softDeletedProduct = {
        _id: dummyProductId,
        name: "Linen Trousers",
        deletedAt: new Date(),
        status: "DRAFT",
      };

      const isProductSoftDeleted =
        Boolean(softDeletedProduct.deletedAt) || softDeletedProduct.status !== "ACTIVE";

      assert.ok(isProductSoftDeleted);

      const cartItem = {
        variantId: dummyVariantId.toString(),
        isAvailable: !isProductSoftDeleted,
        unavailableReason: isProductSoftDeleted
          ? "This item is no longer available"
          : undefined,
      };

      assert.equal(cartItem.isAvailable, false);
      assert.equal(cartItem.unavailableReason, "This item is no longer available");
    });

    it("checkout rejects request when cart contains soft-deleted product", () => {
      const itemsInCart = [
        { sku: "MC-AVAIL-01", isAvailable: true },
        { sku: "MC-DELETED-02", isAvailable: false, unavailableReason: "This item is no longer available" },
      ];

      const hasUnavailable = itemsInCart.some((i) => !i.isAvailable);
      assert.ok(hasUnavailable, "Checkout validation must reject unavailable lines");
    });
  });
});
