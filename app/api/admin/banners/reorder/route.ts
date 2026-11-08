import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { HeroBanner } from "@/models/HeroBanner";
import { HeroBannerReorderSchema } from "@/lib/validations/banner";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/banners/reorder
 * Bulk updates the sortOrder of specified banners.
 * Body: { items: [{ id: string, sortOrder: number }] }
 * Protected: Admin only (Rule 7)
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Admin role required" },
      { status: 403 },
    );
  }

  try {
    await connectDB();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 },
      );
    }

    const parsed = HeroBannerReorderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { items } = parsed.data;

    const bulkOps = items
      .filter((item) => mongoose.Types.ObjectId.isValid(item.id))
      .map((item) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(item.id) },
          update: { $set: { sortOrder: item.sortOrder } },
        },
      }));

    if (bulkOps.length > 0) {
      await HeroBanner.bulkWrite(bulkOps);
    }

    try {
      revalidateTag("banners");
    } catch {
      // Revalidation in non-edge context fallback
    }

    return NextResponse.json({
      success: true,
      message: `Successfully reordered ${bulkOps.length} banner(s)`,
    });
  } catch (error) {
    console.error("[PATCH /api/admin/banners/reorder] Error:", error);
    return NextResponse.json(
      { error: "Failed to reorder banners" },
      { status: 500 },
    );
  }
}

