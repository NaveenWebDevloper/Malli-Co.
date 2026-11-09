import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Category, type GenderType } from "@/models/Category";
import { Product } from "@/models/Product";

export const dynamic = "force-dynamic";

/**
 * Public GET /api/categories:
 * List all active storefront categories with subcategories and active product counts.
 * Query params:
 *   - gender?: "MEN" | "KIDS" | "UNISEX"
 *   - parentOnly?: "true" | "false"
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const gender = searchParams.get("gender")?.toUpperCase();
    const parentOnly = searchParams.get("parentOnly") === "true";

    const filter: Record<string, unknown> = { isActive: true };
    if (gender && (gender === "MEN" || gender === "KIDS" || gender === "UNISEX")) {
      filter.gender = gender as GenderType;
    }
    if (parentOnly) {
      filter.parentId = null;
    }

    const categories = await Category.find(filter)
      .populate("parentId", "name slug")
      .sort({ createdAt: 1 })
      .lean();

    // Compute active product counts per category
    const categoryIds = categories.map((c) => c._id);
    const productCounts = await Product.aggregate([
      { $match: { categoryId: { $in: categoryIds }, status: "ACTIVE" } },
      { $group: { _id: "$categoryId", count: { $sum: 1 } } },
    ]);

    const countMap = new Map<string, number>();
    for (const pc of productCounts) {
      countMap.set(pc._id.toString(), pc.count);
    }

    // Format categories
    const formatted = categories.map((cat) => {
      const parent =
        cat.parentId && typeof cat.parentId === "object" && "name" in cat.parentId
          ? {
              _id: (cat.parentId as unknown as { _id: { toString: () => string } })._id.toString(),
              name: (cat.parentId as unknown as { name: string }).name,
              slug: (cat.parentId as unknown as { slug: string }).slug,
            }
          : null;

      return {
        _id: cat._id.toString(),
        name: cat.name,
        slug: cat.slug,
        description: cat.description || "",
        imageUrl: cat.imageUrl || "",
        gender: cat.gender,
        parent,
        productCount: countMap.get(cat._id.toString()) || 0,
        href: `/category/${cat.slug}`,
      };
    });

    return NextResponse.json(
      { success: true, categories: formatted },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    console.error("[GET /api/categories] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}
