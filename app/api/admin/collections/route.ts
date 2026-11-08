import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Collection } from "@/models/Collection";
import { CollectionCreateSchema } from "@/lib/validations/collection";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/collections
 * List all collections with mode, item counts, rule details, and active status.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
  }

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const mode = searchParams.get("mode")?.toUpperCase();

    const query: Record<string, unknown> = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
      ];
    }
    if (mode === "MANUAL" || mode === "AUTO") {
      query.mode = mode;
    }

    const collections = await Collection.find(query)
      .sort({ createdAt: -1 })
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
      productCount: col.mode === "MANUAL" ? (col.productIds || []).length : 0,
      autoRule: col.autoRule,
      maxItems: col.maxItems || 10,
      active: col.active,
      createdAt: col.createdAt,
      updatedAt: col.updatedAt,
    }));

    return NextResponse.json({ collections: formatted });
  } catch (error: unknown) {
    console.error("Failed to list collections:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/collections
 * Create a new curated collection.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validation = CollectionCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: validation.error.flatten(),
        },
        { status: 400 },
      );
    }

    await connectDB();

    // Check unique slug
    const existing = await Collection.findOne({ slug: validation.data.slug });
    if (existing) {
      return NextResponse.json(
        {
          error: `Collection slug '${validation.data.slug}' already exists. Please choose a different slug.`,
        },
        { status: 409 },
      );
    }

    const collection = await Collection.create({
      ...validation.data,
      productIds: validation.data.productIds || [],
    });

    try {
      revalidateTag("collections");
    } catch {
      // Ignore cache revalidation errors during offline/tests
    }

    return NextResponse.json(
      {
        success: true,
        collection: {
          _id: collection._id.toString(),
          name: collection.name,
          slug: collection.slug,
          title: collection.title,
          subtitle: collection.subtitle,
          mode: collection.mode,
          active: collection.active,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("Failed to create collection:", error);
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
