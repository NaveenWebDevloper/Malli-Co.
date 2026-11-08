import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { HeroBanner } from "@/models/HeroBanner";
import { HeroBannerUpdateSchema } from "@/lib/validations/banner";

export const dynamic = "force-dynamic";

function getScheduleStatus(
  active: boolean,
  startsAt?: Date | null,
  endsAt?: Date | null,
): "Live" | "Scheduled" | "Expired" | "Hidden" {
  if (!active) return "Hidden";
  const now = new Date();
  if (startsAt && new Date(startsAt) > now) return "Scheduled";
  if (endsAt && new Date(endsAt) < now) return "Expired";
  return "Live";
}

/**
 * PATCH /api/admin/banners/[id]
 * Updates an existing hero banner.
 * Protected: Admin only (Rule 7)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Admin role required" },
      { status: 403 },
    );
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid banner ID" }, { status: 400 });
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

    const parsed = HeroBannerUpdateSchema.safeParse(body);
    if (!parsed.success) {
      console.warn(
        `[PATCH /api/admin/banners/${id}] Validation failed:`,
        JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
      );
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const updatePayload: Record<string, unknown> = { ...parsed.data };

    if ("startsAt" in parsed.data) {
      updatePayload.startsAt = parsed.data.startsAt
        ? new Date(parsed.data.startsAt)
        : null;
    }
    if ("endsAt" in parsed.data) {
      updatePayload.endsAt = parsed.data.endsAt
        ? new Date(parsed.data.endsAt)
        : null;
    }

    if ("subtitle" in parsed.data && parsed.data.subtitle === null) {
      updatePayload.subtitle = "";
    }
    if ("eyebrow" in parsed.data && parsed.data.eyebrow === null) {
      updatePayload.eyebrow = "";
    }
    if ("secondaryCtaLabel" in parsed.data && parsed.data.secondaryCtaLabel === null) {
      updatePayload.secondaryCtaLabel = "";
    }
    if ("secondaryCtaUrl" in parsed.data && parsed.data.secondaryCtaUrl === null) {
      updatePayload.secondaryCtaUrl = "";
    }

    if ("imageMobile" in parsed.data) {
      if (!parsed.data.imageMobile || !parsed.data.imageMobile.url) {
        updatePayload.imageMobile = null;
      }
    }

    const updated = await HeroBanner.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, runValidators: true },
    );

    if (!updated) {
      return NextResponse.json({ error: "Banner not found" }, { status: 404 });
    }

    try {
      revalidateTag("banners");
    } catch {
      // Revalidation in non-edge context fallback
    }

    return NextResponse.json({
      success: true,
      banner: {
        id: updated._id.toString(),
        ...updated.toObject(),
        scheduleStatus: getScheduleStatus(
          updated.active,
          updated.startsAt,
          updated.endsAt,
        ),
      },
    });
  } catch (error) {
    console.error(`[PATCH /api/admin/banners/${id}] Error:`, error);
    return NextResponse.json(
      { error: "Failed to update banner" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/banners/[id]
 * Deletes a hero banner.
 * Protected: Admin only (Rule 7)
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Admin role required" },
      { status: 403 },
    );
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid banner ID" }, { status: 400 });
  }

  try {
    await connectDB();
    const deleted = await HeroBanner.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ error: "Banner not found" }, { status: 404 });
    }

    try {
      revalidateTag("banners");
    } catch {
      // Revalidation in non-edge context fallback
    }

    return NextResponse.json({
      success: true,
      message: "Banner deleted successfully",
      id,
    });
  } catch (error) {
    console.error(`[DELETE /api/admin/banners/${id}] Error:`, error);
    return NextResponse.json(
      { error: "Failed to delete banner" },
      { status: 500 },
    );
  }
}

