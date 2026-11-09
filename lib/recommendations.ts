import mongoose from "mongoose";
import { connectDB } from "./db";
import { Product } from "@/models/Product";
import { Variant, type IVariant } from "@/models/Variant";
import { Order } from "@/models/Order";
import { Brand } from "@/models/Brand";
import { Category } from "@/models/Category";
import { resolvePrice, getActiveCampaigns } from "./pricing";
import { getColorHex } from "./collections";
import type { CatalogProductItem } from "./catalog";

export interface PersonalizedRecommendationOptions {
  currentProductId?: string;
  currentSlug?: string;
  categoryId?: string;
  gender?: "MEN" | "KIDS";
  basePricePaise?: number;
  name?: string;
  description?: string;
  userId?: string | null;
  recentSlugs?: string[];
  limit?: number;
}

export interface FormattedProductInput {
  _id: mongoose.Types.ObjectId | string;
  name: string;
  slug: string;
  description: string;
  gender: "MEN" | "KIDS";
  type: "SIMPLE" | "VARIABLE";
  basePricePaise: number;
  status?: "ACTIVE" | "DRAFT";
  createdAt?: Date | string;
  images?: string[];
  productAttributes?: Array<{
    name: string;
    values: string[];
  }>;
  brandId?: unknown;
  categoryId?: unknown;
  recommendationReason?: string;
}

/**
 * Transforms an array of Mongoose Product lean documents + their variants into CatalogProductItem
 * with canonical server-computed prices (Rule 1 & Rule 2).
 */
export async function formatCatalogItems(
  products: FormattedProductInput[],
): Promise<CatalogProductItem[]> {
  if (products.length === 0) return [];

  const productIds = products.map((p) => p._id);
  const variants = await Variant.find({
    productId: { $in: productIds },
    status: "ACTIVE",
  }).lean();

  const variantsByProduct = new Map<string, IVariant[]>();
  for (const v of variants) {
    const pId = v.productId.toString();
    const list = variantsByProduct.get(pId) || [];
    list.push(v as unknown as IVariant);
    variantsByProduct.set(pId, list);
  }

  const activeCampaigns = await getActiveCampaigns();
  const catalogItems: CatalogProductItem[] = [];

  for (const product of products) {
    const pIdStr = product._id.toString();
    const pVariants = variantsByProduct.get(pIdStr) || [];

    const sizeSet = new Set<string>();
    const colorSet = new Set<string>();
    let totalStock = 0;
    let compareAtPrice: number | undefined;

    for (const v of pVariants) {
      totalStock += v.stock || 0;
      if (
        v.compareAtPricePaise &&
        (!compareAtPrice || v.compareAtPricePaise > compareAtPrice)
      ) {
        compareAtPrice = v.compareAtPricePaise;
      }

      if (v.options instanceof Map) {
        const s = v.options.get("Size");
        const c = v.options.get("Color");
        if (s) sizeSet.add(s);
        if (c) colorSet.add(c);
      } else if (v.options && typeof v.options === "object") {
        const opt = v.options as Record<string, string>;
        if (opt.Size) sizeSet.add(opt.Size);
        if (opt.Color) colorSet.add(opt.Color);
      }
    }

    // Inspect productAttributes if variant options didn't populate colors or sizes
    if (product.productAttributes && Array.isArray(product.productAttributes)) {
      for (const attr of product.productAttributes) {
        if (attr.name && attr.name.toLowerCase() === "color" && Array.isArray(attr.values)) {
          for (const val of attr.values) colorSet.add(val);
        }
        if (attr.name && attr.name.toLowerCase() === "size" && Array.isArray(attr.values)) {
          for (const val of attr.values) sizeSet.add(val);
        }
      }
    }

    // Skip products that have zero stock or are inactive
    if (totalStock <= 0) {
      continue;
    }

    // Pick primary variant (default first, then first variant)
    const primaryVariant =
      pVariants.find((v) => v.isDefault) || pVariants[0] || null;

    const priceableVariant = primaryVariant
      ? {
          pricePaise: primaryVariant.pricePaise,
          compareAtPricePaise: primaryVariant.compareAtPricePaise,
        }
      : {
          pricePaise: product.basePricePaise,
          compareAtPricePaise: compareAtPrice,
        };

    const pricing = resolvePrice(priceableVariant, product, activeCampaigns);

    const productImages = (product.images || []).filter(
      (img) => Boolean(img) && !img.includes("simulated_"),
    );
    const firstImage = productImages[0] || "/images/placeholder.jpg";
    const secondImage = productImages[1] || firstImage;

    const brandObj =
      product.brandId && typeof product.brandId === "object"
        ? (product.brandId as Record<string, unknown>)
        : null;
    const brandData =
      brandObj && typeof brandObj.name === "string"
        ? {
            _id: String(brandObj._id || ""),
            name: brandObj.name,
            slug: typeof brandObj.slug === "string" ? brandObj.slug : "",
          }
        : undefined;

    const categoryObj =
      product.categoryId && typeof product.categoryId === "object"
        ? (product.categoryId as Record<string, unknown>)
        : null;
    const categoryData =
      categoryObj && typeof categoryObj.name === "string"
        ? {
            _id: String(categoryObj._id || ""),
            name: categoryObj.name,
            slug: typeof categoryObj.slug === "string" ? categoryObj.slug : "",
          }
        : undefined;

    const colorSwatches = Array.from(colorSet).map((name) => ({
      name,
      hex: getColorHex(name),
    }));

    const mappedVariants = pVariants.map((v) => {
      let opt: Record<string, string> = {};
      if (v.options instanceof Map) {
        opt = Object.fromEntries(v.options);
      } else if (v.options && typeof v.options === "object") {
        opt = v.options as Record<string, string>;
      }

      return {
        _id: v._id.toString(),
        sku: v.sku,
        pricePaise: v.pricePaise,
        compareAtPricePaise: v.compareAtPricePaise,
        stock: v.stock,
        options: opt,
        pricing: resolvePrice(v, product, activeCampaigns),
      };
    });

    catalogItems.push({
      _id: pIdStr,
      name: product.name,
      slug: product.slug,
      description: product.description,
      gender: product.gender,
      type: product.type,
      basePricePaise: product.basePricePaise,
      compareAtPricePaise: compareAtPrice,
      pricing,
      createdAt: product.createdAt ? new Date(product.createdAt).toISOString() : undefined,
      firstImage,
      secondImage,
      images: productImages.length > 0 ? productImages : [firstImage],
      brand: brandData,
      category: categoryData,
      colorSwatches,
      availableSizes: Array.from(sizeSet),
      availableColors: Array.from(colorSet),
      variants: mappedVariants,
      totalStock,
      hasStock: totalStock > 0,
      recommendationReason: product.recommendationReason || "Curated For You",
    });
  }

  return catalogItems;
}

/**
 * Intelligent Personalized Recommendations Engine:
 * Combines customer purchase history, past category frequencies, price affinity,
 * recent browsing behavior, and content similarity to recommend relevant products.
 */
export async function getPersonalizedSimilarProducts(
  options: PersonalizedRecommendationOptions,
): Promise<CatalogProductItem[]> {
  await connectDB();
  void Brand;
  void Category;

  const {
    currentProductId,
    currentSlug,
    categoryId,
    gender,
    basePricePaise = 199900,
    name = "",
    description = "",
    userId,
    recentSlugs = [],
    limit = 8,
  } = options;

  // 1. Analyze authenticated customer profile & past order patterns
  const userCategoryPurchases = new Map<string, number>();
  const userGenderPurchases = { MEN: 0, KIDS: 0 };
  const purchasedProductIds = new Set<string>();
  let userSpendSum = 0;
  let userTotalItems = 0;

  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    try {
      const pastOrders = await Order.find({
        customerId: new mongoose.Types.ObjectId(userId),
        status: { $nin: ["CANCELLED"] },
      })
        .select("items")
        .lean();

      const pastProductIds: mongoose.Types.ObjectId[] = [];
      for (const ord of pastOrders) {
        if (!Array.isArray(ord.items)) continue;
        for (const item of ord.items) {
          if (item.productId) {
            const pidStr = item.productId.toString();
            purchasedProductIds.add(pidStr);
            pastProductIds.push(item.productId as mongoose.Types.ObjectId);
            userSpendSum += item.finalPricePaise || item.priceSnapshotPaise || item.basePricePaise || 0;
            userTotalItems += item.qty || 1;
          }
        }
      }

      if (pastProductIds.length > 0) {
        const boughtProducts = await Product.find({ _id: { $in: pastProductIds } })
          .select("categoryId gender")
          .lean();

        for (const bp of boughtProducts) {
          const cId = bp.categoryId?.toString();
          if (cId) {
            userCategoryPurchases.set(cId, (userCategoryPurchases.get(cId) || 0) + 1);
          }
          if (bp.gender === "MEN" || bp.gender === "KIDS") {
            userGenderPurchases[bp.gender] += 1;
          }
        }
      }
    } catch (err) {
      console.warn("Failed to retrieve user purchase patterns:", err);
    }
  }

  // 2. Analyze recent browsing signals (guest or logged-in)
  const userBrowsingCategories = new Map<string, number>();
  const userBrowsingGenders = { MEN: 0, KIDS: 0 };
  const filteredRecentSlugs = recentSlugs.filter(
    (s) => Boolean(s) && s !== currentSlug,
  );

  if (filteredRecentSlugs.length > 0) {
    try {
      const recentProducts = await Product.find({
        slug: { $in: filteredRecentSlugs },
        status: "ACTIVE",
        deletedAt: null,
      })
        .select("categoryId gender")
        .lean();

      for (const rp of recentProducts) {
        const cId = rp.categoryId?.toString();
        if (cId) {
          userBrowsingCategories.set(cId, (userBrowsingCategories.get(cId) || 0) + 1);
        }
        if (rp.gender === "MEN" || rp.gender === "KIDS") {
          userBrowsingGenders[rp.gender] += 1;
        }
      }
    } catch (err) {
      console.warn("Failed to retrieve recent browsing patterns:", err);
    }
  }

  // 3. Fetch candidate products from catalog excluding current product
  const query: Record<string, unknown> = { status: "ACTIVE", deletedAt: null };
  if (currentProductId && mongoose.Types.ObjectId.isValid(currentProductId)) {
    query._id = { $ne: new mongoose.Types.ObjectId(currentProductId) };
  } else if (currentSlug) {
    query.slug = { $ne: currentSlug };
  }

  const rawCandidates = await Product.find(query)
    .populate("brandId", "name slug")
    .populate("categoryId", "name slug")
    .limit(40)
    .lean();

  if (rawCandidates.length === 0) {
    return [];
  }

  const targetCategoryId = categoryId?.toString();
  const targetGender = gender || (userGenderPurchases.KIDS > userGenderPurchases.MEN ? "KIDS" : "MEN");
  const targetSpendPaise =
    userTotalItems > 0 ? Math.round(userSpendSum / userTotalItems) : basePricePaise;

  const currentTokens = `${name} ${description}`
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length >= 4);

  // 4. Score each candidate based on personalization + content similarity
  interface ScoredCandidate {
    product: (typeof rawCandidates)[0];
    score: number;
    reason: string;
  }

  const scoredCandidates: ScoredCandidate[] = rawCandidates.map((candidate) => {
    let score = 0;
    let reason = "Curated Atelier Pick";
    const candCatId = candidate.categoryId?._id
      ? (candidate.categoryId as { _id: { toString: () => string } })._id.toString()
      : candidate.categoryId?.toString();

    // Baseline 1: Same category
    const isSameCategory = Boolean(candCatId && candCatId === targetCategoryId);
    if (isSameCategory) {
      score += 40;
      reason = "Similar Silhouette";
    }

    // Baseline 2: Same gender
    const isSameGender = candidate.gender === targetGender;
    if (isSameGender) {
      score += 25;
    } else {
      score -= 20; // Penalize cross-gender recommendations
    }

    // Personalization 1: Customer past purchase history
    if (candCatId && userCategoryPurchases.has(candCatId)) {
      const purchases = userCategoryPurchases.get(candCatId) || 0;
      score += Math.min(35, purchases * 12);
      reason = "Tailored to Your Wardrobe";
    }

    if (userGenderPurchases[candidate.gender] > 0) {
      score += 15;
    }

    // Personalization 2: Guest/User browsing pattern
    if (candCatId && userBrowsingCategories.has(candCatId)) {
      score += 20;
      if (reason === "Curated Atelier Pick") {
        reason = "Based on Recent Browsing";
      }
    }

    // Price Proximity
    if (targetSpendPaise > 0) {
      const priceDiffRatio =
        Math.abs(candidate.basePricePaise - targetSpendPaise) / targetSpendPaise;
      if (priceDiffRatio <= 0.25) {
        score += 18;
      } else if (priceDiffRatio <= 0.5) {
        score += 10;
      }
    }

    // Keyword & Style token affinity
    const candidateTokens = `${candidate.name} ${candidate.description}`.toLowerCase();
    let tokenMatches = 0;
    for (const tok of currentTokens) {
      if (candidateTokens.includes(tok)) {
        tokenMatches++;
      }
    }
    score += Math.min(25, tokenMatches * 5);

    // Complementary categories (e.g. Pants + Shirts or Traditional Sets)
    if (!isSameCategory && isSameGender) {
      score += 15;
      if (reason === "Curated Atelier Pick") {
        reason = "Complements Your Look";
      }
    }

    // Discovery penalty: Don't repeatedly push products the customer already owns
    if (purchasedProductIds.has(candidate._id.toString())) {
      score -= 25;
    }

    return {
      product: candidate,
      score,
      reason,
    };
  });

  // Sort descending by score
  scoredCandidates.sort((a, b) => b.score - a.score);

  // Take top candidates
  const topCandidates = scoredCandidates.slice(0, limit);

  // Map to format
  const mappedProducts = topCandidates.map((sc) => ({
    ...sc.product,
    recommendationReason: sc.reason,
  }));

  // Resolve variants, canonical prices & return
  return await formatCatalogItems(
    mappedProducts as unknown as FormattedProductInput[],
  );
}

/**
 * Retrieves products corresponding to a list of recently viewed slugs,
 * preserving chronological browsing order (most recent first).
 */
export async function getRecentlyViewedProducts(options: {
  slugs: string[];
  excludeSlug?: string;
  limit?: number;
}): Promise<CatalogProductItem[]> {
  await connectDB();
  void Brand;
  void Category;

  const { slugs, excludeSlug, limit = 8 } = options;

  if (!slugs || slugs.length === 0) {
    return [];
  }

  // Filter out excludeSlug and duplicates while preserving order
  const orderedSlugs: string[] = [];
  const seen = new Set<string>();

  for (const s of slugs) {
    const clean = s.trim().toLowerCase();
    if (!clean) continue;
    if (excludeSlug && clean === excludeSlug.toLowerCase()) continue;
    if (!seen.has(clean)) {
      seen.add(clean);
      orderedSlugs.push(clean);
    }
    if (orderedSlugs.length >= limit) break;
  }

  if (orderedSlugs.length === 0) {
    return [];
  }

  const rawProducts = await Product.find({
    slug: { $in: orderedSlugs },
    status: "ACTIVE",
    deletedAt: null,
  })
    .populate("brandId", "name slug")
    .populate("categoryId", "name slug")
    .lean();

  // Create slug lookup
  const productBySlug = new Map<string, (typeof rawProducts)[0]>();
  for (const p of rawProducts) {
    productBySlug.set(p.slug.toLowerCase(), p);
  }

  // Maintain chronological order
  const orderedProducts = orderedSlugs
    .map((s) => productBySlug.get(s))
    .filter(Boolean) as (typeof rawProducts)[0][];

  return await formatCatalogItems(
    orderedProducts as unknown as FormattedProductInput[],
  );
}
