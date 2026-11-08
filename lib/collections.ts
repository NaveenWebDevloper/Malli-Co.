import mongoose, { type PipelineStage } from "mongoose";
import { connectDB } from "./db.ts";
import { Collection, type ICollection, type CollectionAutoRuleType } from "../models/Collection.ts";
import { Product } from "../models/Product.ts";
import { Variant } from "../models/Variant.ts";
import { Order } from "../models/Order.ts";
import { Brand } from "../models/Brand.ts";
import { Category } from "../models/Category.ts";
import { resolvePrice, getActiveCampaigns, type ResolvedPriceResult } from "./pricing.ts";

export interface CollectionProductItem {
  _id: string;
  name: string;
  slug: string;
  description: string;
  gender: "MEN" | "KIDS";
  firstImage: string;
  secondImage: string;
  brand?: {
    _id: string;
    name: string;
    slug: string;
  };
  category?: {
    _id: string;
    name: string;
    slug: string;
  };
  colorSwatches: Array<{
    name: string;
    hex: string;
  }>;
  availableSizes: string[];
  totalStock: number;
  hasStock: boolean;
  pricing: ResolvedPriceResult;
}

export interface ResolvedCollectionResult {
  _id: string;
  name: string;
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  bannerImageUrl?: string;
  mode: "MANUAL" | "AUTO";
  autoRule?: ICollection["autoRule"];
  maxItems: number;
  active: boolean;
  products: CollectionProductItem[];
  totalResolved: number;
}

const COLOR_HEX_MAP: Record<string, string> = {
  "navy blue": "#1A2B4C",
  navy: "#1A2B4C",
  "olive green": "#556B2F",
  olive: "#556B2F",
  burgundy: "#800020",
  white: "#FFFFFF",
  black: "#111111",
  charcoal: "#36454F",
  grey: "#808080",
  gray: "#808080",
  beige: "#D4C4A8",
  cream: "#F9F6EE",
  sand: "#C2B280",
  khaki: "#C3B091",
  brown: "#5C4033",
  terracotta: "#E2725B",
  rust: "#B7410E",
  "forest green": "#228B22",
  sage: "#9CAF88",
  "sky blue": "#87CEEB",
  linen: "#FAF0E6",
  natural: "#EFEBD9",
  ivory: "#FFFFF0",
  mustard: "#E1AD01",
  emerald: "#50C878",
  tan: "#D2B48C",
  clay: "#B66A50",
  espresso: "#362B28",
};

export function getColorHex(colorName: string): string {
  const normalized = colorName.trim().toLowerCase();
  return COLOR_HEX_MAP[normalized] || "#A39783";
}

// In-memory cache for Bestsellers aggregation (TTL: 1 hour)
interface BestsellerCacheEntry {
  timestamp: number;
  productIds: string[];
}

const bestsellersCache = new Map<string, BestsellerCacheEntry>();
const BESTSELLERS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export function clearBestsellersCache(): void {
  bestsellersCache.clear();
}

/**
 * Aggregates units sold in the last 30 days from real PAID orders.
 * Leverages the compound index: { paymentStatus: 1, createdAt: -1 }.
 * Results are cached in-memory for 1 hour per rule scope.
 */
export async function get30DayBestsellerProductIds(options: {
  gender?: "MEN" | "KIDS";
  categoryId?: string | mongoose.Types.ObjectId;
  limit?: number;
}): Promise<string[]> {
  const cacheKey = `${options.gender || "ALL"}_${options.categoryId?.toString() || "ALL"}`;
  const now = Date.now();
  const cached = bestsellersCache.get(cacheKey);

  if (cached && now - cached.timestamp < BESTSELLERS_CACHE_TTL_MS) {
    return cached.productIds;
  }

  await connectDB();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  // Aggregation over PAID orders in the last 30 days
  const pipeline: PipelineStage[] = [
    {
      $match: {
        paymentStatus: "PAID",
        createdAt: { $gte: thirtyDaysAgo },
      },
    },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productId",
        unitsSold: { $sum: "$items.qty" },
      },
    },
    { $sort: { unitsSold: -1 } },
    { $limit: 100 },
  ];

  const results = await Order.aggregate(pipeline);
  const productIds = results.map((r: { _id: { toString: () => string } }) => r._id.toString());

  bestsellersCache.set(cacheKey, {
    timestamp: now,
    productIds,
  });

  return productIds;
}

interface CollectionLike {
  _id?: unknown;
  name: string;
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  bannerImageUrl?: string;
  mode: "MANUAL" | "AUTO";
  productIds?: Array<unknown>;
  autoRule?: ICollection["autoRule"];
  maxItems?: number;
  active: boolean;
}

/**
 * Resolves a collection and its products with prices calculated via lib/pricing.ts.
 * Only ACTIVE products with stock (>0) are included; DRAFT and zero-stock items are omitted.
 */
export async function getCollectionBySlug(
  slug: string,
): Promise<ResolvedCollectionResult | null> {
  try {
    await connectDB();
    const collection = await Collection.findOne({
      slug: slug.toLowerCase().trim(),
      active: true,
    }).lean();

    if (!collection) return null;
    return resolveCollectionProducts(collection);
  } catch (error) {
    console.error(`Error resolving collection ${slug}:`, error);
    return null;
  }
}

export async function resolveCollectionProducts(
  collection: CollectionLike,
  options: { now?: Date; previewMax?: number; filter?: string } = {},
): Promise<ResolvedCollectionResult> {
  await connectDB();
  const now = options.now || new Date();
  const maxItems = options.previewMax || collection.maxItems || 10;
  const activeCampaigns = await getActiveCampaigns(now);

  let candidateProductIds: string[] = [];

  if (collection.mode === "MANUAL") {
    // Preserve manual ordering
    candidateProductIds = (collection.productIds || []).map((id: unknown) =>
      typeof id === "object" && id !== null && "toString" in id
        ? (id as { toString: () => string }).toString()
        : String(id),
    );
  } else if (collection.mode === "AUTO") {
    const autoRule = collection.autoRule || { type: "BESTSELLERS" };
    const ruleType: CollectionAutoRuleType = autoRule.type || "BESTSELLERS";

    const baseFilter: Record<string, unknown> = { status: "ACTIVE" };
    if (autoRule.gender) baseFilter.gender = autoRule.gender;
    if (autoRule.categoryId) baseFilter.categoryId = autoRule.categoryId;

    if (ruleType === "BESTSELLERS") {
      const bestSellerIds = await get30DayBestsellerProductIds({
        gender: autoRule.gender,
        categoryId: autoRule.categoryId,
        limit: maxItems * 2,
      });

      // Also get newest active products as fallback/supplement if sales volume is low
      const fallbackProducts = await Product.find(baseFilter)
        .sort({ createdAt: -1 })
        .limit(maxItems * 3)
        .select("_id")
        .lean();

      const combinedIds = new Set<string>();
      for (const id of bestSellerIds) combinedIds.add(id);
      for (const p of fallbackProducts) combinedIds.add(p._id.toString());

      candidateProductIds = Array.from(combinedIds);
    } else if (ruleType === "NEWEST") {
      const newestProducts = await Product.find(baseFilter)
        .sort({ createdAt: -1 })
        .limit(maxItems * 3)
        .select("_id")
        .lean();

      candidateProductIds = newestProducts.map((p) => p._id.toString());
    } else if (ruleType === "ON_SALE") {
      // For ON_SALE: fetch candidate active products and resolve prices below
      const activeProducts = await Product.find(baseFilter)
        .sort({ updatedAt: -1 })
        .limit(maxItems * 4)
        .select("_id")
        .lean();

      candidateProductIds = activeProducts.map((p) => p._id.toString());
    }
  }

  if (candidateProductIds.length === 0) {
    return {
      _id: collection._id ? String(collection._id) : "",
      name: collection.name,
      slug: collection.slug,
      title: collection.title,
      subtitle: collection.subtitle,
      description: collection.description,
      bannerImageUrl: collection.bannerImageUrl,
      mode: collection.mode,
      autoRule: collection.autoRule,
      maxItems,
      active: collection.active,
      products: [],
      totalResolved: 0,
    };
  }

  // Fetch candidate products with populated brand and category
  const validObjectIds = candidateProductIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  // Ensure Mongoose models are registered for populate
  void Brand;
  void Category;

  const rawProducts = await Product.find({
    _id: { $in: validObjectIds },
    status: "ACTIVE", // Only ACTIVE products (skip DRAFT)
  })
    .populate("brandId", "name slug")
    .populate("categoryId", "name slug")
    .lean();

  if (rawProducts.length === 0) {
    return {
      _id: collection._id ? String(collection._id) : "",
      name: collection.name,
      slug: collection.slug,
      title: collection.title,
      subtitle: collection.subtitle,
      description: collection.description,
      bannerImageUrl: collection.bannerImageUrl,
      mode: collection.mode,
      autoRule: collection.autoRule,
      maxItems,
      active: collection.active,
      products: [],
      totalResolved: 0,
    };
  }

  // Fetch variants for all candidate products
  const productMongoIds = rawProducts.map((p) => p._id);
  const rawVariants = await Variant.find({
    productId: { $in: productMongoIds },
    status: "ACTIVE",
  }).lean();

  const variantsByProductId = new Map<string, typeof rawVariants>();
  for (const v of rawVariants) {
    const pid = v.productId.toString();
    const list = variantsByProductId.get(pid) || [];
    list.push(v);
    variantsByProductId.set(pid, list);
  }

  // Build resolved product items
  const resolvedMap = new Map<string, CollectionProductItem>();

  for (const product of rawProducts) {
    const pId = product._id.toString();
    const pVariants = variantsByProductId.get(pId) || [];

    // Calculate total stock across variants
    let totalStock = 0;
    const sizeSet = new Set<string>();
    const colorSet = new Set<string>();
    let primaryVariant: (typeof rawVariants)[0] | null = null;

    for (const v of pVariants) {
      const stock = typeof v.stock === "number" ? v.stock : 0;
      totalStock += stock;

      if (!primaryVariant || v.isDefault) {
        primaryVariant = v;
      }

      // Extract colors & sizes from options Map/Record
      if (v.options instanceof Map) {
        const size = v.options.get("Size");
        const color = v.options.get("Color");
        if (size) sizeSet.add(size);
        if (color) colorSet.add(color);
      } else if (v.options && typeof v.options === "object") {
        const opt = v.options as Record<string, string>;
        if (opt.Size) sizeSet.add(opt.Size);
        if (opt.Color) colorSet.add(opt.Color);
      }
    }

    // Also inspect productAttributes for colors if none found in variants
    if (product.productAttributes && Array.isArray(product.productAttributes)) {
      for (const attr of product.productAttributes) {
        if (attr.name && attr.name.toLowerCase() === "color" && Array.isArray(attr.values)) {
          for (const val of attr.values) {
            colorSet.add(val);
          }
        }
        if (attr.name && attr.name.toLowerCase() === "size" && Array.isArray(attr.values)) {
          for (const val of attr.values) {
            sizeSet.add(val);
          }
        }
      }
    }

    // SKIP out of stock products (totalStock <= 0)
    if (totalStock <= 0) {
      continue;
    }

    // Resolve canonical price via lib/pricing.ts
    const priceableVariant = primaryVariant
      ? {
          pricePaise: primaryVariant.pricePaise,
          compareAtPricePaise: primaryVariant.compareAtPricePaise,
        }
      : {
          pricePaise: product.basePricePaise,
        };

    const pricing = resolvePrice(priceableVariant, product, activeCampaigns, now);

    // Extract first and second image
    const productImages = product.images || [];
    const firstImage = productImages[0] || "/images/placeholder.jpg";
    const secondImage = productImages[1] || firstImage;

    // Brand and category formatting
    const brandData =
      product.brandId && typeof product.brandId === "object" && "name" in product.brandId
        ? {
            _id: (product.brandId as unknown as { _id: { toString: () => string } })._id.toString(),
            name: (product.brandId as unknown as { name: string }).name,
            slug: (product.brandId as unknown as { slug: string }).slug,
          }
        : undefined;

    const categoryData =
      product.categoryId && typeof product.categoryId === "object" && "name" in product.categoryId
        ? {
            _id: (product.categoryId as unknown as { _id: { toString: () => string } })._id.toString(),
            name: (product.categoryId as unknown as { name: string }).name,
            slug: (product.categoryId as unknown as { slug: string }).slug,
          }
        : undefined;

    const colorSwatches = Array.from(colorSet).map((name) => ({
      name,
      hex: getColorHex(name),
    }));

    resolvedMap.set(pId, {
      _id: pId,
      name: product.name,
      slug: product.slug,
      description: product.description,
      gender: product.gender,
      firstImage,
      secondImage,
      brand: brandData,
      category: categoryData,
      colorSwatches,
      availableSizes: Array.from(sizeSet),
      totalStock,
      hasStock: totalStock > 0,
      pricing,
    });
  }

  let finalProducts: CollectionProductItem[] = [];

  if (collection.mode === "MANUAL") {
    // Preserve exact manual ordering
    for (const id of candidateProductIds) {
      const item = resolvedMap.get(id);
      if (item) {
        finalProducts.push(item);
      }
    }
  } else if (collection.mode === "AUTO") {
    const ruleType = collection.autoRule?.type || "BESTSELLERS";

    if (ruleType === "ON_SALE") {
      // Only keep products with active discounts, sorted by discount percentage desc
      const onSaleItems: CollectionProductItem[] = [];
      for (const item of resolvedMap.values()) {
        if (item.pricing.discountPercent > 0) {
          onSaleItems.push(item);
        }
      }
      onSaleItems.sort((a, b) => b.pricing.discountPercent - a.pricing.discountPercent);
      finalProducts = onSaleItems;
    } else {
      // For BESTSELLERS and NEWEST, preserve candidateProductIds order
      for (const id of candidateProductIds) {
        const item = resolvedMap.get(id);
        if (item && !finalProducts.some((p) => p._id === item._id)) {
          finalProducts.push(item);
        }
      }
    }
  }

  // Apply category/gender filter if requested
  let filteredProducts = finalProducts;
  if (options.filter && options.filter !== "all") {
    const f = options.filter.toLowerCase().trim();
    if (f === "men" || f === "mens-wear") {
      filteredProducts = finalProducts.filter((p) => p.gender === "MEN");
    } else if (f === "kids" || f === "kids-wear") {
      filteredProducts = finalProducts.filter((p) => p.gender === "KIDS");
    } else if (f === "casual" || f === "casual-wear") {
      filteredProducts = finalProducts.filter((p) => {
        const text = `${p.name} ${p.category?.name || ""} ${p.description}`.toLowerCase();
        return (
          text.includes("casual") ||
          text.includes("shirt") ||
          text.includes("pant") ||
          text.includes("jean") ||
          text.includes("tee") ||
          text.includes("cotton")
        );
      });
    } else if (f === "traditional" || f === "traditional-wear") {
      filteredProducts = finalProducts.filter((p) => {
        const text = `${p.name} ${p.category?.name || ""} ${p.description}`.toLowerCase();
        return (
          text.includes("traditional") ||
          text.includes("festive") ||
          text.includes("kurta") ||
          text.includes("ethnic") ||
          text.includes("linen")
        );
      });
    }

    // If filtering left fewer than 3 items, supplement from active catalog matching that filter
    if (filteredProducts.length < 3) {
      const dbQuery: Record<string, unknown> = { status: "ACTIVE" };
      if (f === "men" || f === "mens-wear") dbQuery.gender = "MEN";
      if (f === "kids" || f === "kids-wear") dbQuery.gender = "KIDS";
      if (f === "casual" || f === "casual-wear") {
        dbQuery.$or = [
          { name: { $regex: "casual|shirt|pant|jean|tee", $options: "i" } },
          { description: { $regex: "casual|cotton|denim", $options: "i" } },
        ];
      }
      if (f === "traditional" || f === "traditional-wear") {
        dbQuery.$or = [
          { name: { $regex: "traditional|festive|kurta|linen", $options: "i" } },
          { description: { $regex: "traditional|festive|kurta|heritage", $options: "i" } },
        ];
      }

      const extraProducts = await Product.find(dbQuery)
        .populate("brandId", "name slug")
        .populate("categoryId", "name slug")
        .limit(maxItems)
        .lean();

      for (const p of extraProducts) {
        const pId = p._id.toString();
        if (!filteredProducts.some((item) => item._id === pId)) {
          const productVariants = await Variant.find({ productId: p._id }).lean();
          const primaryVariant = productVariants[0];
          const pricing = resolvePrice(
            primaryVariant
              ? { pricePaise: primaryVariant.pricePaise, compareAtPricePaise: primaryVariant.compareAtPricePaise }
              : { pricePaise: p.basePricePaise },
            p,
            activeCampaigns,
            now,
          );

          const populatedBrand =
            p.brandId && typeof p.brandId === "object" && "name" in p.brandId
              ? (p.brandId as unknown as { _id: { toString: () => string }; name: string; slug: string })
              : undefined;
          const populatedCat =
            p.categoryId && typeof p.categoryId === "object" && "name" in p.categoryId
              ? (p.categoryId as unknown as { _id: { toString: () => string }; name: string; slug: string })
              : undefined;

          filteredProducts.push({
            _id: pId,
            name: p.name,
            slug: p.slug,
            description: p.description,
            gender: p.gender,
            firstImage: p.images?.[0] || "/images/placeholder.jpg",
            secondImage: p.images?.[1] || p.images?.[0] || "/images/placeholder.jpg",
            brand: populatedBrand
              ? { _id: populatedBrand._id.toString(), name: populatedBrand.name, slug: populatedBrand.slug }
              : undefined,
            category: populatedCat
              ? { _id: populatedCat._id.toString(), name: populatedCat.name, slug: populatedCat.slug }
              : undefined,
            colorSwatches: [],
            availableSizes: ["S", "M", "L", "XL"],
            totalStock: 50,
            hasStock: true,
            pricing,
          });
        }
      }
    }
  }

  // Cap at maxItems
  const cappedProducts = (options.filter && options.filter !== "all" ? filteredProducts : finalProducts).slice(0, maxItems);

  return {
    _id: collection._id ? String(collection._id) : "",
    name: collection.name,
    slug: collection.slug,
    title: collection.title,
    subtitle: collection.subtitle,
    description: collection.description,
    bannerImageUrl: collection.bannerImageUrl,
    mode: collection.mode,
    autoRule: collection.autoRule,
    maxItems,
    active: collection.active,
    products: cappedProducts,
    totalResolved: cappedProducts.length,
  };
}
