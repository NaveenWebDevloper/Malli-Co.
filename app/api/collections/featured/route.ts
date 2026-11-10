import { NextRequest, NextResponse } from "next/server";
import { getFeaturedCollection, resolveCollectionProducts } from "@/lib/collections";

export const dynamic = "force-dynamic";

/**
 * Public GET /api/collections/featured
 * Returns the primary active curated collection with resolved products.
 * Accepts optional ?filter=all|men|kids|casual|traditional
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all";
    const slug = searchParams.get("slug") || undefined;

    const collection = await getFeaturedCollection(slug);
    if (!collection) {
      return NextResponse.json(
        { error: "No active collection found" },
        { status: 404 },
      );
    }

    if (filter !== "all") {
      const filtered = await resolveCollectionProducts(collection, { filter });
      return NextResponse.json({
        success: true,
        collection: filtered,
      });
    }

    return NextResponse.json({
      success: true,
      collection,
    });
  } catch (error) {
    console.error("Failed to fetch featured collection:", error);
    return NextResponse.json(
      { error: "Internal server error fetching featured collection" },
      { status: 500 },
    );
  }
}

