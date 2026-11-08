import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Collection } from "@/models/Collection";
import { resolveCollectionProducts } from "@/lib/collections";

export const dynamic = "force-dynamic";

/**
 * Public GET /api/collections/[slug]
 * Returns active collection with resolved products (canonical prices, dual images, swatches).
 * Out of stock or DRAFT products are excluded automatically.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json(
        { error: "Collection slug is required" },
        { status: 400 },
      );
    }

    await connectDB();
    const collection = await Collection.findOne({
      slug: slug.toLowerCase().trim(),
      active: true,
    }).lean();

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found or inactive" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(_req.url);
    const filter = searchParams.get("filter") || searchParams.get("category") || "all";

    const resolved = await resolveCollectionProducts(collection, { filter });

    return NextResponse.json({
      success: true,
      collection: resolved,
    });
  } catch (error: unknown) {
    console.error("Failed to fetch collection:", error);
    return NextResponse.json(
      { error: "Internal server error fetching collection" },
      { status: 500 },
    );
  }
}
