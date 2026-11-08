import crypto from "crypto";
import fs from "fs";
import path from "path";
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { NextRequest } from "next/server.js";
import { POST } from "../app/api/webhooks/razorpay/route.ts";
import {
  Product,
  Variant,
  Order,
  WebhookEvent,
  InventoryMovement,
  Brand,
  Category,
  Customer,
} from "../models/index.ts";

function loadEnv() {
  if (process.env.MONGODB_URI && process.env.RAZORPAY_WEBHOOK_SECRET) return;

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

describe("Razorpay Webhook: Signature Verification, Idempotency & Transactional Settlement", () => {
  const webhookSecret = "test_webhook_secret_key_12345";
  let testCustomerId: mongoose.Types.ObjectId;
  let testBrandId: mongoose.Types.ObjectId;
  let testCategoryId: mongoose.Types.ObjectId;
  let testProductId: mongoose.Types.ObjectId;
  let testVariantId: mongoose.Types.ObjectId;
  let testOrderId: mongoose.Types.ObjectId;
  let testOrderNumber: string;
  const initialStock = 10;
  const purchaseQty = 2;

  before(async () => {
    loadEnv();
    process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;

    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.warn("⚠️ MONGODB_URI not set. Skipping live DB webhook tests.");
      return;
    }

    await mongoose.connect(uri);

    // Setup customer
    const customer = await Customer.create({
      name: "Webhook Test Customer",
      email: `webhook-customer-${Date.now()}@malliandco.com`,
      role: "CUSTOMER",
    });
    testCustomerId = customer._id as mongoose.Types.ObjectId;

    // Setup Brand & Category
    const brand = await Brand.create({
      name: "Webhook Test Brand",
      slug: `wh-brand-${Date.now()}`,
      isActive: true,
    });
    testBrandId = brand._id as mongoose.Types.ObjectId;

    const category = await Category.create({
      name: "Webhook Test Category",
      slug: `wh-cat-${Date.now()}`,
      gender: "MEN",
      isActive: true,
    });
    testCategoryId = category._id as mongoose.Types.ObjectId;

    // Setup Product & Variant
    const product = await Product.create({
      name: "Webhook Test Shirt",
      slug: `wh-shirt-${Date.now()}`,
      description: "Test shirt",
      brandId: testBrandId,
      categoryId: testCategoryId,
      gender: "MEN",
      type: "SIMPLE",
      basePricePaise: 299900,
      status: "ACTIVE",
    });
    testProductId = product._id as mongoose.Types.ObjectId;

    const variant = await Variant.create({
      productId: testProductId,
      sku: `WH-SHIRT-${Date.now()}`,
      pricePaise: 299900,
      stock: initialStock, // 10 units
      isDefault: true,
      status: "ACTIVE",
    });
    testVariantId = variant._id as mongoose.Types.ObjectId;

    // Setup Order
    testOrderNumber = `MC-WH-${Date.now()}`;
    const order = await Order.create({
      orderNumber: testOrderNumber,
      customerId: testCustomerId,
      items: [
        {
          variantId: testVariantId,
          productId: testProductId,
          nameSnapshot: "Webhook Test Shirt",
          skuSnapshot: variant.sku,
          priceSnapshotPaise: 299900,
          qty: purchaseQty, // 2 units
        },
      ],
      status: "PENDING",
      paymentStatus: "PENDING",
      paymentDetails: {
        razorpayOrderId: `order_wh_${Date.now()}`,
      },
      totals: {
        subtotalPaise: 599800,
        discountPaise: 0,
        shippingPaise: 0,
        taxPaise: 0,
        totalPaise: 599800,
      },
      shippingAddress: {
        name: "Test Recipient",
        phone: "+919876543210",
        street: "123 Fashion Ave",
        city: "Hyderabad",
        state: "Telangana",
        postalCode: "500081",
        country: "IN",
      },
    });
    testOrderId = order._id as mongoose.Types.ObjectId;
  });

  after(async () => {
    if (mongoose.connection.readyState !== 1) return;

    if (testVariantId) {
      await Variant.findByIdAndDelete(testVariantId);
      await InventoryMovement.deleteMany({ variantId: testVariantId });
    }
    if (testProductId) await Product.findByIdAndDelete(testProductId);
    if (testOrderId) await Order.findByIdAndDelete(testOrderId);
    if (testBrandId) await Brand.findByIdAndDelete(testBrandId);
    if (testCategoryId) await Category.findByIdAndDelete(testCategoryId);
    if (testCustomerId) await Customer.findByIdAndDelete(testCustomerId);

    await WebhookEvent.deleteMany({
      eventId: { $regex: /^test_evt_/ },
    });

    await mongoose.disconnect();
  });

  it("rejects webhook requests with an invalid signature (HTTP 400)", async () => {
    const rawPayload = JSON.stringify({ event: "order.paid", payload: {} });
    const req = new NextRequest("http://localhost:3000/api/webhooks/razorpay", {
      method: "POST",
      headers: {
        "x-razorpay-signature": "invalid_tampered_signature_hex",
        "content-type": "application/json",
      },
      body: rawPayload,
    });

    const res = await POST(req);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, "Invalid webhook signature");
  });

  it("atomically processes order.paid: records webhookevent, marks PAID, decrements stock", async (t) => {
    if (mongoose.connection.readyState !== 1) {
      t.skip("Live DB not connected");
      return;
    }

    const eventId = `test_evt_paid_${Date.now()}`;
    const orderDoc = await Order.findById(testOrderId);
    assert.ok(orderDoc);

    const payloadObj = {
      entity: "event",
      event: "order.paid",
      id: eventId,
      contains: ["payment", "order"],
      payload: {
        payment: {
          entity: {
            id: `pay_test_${Date.now()}`,
            order_id: orderDoc.paymentDetails?.razorpayOrderId,
            amount: 599800,
            currency: "INR",
            status: "captured",
          },
        },
        order: {
          entity: {
            id: orderDoc.paymentDetails?.razorpayOrderId,
            receipt: testOrderNumber,
            amount: 599800,
            amount_paid: 599800,
            status: "paid",
          },
        },
      },
      created_at: Math.floor(Date.now() / 1000),
    };

    const rawPayload = JSON.stringify(payloadObj);
    const validSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawPayload)
      .digest("hex");

    const req = new NextRequest("http://localhost:3000/api/webhooks/razorpay", {
      method: "POST",
      headers: {
        "x-razorpay-signature": validSignature,
        "x-razorpay-event-id": eventId,
        "content-type": "application/json",
      },
      body: rawPayload,
    });

    const res = await POST(req);
    assert.equal(res.status, 200);
    const resJson = await res.json();
    assert.equal(resJson.received, true);
    assert.equal(resJson.eventId, eventId);

    // 1. Verify WebhookEvent document was inserted in webhookevents collection
    const recordedEvent = await WebhookEvent.findOne({ eventId });
    assert.ok(recordedEvent, "WebhookEvent document must exist");
    assert.equal(recordedEvent.status, "PROCESSED");

    // 2. Verify Order was marked PAID and CONFIRMED
    const updatedOrder = await Order.findById(testOrderId);
    assert.ok(updatedOrder);
    assert.equal(updatedOrder.status, "CONFIRMED");
    assert.equal(updatedOrder.paymentStatus, "PAID");
    assert.ok(updatedOrder.paymentDetails?.razorpayPaymentId);

    // 3. Verify Variant stock was atomically decremented
    const updatedVariant = await Variant.findById(testVariantId);
    assert.ok(updatedVariant);
    assert.equal(
      updatedVariant.stock,
      initialStock - purchaseQty,
      `Stock must be decremented from ${initialStock} to ${initialStock - purchaseQty}`,
    );

    // 4. Verify inventorymovements audit document was inserted
    const movement = await InventoryMovement.findOne({
      variantId: testVariantId,
      orderId: testOrderId,
      reason: "SALE",
    });
    assert.ok(movement, "Audit movement must be recorded");
    assert.equal(movement.change, -purchaseQty);
    assert.equal(movement.previousStock, initialStock);
    assert.equal(movement.newStock, initialStock - purchaseQty);

    // 5. Test Idempotency: Re-sending identical webhook must return 200 without modifying stock
    console.log("Testing idempotency for duplicate webhook event delivery...");
    const duplicateReq = new NextRequest(
      "http://localhost:3000/api/webhooks/razorpay",
      {
        method: "POST",
        headers: {
          "x-razorpay-signature": validSignature,
          "x-razorpay-event-id": eventId,
          "content-type": "application/json",
        },
        body: rawPayload,
      },
    );

    const dupRes = await POST(duplicateReq);
    assert.equal(
      dupRes.status,
      200,
      "Must return HTTP 200 for duplicate event",
    );
    const dupJson = await dupRes.json();
    assert.equal(dupJson.status, "already_processed");

    // Verify stock did not decrement again
    const variantAfterDup = await Variant.findById(testVariantId);
    assert.equal(
      variantAfterDup?.stock,
      initialStock - purchaseQty,
      "Stock must not decrement again on duplicate delivery",
    );
  });

  it("handles payment.failed: marks order FAILED and CANCELLED without touching stock", async (t) => {
    if (mongoose.connection.readyState !== 1) {
      t.skip("Live DB not connected");
      return;
    }

    // Create an order for failure test
    const failOrderNumber = `MC-FAIL-${Date.now()}`;
    const failOrder = await Order.create({
      orderNumber: failOrderNumber,
      customerId: testCustomerId,
      items: [
        {
          variantId: testVariantId,
          productId: testProductId,
          nameSnapshot: "Fail Test Shirt",
          skuSnapshot: "WH-SHIRT-FAIL",
          priceSnapshotPaise: 299900,
          qty: 1,
        },
      ],
      status: "PENDING",
      paymentStatus: "PENDING",
      paymentDetails: {
        razorpayOrderId: `order_fail_${Date.now()}`,
      },
      totals: {
        subtotalPaise: 299900,
        discountPaise: 0,
        shippingPaise: 0,
        taxPaise: 0,
        totalPaise: 299900,
      },
      shippingAddress: {
        name: "Fail Recipient",
        phone: "+919876543210",
        street: "123 Street",
        city: "Hyderabad",
        state: "Telangana",
        postalCode: "500081",
        country: "IN",
      },
    });

    const stockBefore = (await Variant.findById(testVariantId))?.stock ?? 0;

    const eventId = `test_evt_fail_${Date.now()}`;
    const failPayload = {
      entity: "event",
      event: "payment.failed",
      id: eventId,
      payload: {
        payment: {
          entity: {
            id: `pay_fail_${Date.now()}`,
            order_id: failOrder.paymentDetails?.razorpayOrderId,
            amount: 299900,
            currency: "INR",
            status: "failed",
            error_description: "Payment failed due to card decline",
          },
        },
      },
      created_at: Math.floor(Date.now() / 1000),
    };

    const rawPayload = JSON.stringify(failPayload);
    const validSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawPayload)
      .digest("hex");

    const req = new NextRequest("http://localhost:3000/api/webhooks/razorpay", {
      method: "POST",
      headers: {
        "x-razorpay-signature": validSignature,
        "x-razorpay-event-id": eventId,
        "content-type": "application/json",
      },
      body: rawPayload,
    });

    const res = await POST(req);
    assert.equal(res.status, 200);

    // Verify order was marked FAILED and CANCELLED
    const checkedOrder = await Order.findById(failOrder._id);
    assert.ok(checkedOrder);
    assert.equal(checkedOrder.status, "CANCELLED");
    assert.equal(checkedOrder.paymentStatus, "FAILED");

    // Verify stock was untouched
    const stockAfter = (await Variant.findById(testVariantId))?.stock ?? 0;
    assert.equal(
      stockAfter,
      stockBefore,
      "Stock must remain unchanged on payment.failed",
    );

    // Clean up fail order
    await Order.findByIdAndDelete(failOrder._id);
  });
});
