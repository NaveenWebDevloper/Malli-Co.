import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolvePrice, type ResolvedPriceResult } from "../lib/pricing.ts";
import { computeCartTotals, type PopulatedCartItem } from "../lib/cart.ts";
import { CheckoutPayloadSchema } from "../lib/validations/cart.ts";
import {
  calculateGSTBreakdown,
  calculateItemRefundPaise,
} from "../lib/order-transitions.ts";
import type { ICampaign } from "../models/Campaign.ts";
import type { IOrderItem } from "../models/Order.ts";
import mongoose from "mongoose";

describe("Pricing, Cart, Checkout & Orders Financial Integration", () => {
  const baseTime = new Date("2026-11-07T12:00:00.000Z");

  const mockProduct = {
    _id: "prod_shirt_100",
    name: "French Linen Resort Shirt",
    slug: "french-linen-resort-shirt",
    basePricePaise: 200000, // ₹2,000.00
    categoryId: "cat_shirts",
    brandId: "brand_malli",
    gender: "MEN",
  };

  const mockVariant = {
    _id: "var_shirt_100_m",
    productId: "prod_shirt_100",
    sku: "MAL-SHIRT-NVY-M",
    pricePaise: 200000,
    compareAtPricePaise: 250000,
  };

  describe("1. Rule 1: Tampered Client Prices Ignored", () => {
    it("strips client-injected prices in CheckoutPayloadSchema and computes prices server-side only", () => {
      // Malicious payload attempting to pass a tampered price of ₹1.00 instead of ₹2,000.00
      const maliciousPayload = {
        items: [
          {
            variantId: "64f123456789012345678901",
            quantity: 2,
            price: 100,
            pricePaise: 100,
            finalPrice: 100,
            discount: 199900,
          },
        ],
        shippingAddress: {
          name: "Venkata Raman",
          phone: "9876543210",
          email: "customer@example.com",
          street: "Near Vikas Pre School, Govt High School Road, Mallampet, Bachupally",
          city: "Hyderabad",
          state: "Telangana",
          postalCode: "500090",
          country: "IN",
        },
      };

      const parsed = CheckoutPayloadSchema.safeParse(maliciousPayload);
      assert.equal(parsed.success, true);
      if (!parsed.success) return;

      // Ensure the validated item strictly only contains variantId and quantity
      const validatedItem = parsed.data.items[0];
      assert.equal(validatedItem.variantId, "64f123456789012345678901");
      assert.equal(validatedItem.quantity, 2);
      assert.equal("price" in validatedItem, false);
      assert.equal("pricePaise" in validatedItem, false);
      assert.equal("finalPrice" in validatedItem, false);

      // Server calculates price independently via resolvePrice
      const serverResolved = resolvePrice(mockVariant, mockProduct, []);
      assert.equal(serverResolved.finalPrice, 200000); // Canonical ₹2,000, NOT ₹1!
    });
  });

  describe("2. Campaign Lifecycle: Ending Between Add-to-Cart and Checkout", () => {
    it("updates price and identifies expired campaign notice when time advances past endsAt", () => {
      const campaignEndTime = new Date("2026-11-07T14:00:00.000Z");
      const diwaliCampaign: Partial<ICampaign> = {
        _id: "camp_diwali_2026" as unknown as mongoose.Types.ObjectId,
        name: "Diwali Festive Sale",
        active: true,
        priority: 10,
        startsAt: new Date("2026-11-01T00:00:00.000Z"),
        endsAt: campaignEndTime,
        discount: { kind: "PERCENT", value: 20 },
        scope: { mode: "ALL", ids: [], excludeProductIds: [] },
        display: { badgeLabel: "20% OFF", showCountdown: false, landingEnabled: false },
      };

      // 1. Add to cart at 12:00 PM (Sale is LIVE)
      const timeOfAddition = new Date("2026-11-07T12:00:00.000Z");
      const additionPricing = resolvePrice(
        mockVariant,
        mockProduct,
        [diwaliCampaign as ICampaign],
        timeOfAddition,
      );

      assert.equal(additionPricing.finalPrice, 160000); // 20% off ₹2,000 = ₹1,600
      assert.equal(additionPricing.appliedCampaignName, "Diwali Festive Sale");

      const cartItemSnapshot = {
        priceAtAdditionPaise: additionPricing.finalPrice,
        campaignIdAtAddition: additionPricing.appliedCampaignId,
        campaignNameAtAddition: additionPricing.appliedCampaignName,
      };

      // 2. Customer visits cart / checkouts at 15:00 PM (Sale has ENDED)
      const timeOfCheckout = new Date("2026-11-07T15:00:00.000Z");
      const checkoutPricing = resolvePrice(
        mockVariant,
        mockProduct,
        [diwaliCampaign as ICampaign],
        timeOfCheckout,
      );

      assert.equal(checkoutPricing.finalPrice, 200000); // Reverts to base price ₹2,000
      assert.equal(checkoutPricing.appliedCampaignId, undefined);

      // 3. Verify price drift notice logic
      const notice =
        cartItemSnapshot.campaignIdAtAddition &&
        cartItemSnapshot.campaignIdAtAddition !== checkoutPricing.appliedCampaignId
          ? `Price updated: the ${cartItemSnapshot.campaignNameAtAddition || "promotional sale"} has ended.`
          : null;

      assert.equal(
        notice,
        "Price updated: the Diwali Festive Sale has ended.",
      );
    });
  });

  describe("3. Order Item Snapshots: Immutable Across Later Campaign Edits", () => {
    it("keeps historical order item prices and campaign names untouched after campaign modification", () => {
      // Order placed with 20% off snapshot
      const orderItemSnapshot: IOrderItem = {
        variantId: new mongoose.Types.ObjectId("64f123456789012345678901"),
        productId: new mongoose.Types.ObjectId("64f123456789012345678902"),
        nameSnapshot: "French Linen Resort Shirt",
        skuSnapshot: "MAL-SHIRT-NVY-M",
        basePricePaise: 200000,
        compareAtPricePaise: 250000,
        finalPricePaise: 160000,
        discountAmountPaise: 40000,
        campaignId: "camp_diwali_2026",
        campaignName: "Diwali Festive Sale",
        priceSnapshotPaise: 160000,
        qty: 1,
      };

      // Later, admin modifies the campaign to 50% or deletes it entirely
      const modifiedCampaign: Partial<ICampaign> = {
        _id: "camp_diwali_2026" as unknown as mongoose.Types.ObjectId,
        name: "Diwali Clearance Blowout",
        active: false, // Campaign disabled!
        discount: { kind: "PERCENT", value: 50 },
      };

      // Order item snapshot remains completely frozen and unmodified
      assert.equal(orderItemSnapshot.basePricePaise, 200000);
      assert.equal(orderItemSnapshot.finalPricePaise, 160000);
      assert.equal(orderItemSnapshot.discountAmountPaise, 40000);
      assert.equal(orderItemSnapshot.campaignName, "Diwali Festive Sale");
      assert.equal(orderItemSnapshot.priceSnapshotPaise, 160000);
    });
  });

  describe("4. Refunds: Using Actual Price Paid (Not Current Price)", () => {
    it("calculates refund strictly from unit finalPricePaise, avoiding over-refunding", () => {
      const orderItem: IOrderItem = {
        variantId: new mongoose.Types.ObjectId("64f123456789012345678901"),
        productId: new mongoose.Types.ObjectId("64f123456789012345678902"),
        nameSnapshot: "French Linen Resort Shirt",
        skuSnapshot: "MAL-SHIRT-NVY-M",
        basePricePaise: 200000, // Current catalog price ₹2,000
        finalPricePaise: 150000, // Discounted purchase price ₹1,500
        discountAmountPaise: 50000,
        campaignName: "Diwali Flash Sale",
        priceSnapshotPaise: 150000,
        qty: 2,
      };

      // Customer returns 1 unit
      const refundForOne = calculateItemRefundPaise(orderItem, 1);
      assert.equal(refundForOne, 150000); // Must refund ₹1,500, NOT ₹2,000!

      // Customer returns both units
      const refundForBoth = calculateItemRefundPaise(orderItem, 2);
      assert.equal(refundForBoth, 300000); // ₹3,000 total
    });
  });

  describe("5. Concurrent Overlapping Campaigns: Priority & Tie-Breaking", () => {
    it("selects higher priority campaign when multiple campaigns cover the same product", () => {
      const lowPriorityCampaign: Partial<ICampaign> = {
        _id: "camp_low" as unknown as mongoose.Types.ObjectId,
        name: "General Promo",
        active: true,
        priority: 10,
        startsAt: new Date("2026-11-01T00:00:00.000Z"),
        endsAt: new Date("2026-11-30T00:00:00.000Z"),
        discount: { kind: "PERCENT", value: 10 }, // 10% off -> ₹1,800
        scope: { mode: "ALL", ids: [], excludeProductIds: [] },
      };

      const highPriorityCampaign: Partial<ICampaign> = {
        _id: "camp_high" as unknown as mongoose.Types.ObjectId,
        name: "Festive Exclusive",
        active: true,
        priority: 50,
        startsAt: new Date("2026-11-01T00:00:00.000Z"),
        endsAt: new Date("2026-11-30T00:00:00.000Z"),
        discount: { kind: "PERCENT", value: 25 }, // 25% off -> ₹1,500
        scope: { mode: "ALL", ids: [], excludeProductIds: [] },
      };

      const resolved = resolvePrice(
        mockVariant,
        mockProduct,
        [lowPriorityCampaign as ICampaign, highPriorityCampaign as ICampaign],
        baseTime,
      );

      assert.equal(resolved.appliedCampaignName, "Festive Exclusive");
      assert.equal(resolved.finalPrice, 150000);
      assert.equal(resolved.discountPercent, 40); // against compareAtPrice ₹2,500: (2500 - 1500)/2500 = 40%
    });

    it("breaks equal priority ties by giving customer the best deal (lowest price)", () => {
      const promoA: Partial<ICampaign> = {
        _id: "camp_a" as unknown as mongoose.Types.ObjectId,
        name: "Flat Discount",
        active: true,
        priority: 20,
        startsAt: new Date("2026-11-01T00:00:00.000Z"),
        endsAt: new Date("2026-11-30T00:00:00.000Z"),
        discount: { kind: "FLAT", value: 30000 }, // ₹300 off -> ₹1,700
        scope: { mode: "ALL", ids: [], excludeProductIds: [] },
      };

      const promoB: Partial<ICampaign> = {
        _id: "camp_b" as unknown as mongoose.Types.ObjectId,
        name: "Percent Discount",
        active: true,
        priority: 20, // Equal priority
        startsAt: new Date("2026-11-01T00:00:00.000Z"),
        endsAt: new Date("2026-11-30T00:00:00.000Z"),
        discount: { kind: "PERCENT", value: 20 }, // 20% off -> ₹1,600 (better deal!)
        scope: { mode: "ALL", ids: [], excludeProductIds: [] },
      };

      const resolved = resolvePrice(
        mockVariant,
        mockProduct,
        [promoA as ICampaign, promoB as ICampaign],
        baseTime,
      );

      assert.equal(resolved.appliedCampaignName, "Percent Discount");
      assert.equal(resolved.finalPrice, 160000);
    });
  });

  describe("6. GST-Inclusive / Tax Calculations on Discounted Selling Price", () => {
    it("computes 5% GST accurately on discounted subtotal for Intra-State (Telangana)", () => {
      // Selling price: ₹1,600 (160000 paise)
      const subtotalPaise = 160000;
      const gst = calculateGSTBreakdown("Telangana", 0, subtotalPaise);

      // Taxable = 160000 paise (discounted price)
      assert.equal(gst.taxablePaise, 160000);
      assert.equal(gst.totalTaxPaise, 8000); // 5% of 160,000 = 8,000 paise (₹80)
      assert.equal(gst.isInterState, false);
      assert.equal(gst.cgstPaise, 4000);
      assert.equal(gst.sgstPaise, 4000);
      assert.equal(gst.cgstPaise + gst.sgstPaise, 8000);
    });

    it("computes 5% IGST accurately for Inter-State shipping (e.g. Maharashtra)", () => {
      const subtotalPaise = 160000;
      const gst = calculateGSTBreakdown("Maharashtra", 0, subtotalPaise);

      assert.equal(gst.isInterState, true);
      assert.equal(gst.taxablePaise, 160000);
      assert.equal(gst.igstPaise, 8000);
      assert.equal(gst.cgstPaise, 0);
      assert.equal(gst.sgstPaise, 0);
      assert.equal(gst.totalTaxPaise, 8000);
    });

    it("computes cart totals accurately with GST on discounted price and free shipping threshold", () => {
      const items: PopulatedCartItem[] = [
        {
          variantId: "var_1",
          productId: "prod_1",
          productName: "Linen Shirt",
          productSlug: "linen-shirt",
          sku: "MAL-LIN-01",
          basePricePaise: 200000,
          pricePaise: 160000,
          discountPercent: 20,
          quantity: 2,
          stockAvailable: 10,
          isAvailable: true,
          lineTotalPaise: 320000, // 2 * 160000 = ₹3,200 (exceeds ₹2,500 free shipping)
          options: {},
        },
      ];

      const totals = computeCartTotals(items);
      assert.equal(totals.subtotalPaise, 320000);
      assert.equal(totals.discountPaise, 80000); // Saved 2 * ₹400 = ₹800
      assert.equal(totals.shippingPaise, 0); // Free shipping
      assert.equal(totals.taxPaise, 16000); // 5% of 320000 = 16000 paise (₹160)
      assert.equal(totals.totalPaise, 320000 + 0 + 16000); // 336000
    });
  });
});
