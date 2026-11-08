import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeCartTotals,
  FREE_SHIPPING_THRESHOLD_PAISE,
  STANDARD_SHIPPING_PAISE,
  type PopulatedCartItem,
} from "../lib/cart.ts";
import {
  AddToCartSchema,
  CheckoutAddressSchema,
  CheckoutPayloadSchema,
} from "../lib/validations/cart.ts";
import { sendOrderConfirmationEmail } from "../lib/email.ts";
import type { IOrder } from "../models/Order.ts";
import mongoose from "mongoose";

describe("Cart Calculations, Validations & Checkout Engine", () => {
  describe("Server-Side Cart Calculations (Rule 1 & Rule 2)", () => {
    it("computes subtotal in integer paise for available items", () => {
      const mockItems: PopulatedCartItem[] = [
        {
          variantId: "64f123456789012345678901",
          productId: "64f123456789012345678902",
          productName: "Classic Linen Shirt",
          productSlug: "classic-linen-shirt",
          sku: "MH-LIN-NVY-M",
          pricePaise: 249900, // ₹2,499.00
          quantity: 2,
          stockAvailable: 10,
          isAvailable: true,
          lineTotalPaise: 499800,
          options: { Size: "M", Color: "Navy" },
        },
      ];

      const totals = computeCartTotals(mockItems);

      assert.equal(totals.subtotalPaise, 499800);
      // Since 499800 >= 200000 (₹2,000), shipping should be 0 (Complimentary)
      assert.equal(totals.shippingPaise, 0);
      // 5% GST = 499800 * 0.05 = 24990 paise
      assert.equal(totals.taxPaise, 24990);
      assert.equal(totals.totalPaise, 499800 + 0 + 24990);
    });

    it("applies standard shipping fee for orders below free shipping threshold", () => {
      const lowValueItem: PopulatedCartItem[] = [
        {
          variantId: "64f123456789012345678901",
          productId: "64f123456789012345678902",
          productName: "Pima Cotton Bandana",
          productSlug: "pima-cotton-bandana",
          sku: "MH-ACC-BAN",
          pricePaise: 99900, // ₹999.00 (< ₹2,000 threshold)
          quantity: 1,
          stockAvailable: 5,
          isAvailable: true,
          lineTotalPaise: 99900,
          options: {},
        },
      ];

      const totals = computeCartTotals(lowValueItem);

      assert.equal(totals.subtotalPaise, 99900);
      assert.equal(totals.shippingPaise, STANDARD_SHIPPING_PAISE); // ₹150.00
      assert.equal(totals.taxPaise, Math.round(99900 * 0.05));
      assert.equal(
        totals.totalPaise,
        99900 + STANDARD_SHIPPING_PAISE + Math.round(99900 * 0.05),
      );
    });

    it("excludes unavailable/out-of-stock items from subtotal", () => {
      const itemsWithUnavailable: PopulatedCartItem[] = [
        {
          variantId: "64f123456789012345678901",
          productId: "64f123456789012345678902",
          productName: "Available Shirt",
          productSlug: "available-shirt",
          sku: "MH-AVAIL",
          pricePaise: 200000,
          quantity: 1,
          stockAvailable: 5,
          isAvailable: true,
          lineTotalPaise: 200000,
          options: {},
        },
        {
          variantId: "64f123456789012345678903",
          productId: "64f123456789012345678904",
          productName: "Sold Out Shirt",
          productSlug: "sold-out-shirt",
          sku: "MH-SOLDOUT",
          pricePaise: 500000,
          quantity: 1,
          stockAvailable: 0,
          isAvailable: false,
          lineTotalPaise: 500000,
          options: {},
        },
      ];

      const totals = computeCartTotals(itemsWithUnavailable);
      assert.equal(totals.subtotalPaise, 200000);
    });
  });

  describe("Zod Validations for Cart & Checkout", () => {
    it("validates AddToCartSchema with valid variant and positive integer", () => {
      const valid = AddToCartSchema.safeParse({
        variantId: "64f123456789012345678901",
        quantity: 3,
      });
      assert.ok(valid.success);
    });

    it("rejects non-positive or non-integer cart quantities", () => {
      const zeroQty = AddToCartSchema.safeParse({
        variantId: "64f123456789012345678901",
        quantity: 0,
      });
      assert.ok(!zeroQty.success);

      const floatQty = AddToCartSchema.safeParse({
        variantId: "64f123456789012345678901",
        quantity: 1.5,
      });
      assert.ok(!floatQty.success);
    });

    it("validates Indian 6-digit PIN code and phone in CheckoutAddressSchema", () => {
      const validAddress = CheckoutAddressSchema.safeParse({
        name: "Pranav Rao",
        phone: "9876543210",
        email: "pranav@example.com",
        street: "Road No. 10, Banjara Hills",
        city: "Hyderabad",
        state: "Telangana",
        postalCode: "500034",
      });
      assert.ok(validAddress.success);

      // Invalid PIN code (5 digits instead of 6)
      const invalidPin = CheckoutAddressSchema.safeParse({
        name: "Pranav Rao",
        phone: "9876543210",
        email: "pranav@example.com",
        street: "Road No. 10, Banjara Hills",
        city: "Hyderabad",
        state: "Telangana",
        postalCode: "50003",
      });
      assert.ok(!invalidPin.success);
    });

    it("validates full CheckoutPayloadSchema", () => {
      const payload = CheckoutPayloadSchema.safeParse({
        items: [{ variantId: "64f123456789012345678901", quantity: 2 }],
        shippingAddress: {
          name: "Pranav Rao",
          phone: "9876543210",
          email: "pranav@example.com",
          street: "Road No. 10, Banjara Hills",
          city: "Hyderabad",
          state: "Telangana",
          postalCode: "500034",
        },
      });
      assert.ok(payload.success);
    });
  });

  describe("Order Confirmation Email Service", () => {
    it("generates and dispatches confirmation email without throwing", async () => {
      const mockOrder = {
        _id: new mongoose.Types.ObjectId(),
        orderNumber: "MC-TEST-9988",
        items: [
          {
            variantId: new mongoose.Types.ObjectId(),
            productId: new mongoose.Types.ObjectId(),
            nameSnapshot: "Pure Linen Oxford Shirt",
            skuSnapshot: "MH-LIN-OXF-WHT",
            priceSnapshotPaise: 249900,
            qty: 1,
          },
        ],
        totals: {
          subtotalPaise: 249900,
          shippingPaise: 0,
          taxPaise: 12495,
          discountPaise: 0,
          totalPaise: 262395,
        },
        shippingAddress: {
          name: "Vikramaditya",
          phone: "9988776655",
          email: "vikram@example.com",
          street: "Near Vikas Pre School, Govt High School Road, Mallampet, Bachupally",
          city: "Hyderabad",
          state: "Telangana",
          postalCode: "500090",
          country: "IN",
        },
        paymentStatus: "PAID",
      } as unknown as IOrder;

      const result = await sendOrderConfirmationEmail(
        mockOrder,
        "vikram@example.com",
      );

      assert.equal(result.success, true);
      assert.ok(result.messageId);
      assert.equal(result.recipient, "vikram@example.com");
    });
  });
});

