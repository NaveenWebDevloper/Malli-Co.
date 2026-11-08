import fs from "fs";
import path from "path";
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import {
  AdjustStockSchema,
  UpdateThresholdSchema,
} from "../lib/validations/inventory.ts";
import { adjustStock, InsufficientStockError } from "../lib/inventory.ts";
import { Product } from "../models/Product.ts";
import { Variant } from "../models/Variant.ts";
import { InventoryMovement } from "../models/InventoryMovement.ts";
import { Brand } from "../models/Brand.ts";
import { Category } from "../models/Category.ts";

function loadEnv() {
  if (process.env.MONGODB_URI) return;

  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const [key, ...rest] = trimmed.split("=");
        if (key && rest.length > 0) {
          const val = rest.join("=").replace(/^["'](.*)["']$/, "$1");
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = val.trim();
          }
        }
      }
      break;
    }
  }
}

describe("Inventory Stock Adjustments & Validation (Rule 3)", () => {
  describe("Zod Validation: AdjustStockSchema", () => {
    it("validates valid restock request with positive integer", () => {
      const valid = AdjustStockSchema.safeParse({
        variantId: "64f123456789012345678901",
        change: 15,
        reason: "RESTOCK",
        note: "Supplier order delivered",
      });
      assert.ok(valid.success);
      if (valid.success) {
        assert.equal(valid.data.change, 15);
        assert.equal(valid.data.reason, "RESTOCK");
      }
    });

    it("validates valid deduction with negative integer and valid reason", () => {
      const valid = AdjustStockSchema.safeParse({
        variantId: "64f123456789012345678901",
        change: -3,
        reason: "ADJUST",
        note: "Damaged packaging in transit",
      });
      assert.ok(valid.success);
      if (valid.success) {
        assert.equal(valid.data.change, -3);
        assert.equal(valid.data.reason, "ADJUST");
      }
    });

    it("rejects zero stock change", () => {
      const invalid = AdjustStockSchema.safeParse({
        variantId: "64f123456789012345678901",
        change: 0,
        reason: "ADJUST",
      });
      assert.ok(!invalid.success);
    });

    it("rejects non-integer stock change", () => {
      const invalid = AdjustStockSchema.safeParse({
        variantId: "64f123456789012345678901",
        change: 2.5,
        reason: "RESTOCK",
      });
      assert.ok(!invalid.success);
    });

    it("rejects invalid or missing reason", () => {
      const invalid = AdjustStockSchema.safeParse({
        variantId: "64f123456789012345678901",
        change: 5,
        reason: "MY_CUSTOM_REASON",
      });
      assert.ok(!invalid.success);
    });

    it("rejects missing variantId", () => {
      const invalid = AdjustStockSchema.safeParse({
        change: 5,
        reason: "RESTOCK",
      });
      assert.ok(!invalid.success);
    });
  });

  describe("Zod Validation: UpdateThresholdSchema", () => {
    it("validates low-stock threshold of 0 or greater", () => {
      const valid = UpdateThresholdSchema.safeParse({
        variantId: "64f123456789012345678901",
        lowStockThreshold: 10,
      });
      assert.ok(valid.success);
    });

    it("rejects negative low-stock threshold", () => {
      const invalid = UpdateThresholdSchema.safeParse({
        variantId: "64f123456789012345678901",
        lowStockThreshold: -1,
      });
      assert.ok(!invalid.success);
    });
  });

  describe("Atomic Stock Adjustment & Audit Logging (MongoDB Atlas)", () => {
    let testProductId: mongoose.Types.ObjectId;
    let testVariantId: mongoose.Types.ObjectId;
    let testBrandId: mongoose.Types.ObjectId;
    let testCategoryId: mongoose.Types.ObjectId;
    let dbConnected = false;

    before(async () => {
      loadEnv();
      const uri = process.env.MONGODB_URI;
      if (!uri) {
        console.warn(
          "⚠️ MONGODB_URI not set. Skipping live DB atomic adjust test.",
        );
        return;
      }

      try {
        if (mongoose.connection.readyState === 0) {
          await mongoose.connect(uri);
        }
        dbConnected = true;

        // Create test Brand & Category
        const brand = await Brand.create({
          name: "Adjust Test Brand",
          slug: `adjust-test-brand-${Date.now()}`,
        });
        testBrandId = brand._id as mongoose.Types.ObjectId;

        const category = await Category.create({
          name: "Adjust Test Category",
          slug: `adjust-test-category-${Date.now()}`,
          gender: "MEN",
        });
        testCategoryId = category._id as mongoose.Types.ObjectId;

        // Create test Product
        const product = await Product.create({
          name: "Adjust Test Linen Shirt",
          slug: `adjust-test-shirt-${Date.now()}`,
          brandId: testBrandId,
          categoryId: testCategoryId,
          gender: "MEN",
          type: "SIMPLE",
          basePricePaise: 249900,
          status: "ACTIVE",
          images: ["https://res.cloudinary.com/malli-co/image/upload/v1/test.jpg"],
        });
        testProductId = product._id as mongoose.Types.ObjectId;

        // Create test Variant with 5 units initial stock
        const variant = await Variant.create({
          productId: testProductId,
          sku: `MC-ADJ-${Date.now()}`,
          pricePaise: 249900,
          stock: 5,
          lowStockThreshold: 3,
          options: new Map([["Size", "L"]]),
          isDefault: true,
          status: "ACTIVE",
        });
        testVariantId = variant._id as mongoose.Types.ObjectId;
      } catch (err) {
        console.warn(
          "⚠️ MongoDB connection failed during test setup. Skipping DB tests.",
          err,
        );
      }
    });

    after(async () => {
      if (!dbConnected) return;
      try {
        if (testVariantId) {
          await Variant.deleteOne({ _id: testVariantId });
          await InventoryMovement.deleteMany({ variantId: testVariantId });
        }
        if (testProductId) await Product.deleteOne({ _id: testProductId });
        if (testBrandId) await Brand.deleteOne({ _id: testBrandId });
        if (testCategoryId) await Category.deleteOne({ _id: testCategoryId });
        await mongoose.disconnect();
      } catch (cleanupErr) {
        console.warn("Cleanup error in adjust test:", cleanupErr);
      }
    });

    it("atomically adds stock (RESTOCK) and logs movement inside transaction", async (t) => {
      if (!dbConnected) {
        t.skip("Database not connected");
        return;
      }

      const res = await adjustStock({
        variantId: testVariantId,
        change: 10,
        reason: "RESTOCK",
        note: "Received 10 units from supplier",
      });

      assert.equal(res.previousStock, 5);
      assert.equal(res.newStock, 15);
      assert.equal(res.variant.stock, 15);

      // Verify InventoryMovement document
      const movement = await InventoryMovement.findOne({
        variantId: testVariantId,
        reason: "RESTOCK",
      }).sort({ createdAt: -1 });

      assert.ok(movement);
      assert.equal(movement.change, 10);
      assert.equal(movement.previousStock, 5);
      assert.equal(movement.newStock, 15);
      assert.equal(movement.reason, "RESTOCK");
      assert.equal(movement.note, "Received 10 units from supplier");
    });

    it("atomically reduces stock (ADJUST) with $gte guard", async (t) => {
      if (!dbConnected) {
        t.skip("Database not connected");
        return;
      }

      const res = await adjustStock({
        variantId: testVariantId,
        change: -4,
        reason: "ADJUST",
        note: "Removed 4 damaged pieces",
      });

      assert.equal(res.previousStock, 15);
      assert.equal(res.newStock, 11);
      assert.equal(res.variant.stock, 11);

      // Verify movement
      const movement = await InventoryMovement.findOne({
        variantId: testVariantId,
        reason: "ADJUST",
      }).sort({ createdAt: -1 });

      assert.ok(movement);
      assert.equal(movement.change, -4);
      assert.equal(movement.previousStock, 15);
      assert.equal(movement.newStock, 11);
    });

    it("prevents stock from going negative and raises InsufficientStockError", async (t) => {
      if (!dbConnected) {
        t.skip("Database not connected");
        return;
      }

      // Stock is currently 11, attempt to deduct 15
      await assert.rejects(
        async () => {
          await adjustStock({
            variantId: testVariantId,
            change: -15,
            reason: "ADJUST",
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof InsufficientStockError);
          assert.equal((err as InsufficientStockError).requested, 15);
          assert.equal((err as InsufficientStockError).available, 11);
          return true;
        },
      );

      // Verify stock remained unchanged at 11
      const variant = await Variant.findById(testVariantId);
      assert.equal(variant?.stock, 11);
    });
  });
});

