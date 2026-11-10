import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Collection } from "@/models/Collection";
import { getFeaturedCollection } from "@/lib/collections";

export const dynamic = "force-dynamic";

/**
 * Public GET /api/collections
 * Returns active collections for storefront showcases.
 * Supports ?featured=true to return the active hero/showcase collection with resolved products.
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const isFeatured = searchParams.get("featured") === "true";

    if (isFeatured) {
      const slug = searchParams.get("slug") || undefined;
      const featured = await getFeaturedCollection(slug);
      if (!featured) {
        return NextResponse.json(
          { error: "No active collections found" },
          { status: 404 },
        );
      }
      return NextResponse.json({
        success: true,
        collection: featured,
      });
    }

    const collections = await Collection.find({ active: true })
      .sort({ updatedAt: -1 })
      .lean();

    const formatted = collections.map((col) => ({
      _id: col._id.toString(),
      name: col.name,
      slug: col.slug,
      title: col.title,
      subtitle: col.subtitle,
      description: col.description,
      bannerImageUrl: col.bannerImageUrl,
      mode: col.mode,
      maxItems: col.maxItems,
      productCount: col.mode === "MANUAL" ? (col.productIds || []).length : col.maxItems,
      createdAt: col.createdAt,
      updatedAt: col.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      count: formatted.length,
      collections: formatted,
    });
  } catch (error) {
    console.error("Failed to fetch collections:", error);
    return NextResponse.json(
      { error: "Internal server error fetching collections" },
      { status: 500 },
    );
  }
}

