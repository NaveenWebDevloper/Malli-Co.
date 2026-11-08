import fs from "fs";
import path from "path";
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import {
  Product,
  Variant,
  InventoryMovement,
  Brand,
  Category,
} from "../models/index.ts";
import { deductStock, InsufficientStockError } from "../lib/inventory.ts";

// Load environment variables from .env.local or .env
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

describe("Atomic Stock Deductions & Concurrency Protection", () => {
  let testProductId: mongoose.Types.ObjectId;
  let testVariantId: mongoose.Types.ObjectId;
  let testBrandId: mongoose.Types.ObjectId;
  let testCategoryId: mongoose.Types.ObjectId;
  const initialStock = 3;
  const concurrentBuyers = 10;

  before(async () => {
    loadEnv();
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      console.warn(
        "⚠️ MONGODB_URI is not set. Skipping live DB concurrency test.",
      );
      return;
    }

    await mongoose.connect(uri);

    // Create a temporary brand and category
    const brand = await Brand.create({
      name: "Concurrency Test Brand",
      slug: `concurrency-brand-${Date.now()}`,
      isActive: true,
    });
    testBrandId = brand._id as mongoose.Types.ObjectId;

    const category = await Category.create({
      name: "Concurrency Test Category",
      slug: `concurrency-category-${Date.now()}`,
      gender: "MEN",
      isActive: true,
    });
    testCategoryId = category._id as mongoose.Types.ObjectId;

    // Create test product
    const product = await Product.create({
      name: "Limited Edition Jacket",
      slug: `limited-edition-jacket-${Date.now()}`,
      description: "Only 3 units available in stock.",
      brandId: testBrandId,
      categoryId: testCategoryId,
      gender: "MEN",
      type: "SIMPLE",
      basePricePaise: 499900,
      status: "ACTIVE",
      images: ["/images/test-jacket.jpg"],
    });
    testProductId = product._id as mongoose.Types.ObjectId;

    // Create test variant with exactly 3 units
    const variant = await Variant.create({
      productId: testProductId,
      sku: `LE-JKT-LST3-${Date.now()}`,
      pricePaise: 499900,
      stock: initialStock, // Starting stock = 3
      isDefault: true,
      status: "ACTIVE",
    });
    testVariantId = variant._id as mongoose.Types.ObjectId;
  });

  after(async () => {
    if (mongoose.connection.readyState !== 1) return;

    // Clean up created test entities
    if (testVariantId) {
      await Variant.findByIdAndDelete(testVariantId);
      await InventoryMovement.deleteMany({ variantId: testVariantId });
    }
    if (testProductId) {
      await Product.findByIdAndDelete(testProductId);
    }
    if (testBrandId) {
      await Brand.findByIdAndDelete(testBrandId);
    }
    if (testCategoryId) {
      await Category.findByIdAndDelete(testCategoryId);
    }

    await mongoose.disconnect();
  });

  it("proves that 10 concurrent purchases of 3 units never causes negative stock", async (t) => {
    if (mongoose.connection.readyState !== 1) {
      t.skip(
        "Database not connected. Provide MONGODB_URI to run live concurrency test.",
      );
      return;
    }

    // Verify initial state
    const initialVariant = await Variant.findById(testVariantId);
    assert.ok(initialVariant);
    assert.equal(
      initialVariant.stock,
      initialStock,
      "Initial stock must be exactly 3",
    );

    console.log(
      `\n🚀 Launching ${concurrentBuyers} concurrent purchase requests for last ${initialStock} units...`,
    );

    // Fire 10 concurrent purchases simultaneously
    const purchasePromises = Array.from(
      { length: concurrentBuyers },
      (_, index) => {
        const orderId = new mongoose.Types.ObjectId();
        return deductStock({
          variantId: testVariantId,
          quantity: 1, // each buyer wants 1 unit
          orderId,
          reason: "SALE",
          note: `Concurrent buyer #${index + 1}`,
        }).then(
          (res) => ({
            status: "fulfilled" as const,
            index: index + 1,
            data: res,
          }),
          (err) => ({
            status: "rejected" as const,
            index: index + 1,
            error: err,
          }),
        );
      },
    );

    const results = await Promise.all(purchasePromises);

    const successfulPurchases = results.filter((r) => r.status === "fulfilled");
    const failedPurchases = results.filter((r) => r.status === "rejected");

    console.log(`✅ Successful purchases: ${successfulPurchases.length}`);
    console.log(`❌ Rejected purchases:   ${failedPurchases.length}`);

    // 1. Exactly 3 purchases must succeed
    assert.equal(
      successfulPurchases.length,
      initialStock,
      `Exactly ${initialStock} purchases must succeed`,
    );

    // 2. Exactly 7 purchases must fail
    assert.equal(
      failedPurchases.length,
      concurrentBuyers - initialStock,
      `Exactly ${concurrentBuyers - initialStock} purchases must fail due to insufficient stock`,
    );

    // 3. All failed purchases must be InsufficientStockError
    for (const failed of failedPurchases) {
      assert.ok(
        failed.error instanceof InsufficientStockError ||
          failed.error.name === "InsufficientStockError" ||
          failed.error.message.includes("Insufficient stock"),
        `Failed attempt #${failed.index} must fail with InsufficientStockError`,
      );
    }

    // 4. Query the fresh variant document from the database
    const finalVariant = await Variant.findById(testVariantId);
    assert.ok(finalVariant);

    console.log(`📦 Final variant stock in database: ${finalVariant.stock}`);

    // 5. Stock must be EXACTLY 0 and MUST NEVER BE NEGATIVE
    assert.equal(finalVariant.stock, 0, "Final stock must be exactly 0");
    assert.ok(
      finalVariant.stock >= 0,
      "Stock must NEVER be negative under high concurrency!",
    );

    // 6. Audit Logging in inventorymovements: exactly 3 movements must exist
    const movements = await InventoryMovement.find({
      variantId: testVariantId,
    }).sort({
      createdAt: 1,
    });

    console.log(`📋 Total logged inventory movements: ${movements.length}`);
    assert.equal(
      movements.length,
      initialStock,
      `Exactly ${initialStock} inventory movements must be recorded in inventorymovements`,
    );

    // 7. Verify audit trail integrity for each movement
    for (const mov of movements) {
      assert.equal(mov.change, -1, "Each sale movement delta must be -1");
      assert.equal(mov.reason, "SALE", "Movement reason must be SALE");
      assert.equal(
        mov.previousStock + mov.change,
        mov.newStock,
        "previousStock + change must strictly equal newStock",
      );
    }

    // Check the final movement's newStock is 0
    const lastMovement = movements[movements.length - 1];
    assert.equal(lastMovement.newStock, 0, "Last movement newStock must be 0");

    // 8. Prove that any subsequent purchase attempt also fails cleanly
    console.log("🔒 Attempting an 11th purchase on empty stock (0 units)...");
    await assert.rejects(
      async () => {
        await deductStock({
          variantId: testVariantId,
          quantity: 1,
          reason: "SALE",
        });
      },
      InsufficientStockError,
      "Purchase when stock is 0 must reject with InsufficientStockError",
    );

    // Re-verify stock remains 0
    const postCheckVariant = await Variant.findById(testVariantId);
    assert.equal(postCheckVariant?.stock, 0, "Stock must remain 0");

    console.log("🎉 Concurrency test passed with 100% integrity!");
  });
});
