import mongoose from "mongoose";
import { connectDB } from "./db.ts";
import { Product, type IProduct } from "../models/Product.ts";
import { Variant } from "../models/Variant.ts";
import { Brand } from "../models/Brand.ts";
import { Category } from "../models/Category.ts";
import { resolvePrice, getActiveCampaigns, type ResolvedPriceResult } from "./pricing.ts";
import { getColorHex } from "./collections.ts";

export interface CatalogFilterOptions {
  gender?: "MEN" | "KIDS";
  categorySlug?: string;
  brandSlug?: string;
  sizes?: string[];
  colors?: string[];
  minPricePaise?: number;
  maxPricePaise?: number;
  search?: string;
  sortBy?: "newest" | "price-asc" | "price-desc";
  page?: number;
  limit?: number;
}

export interface CatalogProductItem {
  _id: string;
  name: string;
  slug: string;
  description: string;
  gender: "MEN" | "KIDS";
  type: "SIMPLE" | "VARIABLE";
  basePricePaise: number;
  compareAtPricePaise?: number;
  pricing: ResolvedPriceResult;
  createdAt?: string;
  firstImage: string;
  secondImage: string;
  images: string[];
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
  availableColors: string[];
  variants?: Array<{
    _id: string;
    sku: string;
    pricePaise: number;
    compareAtPricePaise?: number;
    stock: number;
    options: Record<string, string>;
    pricing: ResolvedPriceResult;
  }>;
  totalStock: number;
  hasStock: boolean;
  recommendationReason?: string;
}

export interface CatalogResult {
  products: CatalogProductItem[];
  totalCount: number;
  page: number;
  totalPages: number;
  filterFacets: {
    sizes: string[];
    colors: string[];
    brands: { name: string; slug: string; count: number }[];
    categories: { name: string; slug: string; count: number }[];
    minPricePaise: number;
    maxPricePaise: number;
  };
}

/**
 * Queries catalog products with multi-dimensional filtering, facets, and sorting.
 */
export async function getCatalogProducts(
  options: CatalogFilterOptions = {},
): Promise<CatalogResult> {
  if (!process.env.MONGODB_URI && !process.env.MONGODB_DIRECT_URI) {
    return {
      products: [],
      totalCount: 0,
      page: 1,
      totalPages: 1,
      filterFacets: {
        sizes: ["S", "M", "L", "XL", "XXL"],
        colors: ["Navy Blue", "Olive Green", "Burgundy", "White"],
        brands: [],
        categories: [],
        minPricePaise: 99900,
        maxPricePaise: 999900,
      },
    };
  }

  try {
    await connectDB();
  } catch (err) {
    console.warn("[Catalog] DB connection unavailable, returning empty catalog fallback:", err);
    return {
      products: [],
      totalCount: 0,
      page: 1,
      totalPages: 1,
      filterFacets: {
        sizes: ["S", "M", "L", "XL", "XXL"],
        colors: ["Navy Blue", "Olive Green", "Burgundy", "White"],
        brands: [],
        categories: [],
        minPricePaise: 99900,
        maxPricePaise: 999900,
      },
    };
  }

  // Pre-fetch active promotion campaigns for server-side pricing resolution
  const activeCampaigns = await getActiveCampaigns();

  // Ensure related models are registered
  void Brand;
  void Category;
  void Variant;

  const {
    gender,
    categorySlug,
    brandSlug,
    sizes = [],
    colors = [],
    minPricePaise,
    maxPricePaise,
    search,
    sortBy = "newest",
    page = 1,
    limit = 12,
  } = options;

  const query: mongoose.FilterQuery<IProduct> = { status: "ACTIVE" };

  if (gender) {
    query.gender = gender;
  }

  // Filter by category slug
  if (categorySlug) {
    const normalized = categorySlug.toLowerCase().trim();
    const categoryDoc = await Category.findOne({ slug: normalized, isActive: true }).lean();
    if (categoryDoc) {
      // Also include subcategories if parent
      const subcategories = await Category.find({ parentId: categoryDoc._id, isActive: true }).lean();
      const catIds = [categoryDoc._id, ...subcategories.map((c) => c._id)];
      query.categoryId = { $in: catIds };
    } else {
      // Smart umbrella/alias category resolution
      let catRegex: RegExp | null = null;
      if (/^(?:mens?[-_]?)?shirts?$/i.test(normalized)) {
        catRegex = /shirt/i;
      } else if (/^(?:mens?[-_]?)?t[-_]?shirts?$|^tshirts?$/i.test(normalized)) {
        catRegex = /t[-_]?shirt|tee/i;
      } else if (/^(?:mens?[-_]?)?jeans?$/i.test(normalized)) {
        catRegex = /jean/i;
      } else if (/^(?:mens?[-_]?)?pants?$|trousers?$/i.test(normalized)) {
        catRegex = /pant|trouser/i;
      }

      if (catRegex) {
        const matchingCategories = await Category.find({
          $or: [{ slug: catRegex }, { name: catRegex }],
          isActive: true,
        }).lean();

        if (matchingCategories.length > 0) {
          query.categoryId = { $in: matchingCategories.map((c) => c._id) };
        } else {
          query.$or = [
            { name: { $regex: normalized.replace(/[-_]/g, " "), $options: "i" } },
            { description: { $regex: normalized.replace(/[-_]/g, " "), $options: "i" } },
          ];
        }
      }
    }
  }

  // Filter by brand slug
  if (brandSlug) {
    const brandDoc = await Brand.findOne({ slug: brandSlug, isActive: true }).lean();
    if (brandDoc) {
      query.brandId = brandDoc._id;
    }
  }

  // Price range filters
  if (minPricePaise !== undefined || maxPricePaise !== undefined) {
    query.basePricePaise = {};
    if (minPricePaise !== undefined) query.basePricePaise.$gte = minPricePaise;
    if (maxPricePaise !== undefined) query.basePricePaise.$lte = maxPricePaise;
  }

  // Search keyword
  if (search && search.trim()) {
    query.$or = [
      { name: { $regex: search.trim(), $options: "i" } },
      { description: { $regex: search.trim(), $options: "i" } },
    ];
  }

  // Sorting
  let sortObj: Record<string, 1 | -1> = { createdAt: -1 };
  if (sortBy === "price-asc") {
    sortObj = { basePricePaise: 1 };
  } else if (sortBy === "price-desc") {
    sortObj = { basePricePaise: -1 };
  }

  const skip = (page - 1) * limit;

  // 1. Fetch matching products
  const [products, totalCount] = await Promise.all([
    Product.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .populate("brandId", "name slug")
      .populate("categoryId", "name slug")
      .lean(),
    Product.countDocuments(query),
  ]);

  const productIds = products.map((p) => p._id);

  // 2. Fetch variants for these products
  const variants = await Variant.find({
    productId: { $in: productIds },
    status: "ACTIVE",
  }).lean();

  const variantsByProduct = new Map<string, typeof variants>();
  for (const v of variants) {
    const pId = v.productId.toString();
    const list = variantsByProduct.get(pId) || [];
    list.push(v);
    variantsByProduct.set(pId, list);
  }

  // 3. Map into catalog items and collect available facets
  const catalogProducts: CatalogProductItem[] = [];

  for (const p of products) {
    const pVariants = variantsByProduct.get(p._id.toString()) || [];
    const sizeSet = new Set<string>();
    const colorSet = new Set<string>();
    let totalStock = 0;
    let compareAtPrice: number | undefined;

    for (const v of pVariants) {
      totalStock += v.stock || 0;
      if (v.compareAtPricePaise && (!compareAtPrice || v.compareAtPricePaise > compareAtPrice)) {
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

    // Size / Color filtering if specified in query
    if (sizes.length > 0 && !sizes.some((s) => sizeSet.has(s))) {
      continue;
    }
    if (colors.length > 0 && !colors.some((c) => colorSet.has(c))) {
      continue;
    }

    const brandData =
      p.brandId && typeof p.brandId === "object" && "name" in p.brandId
        ? {
            _id: (p.brandId as unknown as { _id: mongoose.Types.ObjectId })._id.toString(),
            name: (p.brandId as unknown as { name: string }).name,
            slug: (p.brandId as unknown as { slug: string }).slug,
          }
        : undefined;

    const categoryData =
      p.categoryId && typeof p.categoryId === "object" && "name" in p.categoryId
        ? {
            _id: (p.categoryId as unknown as { _id: mongoose.Types.ObjectId })._id.toString(),
            name: (p.categoryId as unknown as { name: string }).name,
            slug: (p.categoryId as unknown as { slug: string }).slug,
          }
        : undefined;

    const firstImg = p.images?.[0] || "/images/placeholder.jpg";
    const secondImg = p.images?.[1] || firstImg;
    const resolvedPricing = resolvePrice(pVariants[0] || null, p, activeCampaigns);
    const colorList = Array.from(colorSet);
    const swatches = colorList.map((c) => ({ name: c, hex: getColorHex(c) }));

    const mappedVariants = pVariants.map((v) => {
      let optRec: Record<string, string> = {};
      if (v.options instanceof Map) optRec = Object.fromEntries(v.options);
      else if (v.options && typeof v.options === "object") optRec = v.options as Record<string, string>;
      return {
        _id: v._id.toString(),
        sku: v.sku,
        pricePaise: v.pricePaise,
        compareAtPricePaise: v.compareAtPricePaise,
        stock: v.stock,
        options: optRec,
        pricing: resolvePrice(v, p, activeCampaigns),
      };
    });

    catalogProducts.push({
      _id: p._id.toString(),
      name: p.name,
      slug: p.slug,
      description: p.description,
      gender: p.gender,
      type: p.type,
      basePricePaise: p.basePricePaise,
      compareAtPricePaise: compareAtPrice,
      pricing: resolvedPricing,
      createdAt: p.createdAt ? p.createdAt.toISOString() : undefined,
      firstImage: firstImg,
      secondImage: secondImg,
      images: p.images || [],
      brand: brandData,
      category: categoryData,
      colorSwatches: swatches,
      availableSizes: Array.from(sizeSet),
      availableColors: colorList,
      variants: mappedVariants,
      totalStock,
      hasStock: totalStock > 0,
    });
  }

  // 4. Fetch available facet filters for current context
  const [allBrands, allCategories] = await Promise.all([
    Brand.find({ isActive: true }).select("name slug").lean(),
    Category.find({ isActive: true, ...(gender ? { gender } : {}) }).select("name slug").lean(),
  ]);

  return {
    products: catalogProducts,
    totalCount,
    page,
    totalPages: Math.ceil(totalCount / limit) || 1,
    filterFacets: {
      sizes: ["S", "M", "L", "XL", "XXL"],
      colors: ["Navy Blue", "Olive Green", "Burgundy", "White", "Black", "Charcoal"],
      brands: allBrands.map((b) => ({
        name: b.name,
        slug: b.slug,
        count: 0,
      })),
      categories: allCategories.map((c) => ({
        name: c.name,
        slug: c.slug,
        count: 0,
      })),
      minPricePaise: 99900,
      maxPricePaise: 999900,
    },
  };
}

export interface DetailedProduct {
  _id: string;
  name: string;
  slug: string;
  description: string;
  gender: "MEN" | "KIDS";
  type: "SIMPLE" | "VARIABLE";
  basePricePaise: number;
  status: "ACTIVE" | "DRAFT";
  pricing?: ResolvedPriceResult;
  createdAt?: string;
  activeCampaign?: {
    id: string;
    name: string;
    badgeLabel?: string;
    endsAt: string;
    startsAt: string;
  };
  images: string[];
  brand?: {
    _id: string;
    name: string;
    slug: string;
    description?: string;
  };
  category?: {
    _id: string;
    name: string;
    slug: string;
  };
  variants: {
    _id: string;
    sku: string;
    pricePaise: number;
    compareAtPricePaise?: number;
    pricing?: ResolvedPriceResult;
    stock: number;
    images: string[];
    options: Record<string, string>;
    isDefault: boolean;
  }[];
}

/**
 * Retrieves a single product by slug with full active variants, brand, and category.
 */
export async function getProductBySlug(slug: string): Promise<DetailedProduct | null> {
  if (!process.env.MONGODB_URI && !process.env.MONGODB_DIRECT_URI) {
    return null;
  }

  await connectDB();

  void Brand;
  void Category;

  const product = await Product.findOne({ slug, status: "ACTIVE" })
    .populate("brandId", "name slug description")
    .populate("categoryId", "name slug")
    .lean();

  if (!product) return null;

  const variants = await Variant.find({
    productId: product._id,
    status: "ACTIVE",
  }).lean();

  const activeCampaigns = await getActiveCampaigns();

  const mappedVariants = variants.map((v) => {
    let optionsRecord: Record<string, string> = {};
    if (v.options instanceof Map) {
      optionsRecord = Object.fromEntries(v.options);
    } else if (v.options && typeof v.options === "object") {
      optionsRecord = v.options as Record<string, string>;
    }

    const vPricing = resolvePrice(v, product, activeCampaigns);

    return {
      _id: v._id.toString(),
      sku: v.sku,
      pricePaise: v.pricePaise,
      compareAtPricePaise: v.compareAtPricePaise,
      pricing: vPricing,
      stock: v.stock,
      images: (v.images || []).filter((img) => Boolean(img) && !img.includes("simulated_")),
      options: optionsRecord,
      isDefault: v.isDefault,
    };
  });

  const defaultOrFirstVariant = mappedVariants.find((v) => v.isDefault) || mappedVariants[0] || null;
  const productPricing = resolvePrice(defaultOrFirstVariant, product, activeCampaigns);

  let activeCampaignMeta: DetailedProduct["activeCampaign"] = undefined;
  if (productPricing.appliedCampaignId) {
    const winnerCampaign = activeCampaigns.find(
      (c) => c._id?.toString() === productPricing.appliedCampaignId,
    );
    if (winnerCampaign) {
      activeCampaignMeta = {
        id: winnerCampaign._id.toString(),
        name: winnerCampaign.name,
        badgeLabel: winnerCampaign.display?.badgeLabel || productPricing.badgeLabel,
        endsAt: winnerCampaign.endsAt.toISOString(),
        startsAt: winnerCampaign.startsAt.toISOString(),
      };
    }
  }

  const brandData =
    product.brandId && typeof product.brandId === "object" && "name" in product.brandId
      ? {
          _id: (product.brandId as unknown as { _id: mongoose.Types.ObjectId })._id.toString(),
          name: (product.brandId as unknown as { name: string }).name,
          slug: (product.brandId as unknown as { slug: string }).slug,
          description: (product.brandId as unknown as { description?: string }).description,
        }
      : undefined;

  const categoryData =
    product.categoryId && typeof product.categoryId === "object" && "name" in product.categoryId
      ? {
          _id: (product.categoryId as unknown as { _id: mongoose.Types.ObjectId })._id.toString(),
          name: (product.categoryId as unknown as { name: string }).name,
          slug: (product.categoryId as unknown as { slug: string }).slug,
        }
      : undefined;

  return {
    _id: product._id.toString(),
    name: product.name,
    slug: product.slug,
    description: product.description,
    gender: product.gender,
    type: product.type,
    basePricePaise: product.basePricePaise,
    status: product.status,
    pricing: productPricing,
    createdAt: product.createdAt ? product.createdAt.toISOString() : undefined,
    activeCampaign: activeCampaignMeta,
    images: product.images || [],
    brand: brandData,
    category: categoryData,
    variants: mappedVariants,
  };
}

/**
 * Builds Schema.org JSON-LD Structured Data for a Product.
 */
export function buildProductJsonLd(product: DetailedProduct, baseUrl: string) {
  const images =
    product.images.length > 0
      ? product.images.map((img) => (img.startsWith("http") ? img : `${baseUrl}${img}`))
      : [`${baseUrl}/images/placeholder.jpg`];

  const offers = product.variants.map((v) => ({
    "@type": "Offer",
    sku: v.sku,
    price: (v.pricePaise / 100).toFixed(2),
    priceCurrency: "INR",
    availability:
      v.stock > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
    url: `${baseUrl}/product/${product.slug}`,
  }));

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: images,
    description: product.description,
    sku: product.variants[0]?.sku || product.slug,
    brand: {
      "@type": "Brand",
      name: product.brand?.name || "Malli & Co.",
    },
    category: product.category?.name || (product.gender === "MEN" ? "Men's Apparel" : "Kids' Apparel"),
    offers: offers.length === 1 ? offers[0] : offers,
  };
}
