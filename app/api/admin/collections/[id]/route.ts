import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Collection } from "@/models/Collection";
import { Product } from "@/models/Product";
import { CollectionUpdateSchema } from "@/lib/validations/collection";

export const dynamic = "force-dynamic";

interface PopulatedProductItem {
  _id: string;
  name: string;
  slug: string;
  image: string;
  basePricePaise: number;
  status: string;
  gender: string;
}

/**
 * GET /api/admin/collections/[id]
 * Fetch single collection with populated products for editor preview.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
  }

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid collection ID format" }, { status: 400 });
    }

    await connectDB();
    const collection = await Collection.findById(id).lean();

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    // Populate products in manual order
    const populatedProducts: PopulatedProductItem[] = [];
    if (collection.mode === "MANUAL" && collection.productIds?.length) {
      const raw = await Product.find({ _id: { $in: collection.productIds } })
        .select("name slug images basePricePaise status gender")
        .lean();

      const productMap = new Map(raw.map((p) => [p._id.toString(), p]));
      for (const pId of collection.productIds) {
        const found = productMap.get(pId.toString());
        if (found) {
          populatedProducts.push({
            _id: found._id.toString(),
            name: found.name,
            slug: found.slug,
            image: found.images?.[0] || "/images/placeholder.jpg",
            basePricePaise: found.basePricePaise,
            status: found.status,
            gender: found.gender,
          });
        }
      }
    }

    return NextResponse.json({
      collection: {
        ...collection,
        _id: collection._id.toString(),
        selectedProducts: populatedProducts,
      },
    });
  } catch (error: unknown) {
    console.error("Failed to fetch collection:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/collections/[id]
 * Update collection fields, reorder products, or change auto rules.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
  }

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid collection ID format" }, { status: 400 });
    }

    const body = await req.json();
    const validation = CollectionUpdateSchema.safeParse(body);

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

    // Check slug collision if slug is being updated
    if (validation.data.slug) {
      const existing = await Collection.findOne({
        slug: validation.data.slug,
        _id: { $ne: new mongoose.Types.ObjectId(id) },
      });
      if (existing) {
        return NextResponse.json(
          {
            error: `Collection slug '${validation.data.slug}' is already used by another collection.`,
          },
          { status: 409 },
        );
      }
    }

    const updated = await Collection.findByIdAndUpdate(
      id,
      { $set: validation.data },
      { new: true, runValidators: true },
    );

    if (!updated) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    try {
      revalidateTag("collections");
    } catch {
      // Ignore cache revalidation errors
    }

    return NextResponse.json({
      success: true,
      collection: updated,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("Failed to update collection:", error);
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/collections/[id]
 * Permanently remove collection.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
  }

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid collection ID format" }, { status: 400 });
    }

    await connectDB();
    const deleted = await Collection.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    try {
      revalidateTag("collections");
    } catch {
      // Ignore cache revalidation errors
    }

    return NextResponse.json({
      success: true,
      message: "Collection deleted successfully",
    });
  } catch (error: unknown) {
    console.error("Failed to delete collection:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
