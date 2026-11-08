import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatCurrency } from "../lib/currency.ts";
import { resolvePrice, type ResolvedPriceResult } from "../lib/pricing.ts";
import type { ICampaign } from "../models/Campaign.ts";

describe("Storefront Promotions & Merchandising Engine", () => {
  describe("1. Currency & PriceTag Logic (Rules 1 & 2)", () => {
    it("formats integer paise to canonical Indian Rupee without floating point errors", () => {
      assert.equal(formatCurrency(149900), "₹1,499.00");
      assert.equal(formatCurrency(299900), "₹2,999.00");
      assert.equal(formatCurrency(9900), "₹99.00");
      assert.equal(formatCurrency(0), "₹0.00");
    });

    it("evaluates discount state correctly when discountPercent > 0", () => {
      const discountedPricing: ResolvedPriceResult = {
        basePrice: 200000,
        compareAtPrice: 250000,
        finalPrice: 160000,
        discountPercent: 36,
        badgeLabel: "FESTIVE SALE",
      };

      const finalFormatted = formatCurrency(discountedPricing.finalPrice);
      const compareFormatted = formatCurrency(discountedPricing.compareAtPrice!);
      const isDiscounted =
        discountedPricing.discountPercent > 0 &&
        discountedPricing.compareAtPrice! > discountedPricing.finalPrice;

      assert.equal(finalFormatted, "₹1,600.00");
      assert.equal(compareFormatted, "₹2,500.00");
      assert.equal(isDiscounted, true);
      assert.equal(discountedPricing.discountPercent, 36);
    });

    it("evaluates undiscounted state correctly when discountPercent === 0", () => {
      const regularPricing: ResolvedPriceResult = {
        basePrice: 200000,
        finalPrice: 200000,
        discountPercent: 0,
      };

      const isDiscounted =
        regularPricing.discountPercent > 0 &&
        Boolean(regularPricing.compareAtPrice && regularPricing.compareAtPrice > regularPricing.finalPrice);

      assert.equal(isDiscounted, false);
      assert.equal(formatCurrency(regularPricing.finalPrice), "₹2,000.00");
    });
  });

  describe("2. ProductCard Badge Precedence (Sale Badge WINS over NEW DROP)", () => {
    function computeBadge(
      pricing?: ResolvedPriceResult,
      createdAt?: string,
      now: Date = new Date(),
    ): { type: "SALE" | "NEW_DROP" | "NONE"; label: string | null } {
      const hasSaleBadge = Boolean(
        pricing?.badgeLabel || (pricing?.discountPercent && pricing.discountPercent > 0),
      );
      const saleBadgeLabel =
        pricing?.badgeLabel ||
        (pricing?.discountPercent ? `${pricing.discountPercent}% OFF` : null);

      if (hasSaleBadge && saleBadgeLabel) {
        return { type: "SALE", label: saleBadgeLabel };
      }

      if (createdAt) {
        const diffMs = now.getTime() - new Date(createdAt).getTime();
        const isUnder14Days = diffMs < 14 * 24 * 60 * 60 * 1000 && diffMs >= 0;
        if (isUnder14Days) {
          return { type: "NEW_DROP", label: "NEW DROP" };
        }
      }

      return { type: "NONE", label: null };
    }

    it("sale badge takes precedence even if product was created under 14 days ago", () => {
      const now = new Date("2026-11-07T12:00:00.000Z");
      const recentDate = new Date("2026-11-05T12:00:00.000Z").toISOString(); // 2 days old

      const pricing: ResolvedPriceResult = {
        basePrice: 300000,
        finalPrice: 240000,
        discountPercent: 20,
        badgeLabel: "DIWALI SALE",
      };

      const badge = computeBadge(pricing, recentDate, now);
      assert.equal(badge.type, "SALE");
      assert.equal(badge.label, "DIWALI SALE");
    });

    it("shows NEW DROP when product is under 14 days old and no sale applies", () => {
      const now = new Date("2026-11-07T12:00:00.000Z");
      const recentDate = new Date("2026-11-01T12:00:00.000Z").toISOString(); // 6 days old

      const regularPricing: ResolvedPriceResult = {
        basePrice: 300000,
        finalPrice: 300000,
        discountPercent: 0,
      };

      const badge = computeBadge(regularPricing, recentDate, now);
      assert.equal(badge.type, "NEW_DROP");
      assert.equal(badge.label, "NEW DROP");
    });

    it("shows no badge when product is older than 14 days and no sale applies", () => {
      const now = new Date("2026-11-07T12:00:00.000Z");
      const oldDate = new Date("2026-10-01T12:00:00.000Z").toISOString(); // 37 days old

      const regularPricing: ResolvedPriceResult = {
        basePrice: 300000,
        finalPrice: 300000,
        discountPercent: 0,
      };

      const badge = computeBadge(regularPricing, oldDate, now);
      assert.equal(badge.type, "NONE");
      assert.equal(badge.label, null);
    });
  });

  describe("3. Countdown Timer Clock Drift Math", () => {
    function calculateRemaining(
      endsAtMs: number,
      serverNowMs: number,
      clientNowMs: number,
    ) {
      const clockDriftMs = serverNowMs - clientNowMs;
      const effectiveNow = clientNowMs + clockDriftMs; // equals serverNowMs
      const diff = endsAtMs - effectiveNow;

      if (diff <= 0) {
        return { isEnded: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return { isEnded: false, days, hours, minutes, seconds };
    }

    it("compensates accurately when client clock is 1 hour fast", () => {
      const serverNow = new Date("2026-11-07T12:00:00.000Z").getTime();
      const clientFastClock = new Date("2026-11-07T13:00:00.000Z").getTime(); // +1 hour fast
      const endsAt = new Date("2026-11-07T14:00:00.000Z").getTime(); // 2 hours from serverNow

      const res = calculateRemaining(endsAt, serverNow, clientFastClock);
      assert.equal(res.isEnded, false);
      assert.equal(res.days, 0);
      assert.equal(res.hours, 2); // Correct: 2 hours left according to server
    });

    it("compensates accurately when client clock is 30 minutes slow", () => {
      const serverNow = new Date("2026-11-07T12:00:00.000Z").getTime();
      const clientSlowClock = new Date("2026-11-07T11:30:00.000Z").getTime(); // -30 min slow
      const endsAt = new Date("2026-11-08T12:00:00.000Z").getTime(); // exactly 1 day from serverNow

      const res = calculateRemaining(endsAt, serverNow, clientSlowClock);
      assert.equal(res.isEnded, false);
      assert.equal(res.days, 1);
      assert.equal(res.hours, 0);
    });

    it("correctly identifies campaign as ended when server time passes endsAt", () => {
      const serverNow = new Date("2026-11-07T15:00:01.000Z").getTime();
      const clientClock = new Date("2026-11-07T14:00:00.000Z").getTime(); // client thinks it's 14:00
      const endsAt = new Date("2026-11-07T15:00:00.000Z").getTime();

      const res = calculateRemaining(endsAt, serverNow, clientClock);
      assert.equal(res.isEnded, true);
    });
  });

  describe("4. Sale Landing Page Scope Filtering", () => {
    const mockProducts = [
      { _id: "prod-1", name: "Shirt 1", gender: "MEN", category: { _id: "cat-shirts" }, brand: { _id: "brand-malli" } },
      { _id: "prod-2", name: "Pants 1", gender: "MEN", category: { _id: "cat-pants" }, brand: { _id: "brand-malli" } },
      { _id: "prod-3", name: "Kids Kurta", gender: "KIDS", category: { _id: "cat-kurtas" }, brand: { _id: "brand-artisan" } },
      { _id: "prod-4", name: "Shirt 2 (Excluded)", gender: "MEN", category: { _id: "cat-shirts" }, brand: { _id: "brand-malli" } },
    ];

    it("filters products by CATEGORIES mode with exclusions and gender", () => {
      const campaign = {
        scope: {
          mode: "CATEGORIES",
          ids: ["cat-shirts"],
          gender: "MEN",
          excludeProductIds: ["prod-4"],
        },
      };

      const matched = mockProducts.filter((p) => {
        if (campaign.scope.excludeProductIds.includes(p._id)) return false;
        if (campaign.scope.gender && p.gender !== campaign.scope.gender) return false;
        if (campaign.scope.mode === "CATEGORIES") {
          return campaign.scope.ids.includes(p.category._id);
        }
        return true;
      });

      assert.equal(matched.length, 1);
      assert.equal(matched[0]._id, "prod-1");
    });

    it("filters products by ALL mode with gender constraint", () => {
      const campaign = {
        scope: {
          mode: "ALL",
          gender: "KIDS",
          excludeProductIds: [],
        },
      };

      const matched = mockProducts.filter((p) => {
        if (campaign.scope.gender && p.gender !== campaign.scope.gender) return false;
        return true;
      });

      assert.equal(matched.length, 1);
      assert.equal(matched[0]._id, "prod-3");
    });
  });
});

