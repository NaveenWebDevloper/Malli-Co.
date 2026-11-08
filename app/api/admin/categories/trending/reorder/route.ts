import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Category } from "@/models/Category";
import { TrendingReorderSchema } from "@/lib/validations/category";

export const dynamic = "force-dynamic";

/**
 * PUT /api/admin/categories/trending/reorder
 * Batch update sortOrder (and optional enabled status) for trending categories.
 */
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validation = TrendingReorderSchema.safeParse(body);

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

    const bulkOps = validation.data.items.map((item) => {
      const updateFields: Record<string, unknown> = {
        "trending.sortOrder": item.sortOrder,
      };
      if (item.enabled !== undefined) {
        updateFields["trending.enabled"] = item.enabled;
      }

      return {
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(item.id) },
          update: { $set: updateFields },
        },
      };
    });

    if (bulkOps.length > 0) {
      await Category.bulkWrite(bulkOps);
    }

    try {
      revalidateTag("categories");
      revalidateTag("categories-trending");
    } catch {
      // Ignore cache revalidation errors
    }

    return NextResponse.json({
      success: true,
      message: "Trending categories reordered successfully",
      updatedCount: bulkOps.length,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("Failed to reorder trending categories:", error);
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}

