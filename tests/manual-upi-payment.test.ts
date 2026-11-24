import test from "node:test";
import assert from "node:assert/strict";
import { QrCode } from "../lib/qrcode.ts";
import { CheckoutPayloadSchema } from "../lib/validations/cart.ts";
import { DEFAULT_PAYMENT_SETTINGS } from "../lib/settings.ts";

test("Manual UPI & QR Code Subsystem Unit Tests", async (t) => {
  await t.test("QR Code Generator produces valid SVG for UPI payment URI", () => {
    const upiUri =
      "upi://pay?pa=malliandco@okaxis&pn=Malli%20%26%20Co.&am=1499.00&cu=INR&tn=Order%20MC-TEST-1234";
    const qr = QrCode.encodeText(upiUri, "M");

    assert.ok(qr.size > 20, "QR version size should be greater than 20");
    assert.equal(qr.errorCorrection, "M");

    const svg = qr.toSvg(240);
    assert.ok(svg.startsWith("<svg"), "Output must begin with <svg");
    assert.ok(svg.includes("viewBox="), "SVG must include viewBox attribute");
    assert.ok(svg.includes("<path d="), "SVG must include path data");
    assert.ok(svg.endsWith("</svg>"), "SVG must terminate cleanly with </svg>");
  });

  await t.test("CheckoutPayloadSchema accepts MANUAL_UPI payment method", () => {
    const payload = {
      items: [{ variantId: "507f1f77bcf86cd799439011", quantity: 2 }],
      shippingAddress: {
        name: "Aarav Sharma",
        phone: "9876543210",
        email: "aarav@example.com",
        street: "Banjara Hills Road No 10",
        landmark: "Near Metro",
        city: "Hyderabad",
        state: "Telangana",
        postalCode: "500034",
        country: "IN",
      },
      paymentMethod: "MANUAL_UPI",
    };

    const parsed = CheckoutPayloadSchema.safeParse(payload);
    assert.ok(parsed.success, "Payload with MANUAL_UPI must be valid");
    if (parsed.success) {
      assert.equal(parsed.data.paymentMethod, "MANUAL_UPI");
    }
  });

  await t.test("CheckoutPayloadSchema defaults to MANUAL_UPI if omitted", () => {
    const payload = {
      items: [{ variantId: "507f1f77bcf86cd799439011", quantity: 1 }],
      shippingAddress: {
        name: "Aarav Sharma",
        phone: "9876543210",
        email: "aarav@example.com",
        street: "Banjara Hills Road No 10",
        city: "Hyderabad",
        state: "Telangana",
        postalCode: "500034",
      },
    };

    const parsed = CheckoutPayloadSchema.safeParse(payload);
    assert.ok(parsed.success, "Payload without explicit paymentMethod must succeed");
    if (parsed.success) {
      assert.equal(parsed.data.paymentMethod, "MANUAL_UPI");
    }
  });

  await t.test("Default Payment Settings provide safe fallback values", () => {
    assert.equal(DEFAULT_PAYMENT_SETTINGS.manualUpiEnabled, true);
    assert.equal(DEFAULT_PAYMENT_SETTINGS.storeUpiId, "malliandco@okaxis");
    assert.equal(DEFAULT_PAYMENT_SETTINGS.storeUpiName, "Malli & Co.");
    assert.ok(DEFAULT_PAYMENT_SETTINGS.storeUpiInstructions.includes("Scan the QR code"));
  });
});

