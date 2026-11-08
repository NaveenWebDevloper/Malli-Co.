import { connectDB } from "./db.ts";
import { Campaign, type ICampaign } from "../models/Campaign.ts";

export interface ResolvedPriceResult {
  basePrice: number; // Original price in paise
  compareAtPrice?: number; // Optional compare-at price in paise
  finalPrice: number; // Canonical discounted price in paise (never < 0, never > basePrice)
  discountPercent: number; // Computed discount percentage (0 - 100)
  appliedCampaignId?: string;
  appliedCampaignName?: string;
  badgeLabel?: string;
  themeColor?: string;
}

export interface PriceableVariant {
  pricePaise?: number;
  compareAtPricePaise?: number;
}

export interface PriceableProduct {
  _id?: unknown;
  basePricePaise?: number;
  categoryId?: unknown;
  brandId?: unknown;
  gender?: string;
}

/**
 * Resolves the canonical final price for a product/variant against active campaigns.
 * Rule 1: Never trust client prices — compute strictly server-side.
 * Rule 2: Currency stored and calculated exclusively in integer paise.
 *
 * Rules:
 * 1. Only ONE campaign applies per product: highest priority wins.
 * 2. Ties broken by the lowest prospective price (best deal for customer).
 * 3. Applies on top of basePrice. Never below a floor of 0, never above basePrice.
 * 4. discountPercent shown is computed against compareAtPrice if it exists and > basePrice, otherwise basePrice.
 * 5. Rounding of percentage discounts is rounded to nearest integer paise.
 */
export function resolvePrice(
  variant: PriceableVariant | null | undefined,
  product: PriceableProduct,
  activeCampaigns: ICampaign[],
  now: Date = new Date(),
): ResolvedPriceResult {
  // Regular price in integer paise
  const regularPrice =
    variant?.pricePaise !== undefined && variant.pricePaise !== null
      ? variant.pricePaise
      : product?.basePricePaise ?? 0;

  const compareAtPrice = variant?.compareAtPricePaise;

  if (regularPrice <= 0) {
    return {
      basePrice: regularPrice,
      compareAtPrice,
      finalPrice: regularPrice,
      discountPercent: 0,
    };
  }

  const productIdStr = product?._id?.toString() || "";
  const categoryIdStr = product?.categoryId?.toString() || "";
  const brandIdStr = product?.brandId?.toString() || "";
  const gender = product?.gender;

  // Filter campaigns applicable to this product
  const eligibleCampaigns: {
    campaign: ICampaign;
    prospectivePrice: number;
    discountAmount: number;
  }[] = [];

  for (const c of activeCampaigns) {
    // 1. Must be active
    if (!c.active) continue;

    // 2. Schedule window: startsAt <= now <= endsAt
    const start = new Date(c.startsAt).getTime();
    const end = new Date(c.endsAt).getTime();
    const nowTime = now.getTime();
    if (nowTime < start || nowTime > end) continue;

    // 3. Exclusions check
    if (c.scope?.excludeProductIds && c.scope.excludeProductIds.length > 0) {
      const isExcluded = c.scope.excludeProductIds.some(
        (id) => id.toString() === productIdStr,
      );
      if (isExcluded) continue;
    }

    // 4. Gender scope check
    if (c.scope?.gender && gender && c.scope.gender !== gender) {
      continue;
    }

    // 5. Target mode scope check
    const mode = c.scope?.mode || "ALL";
    const scopeIds = (c.scope?.ids || []).map((id) => id.toString());

    let matchesScope = false;
    switch (mode) {
      case "ALL":
        matchesScope = true;
        break;
      case "CATEGORIES":
        matchesScope = scopeIds.includes(categoryIdStr);
        break;
      case "BRANDS":
        matchesScope = scopeIds.includes(brandIdStr);
        break;
      case "PRODUCTS":
        matchesScope = scopeIds.includes(productIdStr);
        break;
      case "COLLECTIONS":
        // Fallback for custom collections: match if included in scope ids
        matchesScope = scopeIds.includes(productIdStr) || scopeIds.includes(categoryIdStr);
        break;
      default:
        matchesScope = false;
    }

    if (!matchesScope) continue;

    // 6. Calculate prospective discount
    let discount = 0;
    const kind = c.discount?.kind || (c.discount as unknown as { type?: "PERCENT" | "FLAT" })?.type;
    if (kind === "PERCENT") {
      discount = Math.round(regularPrice * (c.discount.value / 100));
    } else if (kind === "FLAT") {
      discount = Math.round(c.discount.value); // Already in paise
    }

    // Optional max cap
    if (
      c.discount.maxDiscountAmount &&
      c.discount.maxDiscountAmount > 0 &&
      discount > c.discount.maxDiscountAmount
    ) {
      discount = c.discount.maxDiscountAmount;
    }

    // Guarantee price floor at 0 and cannot exceed base price
    discount = Math.max(0, Math.min(discount, regularPrice));
    const prospectivePrice = regularPrice - discount;

    eligibleCampaigns.push({
      campaign: c,
      prospectivePrice,
      discountAmount: discount,
    });
  }

  // If no campaign applies
  if (eligibleCampaigns.length === 0) {
    const referencePrice =
      compareAtPrice && compareAtPrice > regularPrice
        ? compareAtPrice
        : regularPrice;
    const discountPercent =
      referencePrice > regularPrice
        ? Math.round(((referencePrice - regularPrice) / referencePrice) * 100)
        : 0;

    return {
      basePrice: regularPrice,
      compareAtPrice,
      finalPrice: regularPrice,
      discountPercent,
    };
  }

  // Single winner selection:
  // 1. Highest priority wins (priority DESC)
  // 2. Ties broken by lowest prospective price (best deal for customer, prospectivePrice ASC)
  eligibleCampaigns.sort((a, b) => {
    if (b.campaign.priority !== a.campaign.priority) {
      return b.campaign.priority - a.campaign.priority;
    }
    return a.prospectivePrice - b.prospectivePrice;
  });

  const winner = eligibleCampaigns[0];
  const finalPrice = winner.prospectivePrice;

  // Discount percent shown against compareAtPrice if it exists, otherwise basePrice
  const referencePrice =
    compareAtPrice && compareAtPrice > regularPrice
      ? compareAtPrice
      : regularPrice;

  const discountPercent =
    referencePrice > finalPrice
      ? Math.round(((referencePrice - finalPrice) / referencePrice) * 100)
      : 0;

  return {
    basePrice: regularPrice,
    compareAtPrice,
    finalPrice,
    discountPercent,
    appliedCampaignId: winner.campaign._id?.toString(),
    appliedCampaignName: winner.campaign.name,
    badgeLabel: winner.campaign.display?.badgeLabel,
    themeColor: winner.campaign.display?.themeColor,
  };
}

/**
 * Cached helper to fetch all active campaigns within the current window.
 */
export async function getActiveCampaigns(now: Date = new Date()): Promise<ICampaign[]> {
  try {
    await connectDB();
    const campaigns = await Campaign.find({
      active: true,
      startsAt: { $lte: now },
      endsAt: { $gte: now },
    })
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    return campaigns as unknown as ICampaign[];
  } catch (error) {
    console.error("Failed to fetch active campaigns:", error);
    return [];
  }
}
