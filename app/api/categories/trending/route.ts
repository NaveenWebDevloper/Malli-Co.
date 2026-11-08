import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";

export const dynamic = "force-dynamic";

/**
 * Public GET /api/categories/trending
 * Returns enabled trending categories ordered by sortOrder (max 8)
 * with tile image (fallback to category imageUrl), label override, link, and active product count.
 */
export async function GET() {
  try {
    await connectDB();

    // Query up to 8 enabled, active trending categories sorted by sortOrder asc
    const trendingCategories = await Category.find({
      isActive: true,
      "trending.enabled": true,
    })
      .sort({ "trending.sortOrder": 1, createdAt: 1 })
      .limit(8)
      .lean();

    // Compute active product count for each trending category in parallel
    const resolved = await Promise.all(
      trendingCategories.map(async (cat) => {
        const productCount = await Product.countDocuments({
          categoryId: cat._id,
          status: "ACTIVE",
        });

        const tileImage =
          cat.trending?.tileImage?.url?.trim() ||
          cat.imageUrl?.trim() ||
          "/images/placeholder.jpg";

        const label = cat.trending?.tileLabel?.trim() || cat.name;

        return {
          _id: cat._id.toString(),
          name: cat.name,
          slug: cat.slug,
          gender: cat.gender,
          label,
          badge: cat.trending?.badge?.trim() || null,
          tileImage,
          link: `/category/${cat.slug}`,
          productCount,
          sortOrder: cat.trending?.sortOrder ?? 0,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      categories: resolved,
    });
  } catch (error: unknown) {
    console.error("Failed to fetch trending categories:", error);
    return NextResponse.json(
      { error: "Internal server error fetching trending categories" },
      { status: 500 },
    );
  }
}

