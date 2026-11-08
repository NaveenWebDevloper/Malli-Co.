import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { RecommendationsQuerySchema } from "@/lib/validations/recommendations";
import {
  getPersonalizedSimilarProducts,
  getRecentlyViewedProducts,
} from "@/lib/recommendations";

export const dynamic = "force-dynamic";

/**
 * GET /api/products/recommendations
 * Query params:
 *  - slug: string (current product slug)
 *  - productId: string (current product ID)
 *  - recentSlugs: string (comma-separated recently viewed slugs)
 *  - limit: number (default: 8)
 *
 * Adheres to:
 * - Rule 1 & Rule 2: Server-side pricing in integer paise.
 * - Rule 6: Input validation with Zod.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = RecommendationsQuerySchema.safeParse({
      slug: searchParams.get("slug") || undefined,
      productId: searchParams.get("productId") || undefined,
      recentSlugs: searchParams.get("recentSlugs") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { slug, productId, recentSlugs, limit } = parsed.data;
    const session = await auth();
    const userId = session?.user?.id;

    await connectDB();

    let currentProduct: {
      _id: unknown;
      slug: string;
      categoryId?: unknown;
      gender?: "MEN" | "KIDS";
      basePricePaise?: number;
      name?: string;
      description?: string;
    } | null = null;

    if (slug) {
      currentProduct = await Product.findOne({ slug, status: "ACTIVE" })
        .select("_id slug categoryId gender basePricePaise name description")
        .lean();
    } else if (productId) {
      currentProduct = await Product.findOne({ _id: productId, status: "ACTIVE" })
        .select("_id slug categoryId gender basePricePaise name description")
        .lean();
    }

    // 1. Get personalized similar products
    const similarProducts = await getPersonalizedSimilarProducts({
      currentProductId: currentProduct?._id
        ? (currentProduct._id as { toString: () => string }).toString()
        : undefined,
      currentSlug: currentProduct?.slug || slug,
      categoryId: currentProduct?.categoryId
        ? (currentProduct.categoryId as { toString: () => string }).toString()
        : undefined,
      gender: currentProduct?.gender,
      basePricePaise: currentProduct?.basePricePaise,
      name: currentProduct?.name,
      description: currentProduct?.description,
      userId,
      recentSlugs,
      limit,
    });

    // 2. Get recently viewed products
    const recentlyViewed =
      recentSlugs && recentSlugs.length > 0
        ? await getRecentlyViewedProducts({
            slugs: recentSlugs,
            excludeSlug: currentProduct?.slug || slug,
            limit,
          })
        : [];

    return NextResponse.json({
      success: true,
      similarProducts,
      recentlyViewed,
    });
  } catch (error: unknown) {
    console.error("Recommendations API error:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve recommendations",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

