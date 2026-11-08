import fs from "fs";
import path from "path";
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import {
  isValidStatusTransition,
  getAllowedNextStatuses,
  calculateGSTBreakdown,
  amountInWordsINR,
  updateOrderStatus,
} from "../lib/orders.ts";
import { UpdateOrderStatusSchema } from "../lib/validations/order.ts";
import { Order, type OrderStatus } from "../models/Order.ts";
import { Variant } from "../models/Variant.ts";
import { InventoryMovement } from "../models/InventoryMovement.ts";
import { Customer } from "../models/Customer.ts";
import { Product } from "../models/Product.ts";
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

describe("Order Management, State Transitions & GST Invoicing", () => {
  describe("Order Status State Machine Transitions", () => {
    it("allows valid transitions through lifecycle", () => {
      assert.ok(isValidStatusTransition("PENDING", "PAID"));
      assert.ok(isValidStatusTransition("PENDING", "CANCELLED"));
      assert.ok(isValidStatusTransition("PAID", "PACKED"));
      assert.ok(isValidStatusTransition("PAID", "CANCELLED"));
      assert.ok(isValidStatusTransition("PACKED", "SHIPPED"));
      assert.ok(isValidStatusTransition("SHIPPED", "DELIVERED"));
      assert.ok(isValidStatusTransition("SHIPPED", "RETURNED"));
      assert.ok(isValidStatusTransition("DELIVERED", "RETURNED"));
    });

    it("rejects invalid or illegal backward transitions", () => {
      assert.equal(isValidStatusTransition("PENDING", "DELIVERED"), false);
      assert.equal(isValidStatusTransition("DELIVERED", "PAID"), false);
      assert.equal(isValidStatusTransition("CANCELLED", "PAID"), false);
      assert.equal(isValidStatusTransition("RETURNED", "DELIVERED"), false);
      assert.equal(isValidStatusTransition("PAID", "PAID"), false); // Self-transition
    });

    it("enforces CANCELLED and RETURNED as terminal states", () => {
      assert.deepEqual(getAllowedNextStatuses("CANCELLED"), []);
      assert.deepEqual(getAllowedNextStatuses("RETURNED"), []);
    });
  });

  describe("Zod Validation: UpdateOrderStatusSchema", () => {
    it("accepts valid status payload", () => {
      const parsed = UpdateOrderStatusSchema.safeParse({
        status: "PACKED",
        note: "Dispatched to packing bay 3",
      });
      assert.ok(parsed.success);
      if (parsed.success) {
        assert.equal(parsed.data.status, "PACKED");
      }
    });

    it("rejects arbitrary invalid status strings", () => {
      const parsed = UpdateOrderStatusSchema.safeParse({
        status: "SHIPPED_OUT_FOR_DELIVERY",
      });
      assert.ok(!parsed.success);
    });
  });

  describe("GST Calculations & Invoicing Logic", () => {
    it("computes intra-state (Telangana) tax with CGST and SGST equal split", () => {
      const breakdown = calculateGSTBreakdown("Telangana", 10000, 200000);
      assert.equal(breakdown.isInterState, false);
      assert.equal(breakdown.cgstPaise, 5000);
      assert.equal(breakdown.sgstPaise, 5000);
      assert.equal(breakdown.igstPaise, 0);
      assert.equal(breakdown.cgstRate, 2.5);
      assert.equal(breakdown.sgstRate, 2.5);
    });

    it("computes inter-state (Outside Telangana) tax with full IGST", () => {
      const breakdown = calculateGSTBreakdown("Maharashtra", 10000, 200000);
      assert.equal(breakdown.isInterState, true);
      assert.equal(breakdown.cgstPaise, 0);
      assert.equal(breakdown.sgstPaise, 0);
      assert.equal(breakdown.igstPaise, 10000);
      assert.equal(breakdown.igstRate, 5.0);
    });

    it("converts numerical amounts to Indian Rupee word representations", () => {
      assert.equal(
        amountInWordsINR(2499),
        "Two Thousand Four Hundred Ninety Nine Rupees Only",
      );
      assert.equal(amountInWordsINR(0), "Zero Rupees Only");
    });
  });

  describe("Transactional Cancellation & Return Restocking (MongoDB Atlas)", () => {
    let testProductId: mongoose.Types.ObjectId;
    let testVariantId: mongoose.Types.ObjectId;
    let testCustomerId: mongoose.Types.ObjectId;
    let testOrderId: mongoose.Types.ObjectId;
    let dbConnected = false;

    before(async () => {
      loadEnv();
      const uri = process.env.MONGODB_URI;
      if (!uri) {
        console.warn("⚠️ MONGODB_URI not set. Skipping live DB order restock test.");
        return;
      }

      try {
        if (mongoose.connection.readyState === 0) {
          await mongoose.connect(uri);
        }
        dbConnected = true;

        const brand = await Brand.create({
          name: "Order Test Brand",
          slug: `order-test-brand-${Date.now()}`,
        });
        const category = await Category.create({
          name: "Order Test Category",
          slug: `order-test-category-${Date.now()}`,
          gender: "MEN",
        });

        const product = await Product.create({
          name: "Order Test Silk Shirt",
          slug: `order-test-shirt-${Date.now()}`,
          brandId: brand._id,
          categoryId: category._id,
          gender: "MEN",
          type: "SIMPLE",
          basePricePaise: 499900,
          status: "ACTIVE",
          images: ["https://res.cloudinary.com/malli-co/image/upload/v1/test.jpg"],
        });
        testProductId = product._id as mongoose.Types.ObjectId;

        // Create Variant with 5 units
        const variant = await Variant.create({
          productId: testProductId,
          sku: `MC-ORD-${Date.now()}`,
          pricePaise: 499900,
          stock: 5,
          lowStockThreshold: 2,
          options: new Map([["Size", "M"]]),
          isDefault: true,
          status: "ACTIVE",
        });
        testVariantId = variant._id as mongoose.Types.ObjectId;

        const customer = await Customer.create({
          name: "Kavitha Reddy",
          email: `kavitha-${Date.now()}@example.com`,
          phone: "+91 9988776655",
          role: "CUSTOMER",
          addresses: [
            {
              name: "Kavitha Reddy",
              phone: "+91 9988776655",
              street: "Banjara Hills, Road 12",
              city: "Hyderabad",
              state: "Telangana",
              postalCode: "500034",
              country: "IN",
            },
          ],
        });
        testCustomerId = customer._id as mongoose.Types.ObjectId;

        // Create Order for 2 units
        const order = await Order.create({
          orderNumber: `ORD-TEST-${Date.now()}`,
          customerId: testCustomerId,
          items: [
            {
              variantId: testVariantId,
              productId: testProductId,
              nameSnapshot: "Order Test Silk Shirt",
              skuSnapshot: variant.sku,
              priceSnapshotPaise: 499900,
              qty: 2,
            },
          ],
          status: "PAID",
          paymentStatus: "PAID",
          totals: {
            subtotalPaise: 999800,
            discountPaise: 0,
            shippingPaise: 0,
            taxPaise: 49990,
            totalPaise: 1049790,
          },
          shippingAddress: {
            name: "Kavitha Reddy",
            phone: "+91 9988776655",
            street: "Banjara Hills, Road 12",
            city: "Hyderabad",
            state: "Telangana",
            postalCode: "500034",
            country: "IN",
          },
          timeline: [
            {
              status: "PAID",
              note: "Payment captured",
              performedBy: "Razorpay Webhook",
              timestamp: new Date(),
            },
          ],
        });
        testOrderId = order._id as mongoose.Types.ObjectId;
      } catch (err) {
        console.warn("MongoDB setup failed for order tests:", err);
      }
    });

    after(async () => {
      if (!dbConnected) return;
      try {
        if (testOrderId) await Order.deleteOne({ _id: testOrderId });
        if (testVariantId) {
          await Variant.deleteOne({ _id: testVariantId });
          await InventoryMovement.deleteMany({ variantId: testVariantId });
        }
        if (testProductId) await Product.deleteOne({ _id: testProductId });
        if (testCustomerId) await Customer.deleteOne({ _id: testCustomerId });
        await mongoose.disconnect();
      } catch (cleanupErr) {
        console.warn("Cleanup error in order test:", cleanupErr);
      }
    });

    it("cancels an order, restocks inventory atomically, and writes InventoryMovement", async (t) => {
      if (!dbConnected) {
        t.skip("Live database not connected");
        return;
      }

      // Initial stock of variant was 5
      const res = await updateOrderStatus({
        orderId: testOrderId,
        newStatus: "CANCELLED",
        note: "Customer cancelled prior to dispatch",
        performedBy: "Admin Naveen",
      });

      assert.equal(res.restocked, true);
      assert.equal(res.restockedCount, 2);
      assert.equal(res.order.status, "CANCELLED");
      assert.equal(res.order.paymentStatus, "REFUNDED");

      // Verify stock increased by 2 (from 5 to 7)
      const updatedVariant = await Variant.findById(testVariantId);
      assert.equal(updatedVariant?.stock, 7);

      // Verify InventoryMovement document
      const movement = await InventoryMovement.findOne({
        orderId: testOrderId,
        reason: "RESTOCK",
      });
      assert.ok(movement);
      assert.equal(movement.change, 2);
      assert.equal(movement.previousStock, 5);
      assert.equal(movement.newStock, 7);

      // Verify timeline
      const order = await Order.findById(testOrderId);
      const lastTimeline = order?.timeline[order.timeline.length - 1];
      assert.equal(lastTimeline?.status, "CANCELLED");
      assert.equal(lastTimeline?.performedBy, "Admin Naveen");
    });

    it("rejects further transitions once CANCELLED (prevents double restock)", async (t) => {
      if (!dbConnected) {
        t.skip("Live database not connected");
        return;
      }

      await assert.rejects(
        async () => {
          await updateOrderStatus({
            orderId: testOrderId,
            newStatus: "PACKED",
          });
        },
        /Invalid status transition/,
      );

      // Verify stock remains untouched at 7
      const variant = await Variant.findById(testVariantId);
      assert.equal(variant?.stock, 7);
    });
  });
});

