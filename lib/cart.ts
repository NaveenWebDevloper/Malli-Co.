import crypto from "crypto";
import mongoose from "mongoose";
import { connectDB } from "./db.ts";
import { Cart, type ICart } from "../models/Cart.ts";
import { Variant } from "../models/Variant.ts";
import { Product } from "../models/Product.ts";
import { getActiveCampaigns, resolvePrice } from "./pricing.ts";

export interface PopulatedCartItem {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  sku: string;
  basePricePaise?: number;
  pricePaise: number; // Canonical selling price per unit (paise) after resolvePrice
  compareAtPricePaise?: number;
  discountPercent?: number;
  appliedCampaignId?: string;
  appliedCampaignName?: string;
  badgeLabel?: string;
  options: Record<string, string>;
  image?: string;
  quantity: number;
  stockAvailable: number;
  isAvailable: boolean;
  lineTotalPaise: number;
}

export interface CalculatedCartTotals {
  subtotalPaise: number;
  shippingPaise: number;
  taxPaise: number;
  discountPaise: number;
  totalPaise: number;
}

export interface EnrichedCart {
  _id: string;
  cartToken: string;
  userId?: string | null;
  items: PopulatedCartItem[];
  totals: CalculatedCartTotals;
  itemCount: number;
  hasOutOfStockItems: boolean;
  notices: string[];
}

import {
  FREE_SHIPPING_THRESHOLD_PAISE,
  STANDARD_SHIPPING_PAISE,
} from "./constants.ts";

export { FREE_SHIPPING_THRESHOLD_PAISE, STANDARD_SHIPPING_PAISE };

/**
 * Computes canonical server-side totals for a given list of populated cart items.
 * Strictly complies with Rule 1 and Rule 2:
 * - Computed exclusively server-side
 * - Integer paise only
 */
export function computeCartTotals(items: PopulatedCartItem[]): CalculatedCartTotals {
  let subtotalPaise = 0;
  let discountPaise = 0;

  for (const item of items) {
    if (item.isAvailable) {
      subtotalPaise += item.pricePaise * item.quantity;
      if (item.basePricePaise && item.basePricePaise > item.pricePaise) {
        discountPaise += (item.basePricePaise - item.pricePaise) * item.quantity;
      }
    }
  }

  const shippingPaise =
    subtotalPaise === 0 || subtotalPaise >= FREE_SHIPPING_THRESHOLD_PAISE
      ? 0
      : STANDARD_SHIPPING_PAISE;

  // 5% GST on discounted apparel subtotal
  const taxPaise = Math.round(subtotalPaise * 0.05);
  const totalPaise = subtotalPaise + shippingPaise + taxPaise;

  return {
    subtotalPaise,
    shippingPaise,
    taxPaise,
    discountPaise,
    totalPaise,
  };
}

/**
 * Finds or creates a cart by cartToken or userId.
 */
export async function getOrCreateCart(params: {
  cartToken?: string | null;
  userId?: string | null;
}): Promise<ICart> {
  await connectDB();
  void Product;
  void Variant;

  const { cartToken, userId } = params;

  let cart: ICart | null = null;

  // 1. If user is logged in, find cart by userId
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    cart = await Cart.findOne({ userId: userObjectId });

    // If guest cartToken was provided as well, merge guest items into user cart
    if (cartToken) {
      const guestCart = await Cart.findOne({ cartToken, userId: null });
      if (guestCart && guestCart.items.length > 0) {
        if (!cart) {
          // Claim guest cart
          guestCart.userId = userObjectId;
          await guestCart.save();
          return guestCart;
        } else {
          // Merge items
          for (const gItem of guestCart.items) {
            const existingIdx = cart.items.findIndex(
              (i) => i.variantId.toString() === gItem.variantId.toString(),
            );
            if (existingIdx > -1) {
              cart.items[existingIdx].quantity += gItem.quantity;
            } else {
              cart.items.push(gItem);
            }
          }
          await cart.save();
          await Cart.deleteOne({ _id: guestCart._id });
        }
      }
    }

    if (cart) return cart;
  }

  // 2. Find cart by guest cartToken
  if (cartToken) {
    cart = await Cart.findOne({ cartToken });
    if (cart) {
      if (userId && mongoose.Types.ObjectId.isValid(userId) && !cart.userId) {
        cart.userId = new mongoose.Types.ObjectId(userId);
        await cart.save();
      }
      return cart;
    }
  }

  // 3. Create a new cart
  const newToken = cartToken || `cart_${crypto.randomBytes(16).toString("hex")}`;
  const newCart = await Cart.create({
    cartToken: newToken,
    userId: userId && mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null,
    items: [],
  });

  return newCart;
}

/**
 * Hydrates cart items with canonical database pricing and stock checks.
 * Resolves promotional pricing dynamically via lib/pricing.ts (Rule 1).
 */
export async function enrichCart(cartDoc: ICart): Promise<EnrichedCart> {
  await connectDB();

  if (cartDoc.items.length === 0) {
    return {
      _id: cartDoc._id.toString(),
      cartToken: cartDoc.cartToken,
      userId: cartDoc.userId?.toString() || null,
      items: [],
      totals: computeCartTotals([]),
      itemCount: 0,
      hasOutOfStockItems: false,
      notices: [],
    };
  }

  const now = new Date();
  const activeCampaigns = await getActiveCampaigns(now);

  const variantIds = cartDoc.items.map((i) => i.variantId);
  const variants = await Variant.find({
    _id: { $in: variantIds },
    status: "ACTIVE",
  })
    .populate("productId", "name slug images status categoryId brandId gender basePricePaise")
    .lean();

  const variantMap = new Map<string, (typeof variants)[0]>();
  for (const v of variants) {
    variantMap.set(v._id.toString(), v);
  }

  const populatedItems: PopulatedCartItem[] = [];
  const notices: string[] = [];
  let hasOutOfStock = false;
  let totalCount = 0;
  let cartNeedsSave = false;

  for (const item of cartDoc.items) {
    const vId = item.variantId.toString();
    const v = variantMap.get(vId);

    if (!v) {
      // Variant no longer active or exists
      continue;
    }

    const p = v.productId as unknown as {
      _id?: mongoose.Types.ObjectId;
      name: string;
      slug: string;
      images: string[];
      categoryId?: unknown;
      brandId?: unknown;
      gender?: string;
      basePricePaise?: number;
    };

    // Canonical dynamic price resolution against active campaigns (Rule 1 & Rule 2)
    const resolved = resolvePrice(v, p, activeCampaigns, now);

    // Price drift & campaign lifecycle notice detection
    if (
      item.priceAtAdditionPaise !== undefined &&
      item.priceAtAdditionPaise !== resolved.finalPrice
    ) {
      if (
        item.campaignIdAtAddition &&
        item.campaignIdAtAddition !== resolved.appliedCampaignId
      ) {
        notices.push(
          `Price updated: the ${item.campaignNameAtAddition || "promotional sale"} has ended.`,
        );
      } else if (
        resolved.appliedCampaignId &&
        resolved.appliedCampaignId !== item.campaignIdAtAddition
      ) {
        notices.push(
          `Price updated: ${resolved.appliedCampaignName || "A new promotion"} is now active.`,
        );
      } else {
        notices.push(`Price updated for ${p?.name || "an item in your bag"}.`);
      }
      item.priceAtAdditionPaise = resolved.finalPrice;
      item.campaignIdAtAddition = resolved.appliedCampaignId;
      item.campaignNameAtAddition = resolved.appliedCampaignName;
      cartNeedsSave = true;
    } else if (item.priceAtAdditionPaise === undefined) {
      item.priceAtAdditionPaise = resolved.finalPrice;
      item.campaignIdAtAddition = resolved.appliedCampaignId;
      item.campaignNameAtAddition = resolved.appliedCampaignName;
      cartNeedsSave = true;
    }

    let optionsRecord: Record<string, string> = {};
    if (v.options instanceof Map) {
      optionsRecord = Object.fromEntries(v.options);
    } else if (v.options && typeof v.options === "object") {
      optionsRecord = v.options as Record<string, string>;
    }

    const availableStock = v.stock ?? 0;
    const isAvailable = availableStock >= item.quantity && availableStock > 0;
    if (!isAvailable) hasOutOfStock = true;

    const displayImage =
      (v.images && v.images[0]) || (p?.images && p.images[0]) || "/images/placeholder.jpg";

    const lineTotalPaise = resolved.finalPrice * item.quantity;
    totalCount += item.quantity;

    populatedItems.push({
      variantId: vId,
      productId: v.productId
        ? (v.productId as { _id?: mongoose.Types.ObjectId })._id?.toString() || ""
        : "",
      productName: p?.name || "Apparel Item",
      productSlug: p?.slug || "",
      sku: v.sku,
      basePricePaise: resolved.basePrice,
      pricePaise: resolved.finalPrice,
      compareAtPricePaise: resolved.compareAtPrice,
      discountPercent: resolved.discountPercent,
      appliedCampaignId: resolved.appliedCampaignId,
      appliedCampaignName: resolved.appliedCampaignName,
      badgeLabel: resolved.badgeLabel,
      options: optionsRecord,
      image: displayImage,
      quantity: item.quantity,
      stockAvailable: availableStock,
      isAvailable,
      lineTotalPaise,
    });
  }

  if (cartNeedsSave) {
    try {
      await cartDoc.save();
    } catch (saveErr) {
      console.warn("Non-critical: Failed to save updated cart addition snapshots:", saveErr);
    }
  }

  const totals = computeCartTotals(populatedItems);

  return {
    _id: cartDoc._id.toString(),
    cartToken: cartDoc.cartToken,
    userId: cartDoc.userId?.toString() || null,
    items: populatedItems,
    totals,
    itemCount: totalCount,
    hasOutOfStockItems: hasOutOfStock,
    notices: Array.from(new Set(notices)),
  };
}
