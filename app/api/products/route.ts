import { NextRequest, NextResponse } from "next/server";
import { getCatalogProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

/**
 * Public GET /api/products:
 * Returns catalog products with server-computed canonical prices,
 * faceted filters, active promotion campaign discounts, and pagination.
 *
 * Query params:
 *   - category?: string (slug, e.g. "mens-shirts", "mens-t-shirts", "full-sleeves-shirts")
 *   - gender?: "MEN" | "KIDS"
 *   - brand?: string
 *   - search?: string
 *   - sort?: "newest" | "price-asc" | "price-desc"
 *   - minPrice?: string (in rupees)
 *   - maxPrice?: string (in rupees)
 *   - page?: string
 *   - limit?: string
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const categorySlug = searchParams.get("category")?.trim() || undefined;
    const genderParam = searchParams.get("gender")?.toUpperCase();
    const gender =
      genderParam === "MEN" || genderParam === "KIDS" ? genderParam : undefined;
    const brandSlug = searchParams.get("brand")?.trim() || undefined;
    const search = searchParams.get("search")?.trim() || undefined;
    const sortBy = (searchParams.get("sort") || "newest") as
      | "newest"
      | "price-asc"
      | "price-desc";

    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const minPricePaise = minPrice ? parseInt(minPrice, 10) * 100 : undefined;
    const maxPricePaise = maxPrice ? parseInt(maxPrice, 10) * 100 : undefined;

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") || "12", 10)),
    );

    const result = await getCatalogProducts({
      categorySlug,
      gender,
      brandSlug,
      search,
      sortBy,
      minPricePaise,
      maxPricePaise,
      page,
      limit,
    });

    return NextResponse.json(
      {
        success: true,
        ...result,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      },
    );
  } catch (error) {
    console.error("[GET /api/products] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch products",
        products: [],
        totalCount: 0,
        page: 1,
        totalPages: 1,
      },
      { status: 500 },
    );
  }
}
