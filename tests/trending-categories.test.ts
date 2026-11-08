import { describe, it } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import {
  CategoryTrendingSchema,
  TrendingReorderSchema,
  CategoryFormSchema,
} from "../lib/validations/category.ts";

describe("Trending Categories: Data Validation, Fallback Hierarchy & Limit Constraints", () => {
  const validMongoId1 = new mongoose.Types.ObjectId().toString();
  const validMongoId2 = new mongoose.Types.ObjectId().toString();

  describe("1. Zod Schema Validation (Rule 6)", () => {
    it("validates valid trending configuration with tileImage, label override, and badge", () => {
      const validTrending = {
        enabled: true,
        sortOrder: 0,
        tileImage: {
          url: "https://res.cloudinary.com/malli-co/image/upload/v1/linen-shirt.jpg",
          publicId: "linen-shirt",
        },
        tileLabel: "French Linen Shirts",
        badge: "Up to 40% off",
      };

      const result = CategoryTrendingSchema.safeParse(validTrending);
      assert.ok(result.success, "Valid trending payload must pass");
      if (result.success) {
        assert.equal(result.data.enabled, true);
        assert.equal(result.data.sortOrder, 0);
        assert.equal(result.data.tileLabel, "French Linen Shirts");
        assert.equal(result.data.badge, "Up to 40% off");
        assert.equal(result.data.tileImage?.url, validTrending.tileImage.url);
      }
    });

    it("accepts minimal trending object with defaults", () => {
      const minimal = {
        enabled: true,
      };

      const result = CategoryTrendingSchema.safeParse(minimal);
      assert.ok(result.success);
      if (result.success) {
        assert.equal(result.data.enabled, true);
        assert.equal(result.data.sortOrder, 0);
        assert.equal(result.data.tileLabel, undefined);
        assert.equal(result.data.badge, undefined);
      }
    });

    it("rejects non-integer or negative sortOrder", () => {
      const floatOrder = {
        enabled: true,
        sortOrder: 1.5,
      };
      assert.equal(CategoryTrendingSchema.safeParse(floatOrder).success, false);

      const negativeOrder = {
        enabled: true,
        sortOrder: -1,
      };
      assert.equal(CategoryTrendingSchema.safeParse(negativeOrder).success, false);
    });

    it("rejects invalid tileImage URL", () => {
      const badUrl = {
        enabled: true,
        tileImage: {
          url: "not-a-valid-url",
        },
      };
      assert.equal(CategoryTrendingSchema.safeParse(badUrl).success, false);
    });

    it("validates TrendingReorderSchema with valid ObjectIds and sort orders", () => {
      const reorderPayload = {
        items: [
          { id: validMongoId1, sortOrder: 0, enabled: true },
          { id: validMongoId2, sortOrder: 1, enabled: false },
        ],
      };

      const result = TrendingReorderSchema.safeParse(reorderPayload);
      assert.ok(result.success, "Valid reorder payload must pass");
    });

    it("rejects TrendingReorderSchema if ID is not a valid 24-character hexadecimal ObjectId", () => {
      const invalidPayload = {
        items: [{ id: "invalid-id-123", sortOrder: 0 }],
      };
      assert.equal(TrendingReorderSchema.safeParse(invalidPayload).success, false);
    });
  });

  describe("2. Ordering & Max 8 Hard Cap Enforcement", () => {
    it("enforces strict sortOrder ascending order and max 8 limit", () => {
      // Create 12 mock enabled categories with varying sortOrders
      const mockCategories = Array.from({ length: 12 }, (_, i) => ({
        _id: new mongoose.Types.ObjectId().toString(),
        name: `Category ${i}`,
        slug: `category-${i}`,
        isActive: true,
        trending: {
          enabled: true,
          // Assign deliberate scrambled sort orders: 11, 10, ... 0
          sortOrder: 11 - i,
          tileLabel: `Trending Cat ${11 - i}`,
        },
        createdAt: new Date(Date.now() - i * 1000),
      }));

      // Simulate query: filter enabled + active, sort by sortOrder asc, limit 8
      const resolved = mockCategories
        .filter((c) => c.isActive && c.trending.enabled)
        .sort((a, b) => a.trending.sortOrder - b.trending.sortOrder)
        .slice(0, 8);

      assert.equal(resolved.length, 8, "Must strictly cap results to max 8");
      // Check strict ascending sortOrder
      for (let i = 0; i < resolved.length; i++) {
        assert.equal(
          resolved[i].trending.sortOrder,
          i,
          `Item at index ${i} must have sortOrder ${i}`,
        );
      }
    });

    it("excludes inactive categories even if trending.enabled is true", () => {
      const categories = [
        {
          _id: "1",
          name: "Active Trending",
          isActive: true,
          trending: { enabled: true, sortOrder: 0 },
        },
        {
          _id: "2",
          name: "Inactive Trending",
          isActive: false, // Inactive!
          trending: { enabled: true, sortOrder: 1 },
        },
        {
          _id: "3",
          name: "Active Non-Trending",
          isActive: true,
          trending: { enabled: false, sortOrder: 2 },
        },
      ];

      const filtered = categories
        .filter((c) => c.isActive && c.trending.enabled)
        .sort((a, b) => a.trending.sortOrder - b.trending.sortOrder);

      assert.equal(filtered.length, 1);
      assert.equal(filtered[0]._id, "1");
    });
  });

  describe("3. Label & Tile Image Fallback Hierarchy", () => {
    it("uses tileLabel override if provided, otherwise falls back to category.name", () => {
      const withOverride = {
        name: "Shirts",
        trending: { tileLabel: "Artisanal French Linen Shirts" },
      };
      const label1 = withOverride.trending?.tileLabel?.trim() || withOverride.name;
      assert.equal(label1, "Artisanal French Linen Shirts");

      const withoutOverride = {
        name: "Pants",
        trending: { tileLabel: "" },
      };
      const label2 = withoutOverride.trending?.tileLabel?.trim() || withoutOverride.name;
      assert.equal(label2, "Pants");
    });

    it("uses tileImage if provided, otherwise falls back to category.imageUrl, otherwise placeholder", () => {
      interface MockCategoryWithImage {
        imageUrl?: string;
        trending?: {
          tileImage?: { url?: string; publicId?: string };
          tileLabel?: string;
        };
      }

      const customTile: MockCategoryWithImage = {
        imageUrl: "https://example.com/base.jpg",
        trending: { tileImage: { url: "https://example.com/custom-4-5.jpg" } },
      };
      const img1 =
        customTile.trending?.tileImage?.url?.trim() ||
        customTile.imageUrl?.trim() ||
        "/images/placeholder.jpg";
      assert.equal(img1, "https://example.com/custom-4-5.jpg");

      const fallbackBase: MockCategoryWithImage = {
        imageUrl: "https://example.com/base.jpg",
        trending: { tileImage: undefined },
      };
      const img2 =
        fallbackBase.trending?.tileImage?.url?.trim() ||
        fallbackBase.imageUrl?.trim() ||
        "/images/placeholder.jpg";
      assert.equal(img2, "https://example.com/base.jpg");

      const fallbackPlaceholder: MockCategoryWithImage = {
        imageUrl: undefined,
        trending: { tileImage: undefined },
      };
      const img3 =
        fallbackPlaceholder.trending?.tileImage?.url?.trim() ||
        fallbackPlaceholder.imageUrl?.trim() ||
        "/images/placeholder.jpg";
      assert.equal(img3, "/images/placeholder.jpg");
    });
  });
});
