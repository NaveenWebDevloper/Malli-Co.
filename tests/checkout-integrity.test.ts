import crypto from "crypto";
import fs from "fs";
import path from "path";
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import {
  Product,
  Variant,
  Order,
  InventoryMovement,
  Brand,
  Category,
} from "../models/index.ts";
import { connectDB } from "../lib/db.ts";

function loadEnv() {
  if (process.env.MONGODB_URI && process.env.RAZORPAY_KEY_SECRET) return;

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

loadEnv();

describe("Checkout & Payment Integrity Verification (End-to-End)", () => {
  const BASE_URL = "http://localhost:3000";
  let testBrandId: mongoose.Types.ObjectId;
  let testCategoryId: mongoose.Types.ObjectId;
  const createdVariantIds: mongoose.Types.ObjectId[] = [];
  const createdOrderIds: mongoose.Types.ObjectId[] = [];
  const createdProductIds: mongoose.Types.ObjectId[] = [];

  const razorpayKeySecret =
    process.env.RAZORPAY_KEY_SECRET || "test_rzp_secret_key_123456";
  const razorpayWebhookSecret =
    process.env.RAZORPAY_WEBHOOK_SECRET || "test_rzp_webhook_secret_123456";

  before(async () => {
    loadEnv();
    await connectDB();

    const brand = await Brand.create({
      name: "Integrity Brand",
      slug: `integrity-brand-${Date.now()}`,
      isActive: true,
    });
    testBrandId = brand._id as mongoose.Types.ObjectId;

    const category = await Category.create({
      name: "Integrity Category",
      slug: `integrity-category-${Date.now()}`,
      gender: "MEN",
      isActive: true,
    });
    testCategoryId = category._id as mongoose.Types.ObjectId;
  });

  after(async () => {
    if (mongoose.connection.readyState === 1) {
      if (createdVariantIds.length > 0) {
        await Variant.deleteMany({ _id: { $in: createdVariantIds } });
        await InventoryMovement.deleteMany({
          variantId: { $in: createdVariantIds },
        });
      }
      if (createdOrderIds.length > 0) {
        await Order.deleteMany({ _id: { $in: createdOrderIds } });
      }
      if (createdProductIds.length > 0) {
        await Product.deleteMany({ _id: { $in: createdProductIds } });
      }
      if (testBrandId) await Brand.deleteOne({ _id: testBrandId });
      if (testCategoryId) await Category.deleteOne({ _id: testCategoryId });
      await mongoose.disconnect();
    }
  });

  async function createTestProductAndVariant(params: {
    pricePaise: number;
    stock: number;
    reservedStock?: number;
    sku?: string;
  }) {
    const product = await Product.create({
      name: `Integrity Product ${Date.now()}`,
      slug: `integrity-prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      description: "Test product for checkout integrity",
      brandId: testBrandId,
      categoryId: testCategoryId,
      gender: "MEN",
      type: "SIMPLE",
      basePricePaise: params.pricePaise,
      status: "ACTIVE",
      images: ["/test.jpg"],
    });
    createdProductIds.push(product._id as mongoose.Types.ObjectId);

    const variant = await Variant.create({
      productId: product._id,
      sku: params.sku || `INTG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      pricePaise: params.pricePaise,
      stock: params.stock,
      reservedStock: params.reservedStock || 0,
      isDefault: true,
      status: "ACTIVE",
    });
    createdVariantIds.push(variant._id as mongoose.Types.ObjectId);

    return { product, variant };
  }

  it("1. Price tampering in checkout payload is ignored and server DB prices are enforced", async () => {
    const canonicalPricePaise = 299900; // ₹2,999.00
    const { variant } = await createTestProductAndVariant({
      pricePaise: canonicalPricePaise,
      stock: 5,
    });

    // Malicious payload attempting to set price to ₹1.00 (100 paise)
    const tamperedPayload = {
      items: [
        {
          variantId: variant._id.toString(),
          quantity: 1,
          pricePaise: 100, // Attacker tries to pay ₹1!
        },
      ],
      shippingAddress: {
        name: "Security Tester",
        email: "security@test.com",
        phone: "9876543210",
        street: "123 Defense Way",
        city: "Hyderabad",
        state: "Telangana",
        postalCode: "500001",
        country: "India",
      },
    };

    const res = await fetch(`${BASE_URL}/api/checkout/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tamperedPayload),
    });

    assert.equal(res.status, 200, "create-order should succeed");
    const data = await res.json();
    assert.ok(data.success);
    assert.ok(data.orderNumber);

    const createdOrder = await Order.findOne({ orderNumber: data.orderNumber });
    assert.ok(createdOrder);
    createdOrderIds.push(createdOrder._id as mongoose.Types.ObjectId);

    // Rule 1 Verification: Server MUST ignore client price and charge canonical DB price
    assert.equal(
      createdOrder.totals.subtotalPaise,
      canonicalPricePaise,
      "Subtotal must match canonical DB price, ignoring client tampered price",
    );
    assert.equal(
      data.amountPaise,
      createdOrder.totals.totalPaise,
      "Razorpay order amount must match server canonical total",
    );

    // Status verification: Order must start in PENDING state
    assert.equal(createdOrder.status, "PENDING");
    assert.equal(createdOrder.paymentStatus, "PENDING");
    assert.ok(createdOrder.expiresAt, "Hold expiration must be set");

    // Stock verification: Physical stock untouched, reservedStock incremented
    const updatedVariant = await Variant.findById(variant._id);
    assert.equal(updatedVariant?.stock, 5, "Physical stock must NOT be decremented yet");
    assert.equal(updatedVariant?.reservedStock, 1, "Reserved stock must be held");
  });

  it("2. Rejects invalid Razorpay signature (HTTP 400) and preserves PENDING status without touching stock", async () => {
    const { variant } = await createTestProductAndVariant({
      pricePaise: 149900,
      stock: 4,
      reservedStock: 1,
    });

    const order = await Order.create({
      orderNumber: `MC-TEST-BADSIG-${Date.now()}`,
      customerId: new mongoose.Types.ObjectId(),
      items: [
        {
          variantId: variant._id,
          productId: variant.productId,
          skuSnapshot: variant.sku,
          nameSnapshot: "Test Signature Product",
          priceSnapshotPaise: 149900,
          qty: 1,
        },
      ],
      status: "PENDING",
      paymentStatus: "PENDING",
      paymentDetails: {
        razorpayOrderId: `order_fake_${Date.now()}`,
      },
      totals: {
        subtotalPaise: 149900,
        shippingPaise: 0,
        taxPaise: 0,
        discountPaise: 0,
        totalPaise: 149900,
      },
      shippingAddress: {
        name: "Test",
        email: "test@test.com",
        phone: "9876543210",
        street: "123 St",
        city: "City",
        state: "State",
        postalCode: "500001",
        country: "India",
      },
      timeline: [],
    });
    createdOrderIds.push(order._id as mongoose.Types.ObjectId);

    const verifyRes = await fetch(`${BASE_URL}/api/checkout/verify-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        razorpay_order_id: order.paymentDetails?.razorpayOrderId,
        razorpay_payment_id: "pay_fake_123456",
        razorpay_signature: "tampered_and_invalid_signature_hex_value",
        orderNumber: order.orderNumber,
      }),
    });

    assert.equal(verifyRes.status, 400, "Invalid signature must return HTTP 400");

    // Verify order and stock are untouched
    const freshOrder = await Order.findById(order._id);
    assert.equal(freshOrder?.status, "PENDING");
    assert.equal(freshOrder?.paymentStatus, "PENDING");

    const freshVariant = await Variant.findById(variant._id);
    assert.equal(freshVariant?.stock, 4, "Stock must remain 4");
    assert.equal(freshVariant?.reservedStock, 1, "Reserved stock must remain 1");
  });

  it("3. Valid signature atomically marks PAID, decrements stock, releases hold, and logs InventoryMovement", async () => {
    const { variant } = await createTestProductAndVariant({
      pricePaise: 199900,
      stock: 10,
      reservedStock: 2,
    });

    const razorpayOrderId = `order_valid_${Date.now()}`;
    const razorpayPaymentId = `pay_valid_${Date.now()}`;

    const order = await Order.create({
      orderNumber: `MC-TEST-VALIDSIG-${Date.now()}`,
      customerId: new mongoose.Types.ObjectId(),
      items: [
        {
          variantId: variant._id,
          productId: variant.productId,
          skuSnapshot: variant.sku,
          nameSnapshot: "Valid Signature Product",
          priceSnapshotPaise: 199900,
          qty: 2,
        },
      ],
      status: "PENDING",
      paymentStatus: "PENDING",
      paymentDetails: {
        razorpayOrderId,
      },
      totals: {
        subtotalPaise: 399800,
        shippingPaise: 0,
        taxPaise: 0,
        discountPaise: 0,
        totalPaise: 399800,
      },
      shippingAddress: {
        name: "Test Buyer",
        email: "buyer@test.com",
        phone: "9876543210",
        street: "123 St",
        city: "City",
        state: "State",
        postalCode: "500001",
        country: "India",
      },
      timeline: [],
    });
    createdOrderIds.push(order._id as mongoose.Types.ObjectId);

    // Generate valid HMAC-SHA256 signature
    const validSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    const res = await fetch(`${BASE_URL}/api/checkout/verify-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: validSignature,
        orderNumber: order.orderNumber,
      }),
    });

    assert.equal(res.status, 200, "Valid signature verification must succeed");
    const json = await res.json();
    assert.ok(json.success);
    assert.equal(json.orderStatus, "PAID");

    // Check order status in DB
    const freshOrder = await Order.findById(order._id);
    assert.equal(freshOrder?.status, "PAID");
    assert.equal(freshOrder?.paymentStatus, "PAID");
    assert.equal(freshOrder?.expiresAt, undefined, "Expiration hold cleared");

    // Check variant stock atomically decremented: 10 - 2 = 8, reserved: 2 - 2 = 0
    const freshVariant = await Variant.findById(variant._id);
    assert.equal(freshVariant?.stock, 8, "Stock must decrement from 10 to 8");
    assert.equal(freshVariant?.reservedStock, 0, "Reserved stock must decrement from 2 to 0");

    // Check InventoryMovement audit record (Rule 3)
    const movements = await InventoryMovement.find({
      orderId: order._id,
      variantId: variant._id,
    });
    assert.equal(movements.length, 1, "Exactly one inventory movement must be recorded");
    assert.equal(movements[0].change, -2);
    assert.equal(movements[0].reason, "SALE");
    assert.equal(movements[0].previousStock, 10);
    assert.equal(movements[0].newStock, 8);
  });

  it("4. Idempotency: Duplicate payment verification or webhook is processed once without double-decrementing stock", async () => {
    const { variant } = await createTestProductAndVariant({
      pricePaise: 129900,
      stock: 5,
      reservedStock: 1,
    });

    const razorpayOrderId = `order_dup_${Date.now()}`;
    const razorpayPaymentId = `pay_dup_${Date.now()}`;

    const order = await Order.create({
      orderNumber: `MC-TEST-DUP-${Date.now()}`,
      customerId: new mongoose.Types.ObjectId(),
      items: [
        {
          variantId: variant._id,
          productId: variant.productId,
          skuSnapshot: variant.sku,
          nameSnapshot: "Idempotent Product",
          priceSnapshotPaise: 129900,
          qty: 1,
        },
      ],
      status: "PENDING",
      paymentStatus: "PENDING",
      paymentDetails: { razorpayOrderId },
      totals: {
        subtotalPaise: 129900,
        shippingPaise: 0,
        taxPaise: 0,
        discountPaise: 0,
        totalPaise: 129900,
      },
      shippingAddress: {
        name: "Test",
        email: "test@test.com",
        phone: "9876543210",
        street: "123 St",
        city: "City",
        state: "State",
        postalCode: "500001",
        country: "India",
      },
      timeline: [],
    });
    createdOrderIds.push(order._id as mongoose.Types.ObjectId);

    const validSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    const payload = {
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: validSignature,
      orderNumber: order.orderNumber,
    };

    // First call: Successful confirmation
    const firstRes = await fetch(`${BASE_URL}/api/checkout/verify-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    assert.equal(firstRes.status, 200);

    // Second call: Duplicate verification request
    const secondRes = await fetch(`${BASE_URL}/api/checkout/verify-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    assert.equal(secondRes.status, 200, "Duplicate call must return HTTP 200");
    const secondData = await secondRes.json();
    assert.ok(secondData.alreadyPaid, "Should indicate already paid");

    // Stock must remain 4 (NOT 3)
    const freshVariant = await Variant.findById(variant._id);
    assert.equal(freshVariant?.stock, 4, "Stock must be 4, not double-decremented");
    assert.equal(freshVariant?.reservedStock, 0);

    // Exactly one InventoryMovement record
    const movements = await InventoryMovement.find({ orderId: order._id });
    assert.equal(movements.length, 1, "Must not create duplicate inventory movements");
  });

  it("5. Payment failure marks order CANCELLED and releases reservation hold without touching stock", async () => {
    const { variant } = await createTestProductAndVariant({
      pricePaise: 159900,
      stock: 6,
      reservedStock: 1,
    });

    const razorpayOrderId = `order_fail_${Date.now()}`;

    const order = await Order.create({
      orderNumber: `MC-TEST-FAIL-${Date.now()}`,
      customerId: new mongoose.Types.ObjectId(),
      items: [
        {
          variantId: variant._id,
          productId: variant.productId,
          skuSnapshot: variant.sku,
          nameSnapshot: "Failed Order Product",
          priceSnapshotPaise: 159900,
          qty: 1,
        },
      ],
      status: "PENDING",
      paymentStatus: "PENDING",
      paymentDetails: { razorpayOrderId },
      totals: {
        subtotalPaise: 159900,
        shippingPaise: 0,
        taxPaise: 0,
        discountPaise: 0,
        totalPaise: 159900,
      },
      shippingAddress: {
        name: "Test",
        email: "test@test.com",
        phone: "9876543210",
        street: "123 St",
        city: "City",
        state: "State",
        postalCode: "500001",
        country: "India",
      },
      timeline: [],
    });
    createdOrderIds.push(order._id as mongoose.Types.ObjectId);

    // Webhook event for payment.failed
    const eventBody = JSON.stringify({
      entity: "event",
      event: "payment.failed",
      contains: ["payment"],
      payload: {
        payment: {
          entity: {
            id: `pay_failed_${Date.now()}`,
            order_id: razorpayOrderId,
            amount: 159900,
            status: "failed",
            error_description: "Payment failed at issuing bank",
          },
        },
      },
      created_at: Math.floor(Date.now() / 1000),
    });

    const signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(eventBody)
      .digest("hex");

    const webhookRes = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": signature,
      },
      body: eventBody,
    });

    assert.equal(webhookRes.status, 200);

    const freshOrder = await Order.findById(order._id);
    assert.equal(freshOrder?.status, "CANCELLED");
    assert.equal(freshOrder?.paymentStatus, "FAILED");

    // Stock must stay 6, and reservedStock must be released back to 0
    const freshVariant = await Variant.findById(variant._id);
    assert.equal(freshVariant?.stock, 6, "Physical stock must remain untouched");
    assert.equal(freshVariant?.reservedStock, 0, "Hold must be released back to 0");
  });

  it("6. Concurrent purchase of the last unit (stock: 1) permits exactly 1 reservation and rejects oversell", async () => {
    // Exactly 1 unit in stock, 0 reserved
    const { variant } = await createTestProductAndVariant({
      pricePaise: 349900,
      stock: 1,
      reservedStock: 0,
    });

    const payload = {
      items: [
        {
          variantId: variant._id.toString(),
          quantity: 1,
          pricePaise: 349900,
        },
      ],
      shippingAddress: {
        name: "Concurrent Buyer",
        email: "concurrent@test.com",
        phone: "9876543210",
        street: "Rush Lane",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400001",
        country: "India",
      },
    };

    // 5 concurrent buyer requests attempting to grab the 1 last unit
    const concurrency = 5;
    const promises = Array.from({ length: concurrency }).map(() =>
      fetch(`${BASE_URL}/api/checkout/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );

    const responses = await Promise.all(promises);
    const results = await Promise.all(
      responses.map(async (r) => {
        const text = await r.text();
        let data: any = {};
        try {
          data = JSON.parse(text);
        } catch {
          data = { rawText: text };
        }
        return {
          status: r.status,
          data,
        };
      }),
    );

    const successful = results.filter((r) => r.status === 200 && r.data.success);
    const rejected = results.filter((r) => r.status === 400);

    for (const s of successful) {
      if (s.data.orderNumber) {
        const ord = await Order.findOne({ orderNumber: s.data.orderNumber });
        if (ord) createdOrderIds.push(ord._id as mongoose.Types.ObjectId);
      }
    }

    assert.equal(
      successful.length,
      1,
      `Exactly 1 concurrent purchase should succeed, got ${successful.length}`,
    );
    assert.equal(
      rejected.length,
      concurrency - 1,
      `All other ${concurrency - 1} purchases must be rejected with insufficient stock`,
    );

    // Verify database state: physical stock is still 1, reservedStock is 1 (never > 1)
    const freshVariant = await Variant.findById(variant._id);
    assert.equal(freshVariant?.stock, 1, "Physical stock remains 1");
    assert.equal(freshVariant?.reservedStock, 1, "Reserved stock must be exactly 1");
  });

  it("7. Auto-release cron releases expired reservation holds older than 15 minutes", async () => {
    const { variant } = await createTestProductAndVariant({
      pricePaise: 99900,
      stock: 5,
      reservedStock: 2,
    });

    // Create an expired unpaid order (expiresAt in the past)
    const expiredOrder = await Order.create({
      orderNumber: `MC-TEST-EXPIRED-${Date.now()}`,
      customerId: new mongoose.Types.ObjectId(),
      items: [
        {
          variantId: variant._id,
          productId: variant.productId,
          skuSnapshot: variant.sku,
          nameSnapshot: "Expired Order Product",
          priceSnapshotPaise: 99900,
          qty: 2,
        },
      ],
      status: "PENDING",
      paymentStatus: "PENDING",
      expiresAt: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago (expired!)
      totals: {
        subtotalPaise: 199800,
        shippingPaise: 0,
        taxPaise: 0,
        discountPaise: 0,
        totalPaise: 199800,
      },
      shippingAddress: {
        name: "Expired Buyer",
        email: "expired@test.com",
        phone: "9876543210",
        street: "Old St",
        city: "Delhi",
        state: "Delhi",
        postalCode: "110001",
        country: "India",
      },
      timeline: [],
    });
    createdOrderIds.push(expiredOrder._id as mongoose.Types.ObjectId);

    // Call the cron route
    const cronRes = await fetch(`${BASE_URL}/api/cron/release-unpaid-orders`, {
      method: "POST",
    });
    assert.equal(cronRes.status, 200);
    const cronData = await cronRes.json();
    assert.ok(cronData.success);
    assert.ok(cronData.cancelledCount >= 1);

    // Verify order was auto-cancelled
    const freshOrder = await Order.findById(expiredOrder._id);
    assert.equal(freshOrder?.status, "CANCELLED");
    assert.equal(freshOrder?.paymentStatus, "FAILED");

    // Verify reserved stock was released back: 2 - 2 = 0, physical stock unchanged at 5
    const freshVariant = await Variant.findById(variant._id);
    assert.equal(freshVariant?.stock, 5, "Physical stock remains 5");
    assert.equal(freshVariant?.reservedStock, 0, "Reserved stock released back to 0");
  });
});
