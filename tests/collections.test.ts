import { describe, it } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import {
  CollectionCreateSchema,
  CollectionUpdateSchema,
  CollectionAutoRuleSchema,
} from "../lib/validations/collection.ts";
import { getColorHex } from "../lib/collections.ts";
import { resolvePrice, type ResolvedPriceResult } from "../lib/pricing.ts";

describe("Curated Collections Engine: Data Validation, Auto Rules & Pricing", () => {
  const validMongoId1 = new mongoose.Types.ObjectId().toString();
  const validMongoId2 = new mongoose.Types.ObjectId().toString();
  const validMongoId3 = new mongoose.Types.ObjectId().toString();

  describe("1. Zod Schema Validation (Rule 6)", () => {
    it("validates a complete MANUAL collection with ordered productIds", () => {
      const validManual = {
        name: "Spring Tailoring Showcase",
        slug: "spring-tailoring",
        title: "Spring Tailoring",
        subtitle: "Handcrafted Italian linen blazers and trousers",
        mode: "MANUAL",
        productIds: [validMongoId1, validMongoId2, validMongoId3],
        maxItems: 12,
        active: true,
      };

      const result = CollectionCreateSchema.safeParse(validManual);
      assert.ok(result.success, "Valid manual collection must pass schema validation");
      if (result.success) {
        assert.equal(result.data.mode, "MANUAL");
        assert.equal(result.data.productIds.length, 3);
        assert.equal(result.data.productIds[0], validMongoId1);
        assert.equal(result.data.maxItems, 12);
      }
    });

    it("validates an AUTO collection with BESTSELLERS rule", () => {
      const validAuto = {
        name: "Storewide Bestsellers Shelf",
        slug: "bestsellers",
        title: "Season's Top Picks",
        mode: "AUTO",
        autoRule: {
          type: "BESTSELLERS",
          gender: "MEN",
          limit: 10,
        },
        maxItems: 10,
        active: true,
      };

      const result = CollectionCreateSchema.safeParse(validAuto);
      assert.ok(result.success, "Valid auto collection must pass schema validation");
      if (result.success) {
        assert.equal(result.data.mode, "AUTO");
        assert.equal(result.data.autoRule?.type, "BESTSELLERS");
        assert.equal(result.data.autoRule?.gender, "MEN");
      }
    });

    it("validates an AUTO collection with NEWEST and ON_SALE rules", () => {
      for (const ruleType of ["NEWEST", "ON_SALE"] as const) {
        const slugFormatted = `auto-${ruleType.toLowerCase().replace(/_/g, "-")}`;
        const payload = {
          name: `Auto ${ruleType} Collection`,
          slug: slugFormatted,
          title: `Auto ${ruleType}`,
          mode: "AUTO",
          autoRule: {
            type: ruleType,
            limit: 8,
          },
          maxItems: 8,
          active: true,
        };
        const res = CollectionCreateSchema.safeParse(payload);
        assert.ok(res.success, `Auto rule ${ruleType} must be valid`);
      }
    });

    it("rejects AUTO mode if autoRule is missing", () => {
      const invalidAuto = {
        name: "Missing Rule Auto",
        slug: "missing-rule",
        title: "Missing Rule",
        mode: "AUTO",
        maxItems: 10,
        active: true,
      };

      const result = CollectionCreateSchema.safeParse(invalidAuto);
      assert.equal(result.success, false, "Must reject AUTO collection without autoRule");
      if (!result.success) {
        const issues = result.error.issues;
        assert.ok(issues && issues.length > 0, "Must contain issues");
        assert.ok(issues.some((i) => i.path.includes("autoRule")), "Error must point to autoRule");
      }
    });

    it("rejects invalid slugs (spaces, underscores, special chars, double hyphens)", () => {
      const invalidSlugs = [
        "seasons top picks", // Spaces
        "seasons_top_picks", // Underscores
        "seasons@top", // Special symbol
        "-leading-dash", // Leading hyphen
        "trailing-dash-", // Trailing hyphen
        "double--hyphen", // Consecutive hyphens
      ];

      for (const slug of invalidSlugs) {
        const payload = {
          name: "Test Collection",
          slug,
          title: "Test",
          mode: "MANUAL",
        };
        const res = CollectionCreateSchema.safeParse(payload);
        assert.equal(res.success, false, `Slug '${slug}' should be rejected`);
      }
    });

    it("enforces maxItems boundaries (min 2, max 24)", () => {
      const payloadUnder = {
        name: "Under Minimum",
        slug: "under-min",
        title: "Under",
        mode: "MANUAL",
        maxItems: 1, // Below 2
      };
      assert.equal(CollectionCreateSchema.safeParse(payloadUnder).success, false);

      const payloadOver = {
        name: "Over Maximum",
        slug: "over-max",
        title: "Over",
        mode: "MANUAL",
        maxItems: 25, // Above 24
      };
      assert.equal(CollectionCreateSchema.safeParse(payloadOver).success, false);
    });
  });

  describe("2. Color Swatches & Hex Resolution", () => {
    it("resolves canonical color swatches to corresponding luxury hex values", () => {
      assert.equal(getColorHex("Navy Blue"), "#1A2B4C");
      assert.equal(getColorHex("navy"), "#1A2B4C");
      assert.equal(getColorHex("Olive Green"), "#556B2F");
      assert.equal(getColorHex("Burgundy"), "#800020");
      assert.equal(getColorHex("White"), "#FFFFFF");
      assert.equal(getColorHex("Black"), "#111111");
      assert.equal(getColorHex("Charcoal"), "#36454F");
      assert.equal(getColorHex("Clay"), "#B66A50");
    });

    it("falls back to default neutral luxury tone for unknown colors without failing", () => {
      const fallback = getColorHex("Moonlight Shimmer");
      assert.ok(fallback.startsWith("#"), "Fallback must be a valid hex color code");
      assert.equal(fallback, "#A39783");
    });
  });

  describe("3. Manual Ordering & Product Skipping Simulation", () => {
    it("preserves exact manual ordering while skipping DRAFT and zero-stock products", () => {
      // Simulate raw catalog dataset
      const mockProducts = [
        {
          _id: validMongoId1,
          name: "Linen Shirt A",
          status: "ACTIVE",
          stock: 15,
        },
        {
          _id: validMongoId2,
          name: "Draft Blazer B",
          status: "DRAFT", // Should be skipped!
          stock: 20,
        },
        {
          _id: validMongoId3,
          name: "Out of Stock Kurta C",
          status: "ACTIVE",
          stock: 0, // Should be skipped!
        },
      ];

      // Customer set manual order: [validMongoId2, validMongoId1, validMongoId3]
      const requestedOrder = [validMongoId2, validMongoId1, validMongoId3];

      // Simulate the resolution pipeline
      const productMap = new Map(mockProducts.map((p) => [p._id, p]));
      const resolvedList: typeof mockProducts = [];

      for (const id of requestedOrder) {
        const item = productMap.get(id);
        if (!item) continue;
        if (item.status !== "ACTIVE") continue; // Skip non-active
        if (item.stock <= 0) continue; // Skip zero stock
        resolvedList.push(item);
      }

      // Assertions
      assert.equal(resolvedList.length, 1, "Only active product with stock should remain");
      assert.equal(resolvedList[0]._id, validMongoId1);
      assert.equal(resolvedList[0].name, "Linen Shirt A");
    });

    it("preserves user-specified order when multiple active products with stock are present", () => {
      const p1 = { _id: "1", name: "First", status: "ACTIVE", stock: 10 };
      const p2 = { _id: "2", name: "Second", status: "ACTIVE", stock: 5 };
      const p3 = { _id: "3", name: "Third", status: "ACTIVE", stock: 8 };

      const map = new Map([
        ["1", p1],
        ["2", p2],
        ["3", p3],
      ]);

      // Reverse order requested: 3, 1, 2
      const manualOrder = ["3", "1", "2"];
      const resolved = manualOrder
        .map((id) => map.get(id))
        .filter((p) => p && p.status === "ACTIVE" && p.stock > 0);

      assert.equal(resolved.length, 3);
      assert.equal(resolved[0]?._id, "3");
      assert.equal(resolved[1]?._id, "1");
      assert.equal(resolved[2]?._id, "2");
    });
  });

  describe("4. Pricing Resolver Integration with Collections", () => {
    it("correctly resolves product pricing with active campaign discount", () => {
      const product = {
        _id: new mongoose.Types.ObjectId(),
        basePricePaise: 299900, // ₹2,999.00
      };
      const variant = {
        pricePaise: 299900,
        compareAtPricePaise: 399900, // ₹3,999.00
      };

      const campaign: any = {
        _id: new mongoose.Types.ObjectId(),
        name: "Season Sale",
        active: true,
        priority: 10,
        startsAt: new Date(Date.now() - 3600000),
        endsAt: new Date(Date.now() + 3600000),
        discount: { kind: "PERCENT", value: 20 },
        scope: { mode: "ALL" },
        display: { badgeLabel: "20% OFF" },
      };

      const resolved = resolvePrice(variant, product, [campaign]);

      assert.equal(resolved.basePrice, 299900);
      assert.equal(resolved.compareAtPrice, 399900);
      // 20% off 299900 is 59980 paise discount -> 239920 paise (₹2,399.20)
      assert.equal(resolved.finalPrice, 239920);
      // Discount % against compareAtPrice 399900: (399900 - 239920) / 399900 = 40%
      assert.equal(resolved.discountPercent, 40);
      assert.equal(resolved.badgeLabel, "20% OFF");
    });

    it("sorts ON_SALE collection candidates by highest discount percent", () => {
      const candidateA: { id: string; discountPercent: number } = { id: "A", discountPercent: 15 };
      const candidateB: { id: string; discountPercent: number } = { id: "B", discountPercent: 40 };
      const candidateC: { id: string; discountPercent: number } = { id: "C", discountPercent: 25 };

      const list = [candidateA, candidateB, candidateC];
      list.sort((a, b) => b.discountPercent - a.discountPercent);

      assert.equal(list[0].id, "B", "Highest discount (40%) must be first");
      assert.equal(list[1].id, "C", "Second highest (25%) must be second");
      assert.equal(list[2].id, "A", "Lowest discount (15%) must be third");
    });
  });
});
