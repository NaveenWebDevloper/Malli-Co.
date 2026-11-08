import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { HeroBanner } from "@/models/HeroBanner";
import { HeroBannerSchema } from "@/lib/validations/banner";

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
 * GET /api/admin/banners
 * Returns all hero banners with computed schedule statuses.
 * Protected: Admin only (Rule 7)
 */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Admin role required" },
      { status: 403 },
    );
  }

  try {
    await connectDB();
    const banners = await HeroBanner.find()
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    const formatted = banners.map((b) => ({
      id: b._id.toString(),
      title: b.title,
      subtitle: b.subtitle || "",
      eyebrow: b.eyebrow || "",
      ctaLabel: b.ctaLabel,
      ctaUrl: b.ctaUrl,
      secondaryCtaLabel: b.secondaryCtaLabel || "",
      secondaryCtaUrl: b.secondaryCtaUrl || "",
      imageDesktop: b.imageDesktop,
      imageMobile: b.imageMobile,
      altText: b.altText,
      textPosition: b.textPosition,
      textTheme: b.textTheme,
      overlayOpacity: b.overlayOpacity,
      sortOrder: b.sortOrder,
      active: b.active,
      startsAt: b.startsAt,
      endsAt: b.endsAt,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
      scheduleStatus: getScheduleStatus(b.active, b.startsAt, b.endsAt),
    }));

    return NextResponse.json({
      success: true,
      banners: formatted,
      count: formatted.length,
      maxAllowed: 8,
    });
  } catch (error) {
    console.error("[GET /api/admin/banners] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch banners" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/banners
 * Creates a new hero banner (max 8 allowed).
 * Protected: Admin only (Rule 7)
 */
export async function POST(req: NextRequest) {
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

    const parsed = HeroBannerSchema.safeParse(body);
    if (!parsed.success) {
      console.warn(
        "[POST /api/admin/banners] Validation failed:",
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

    // Check maximum banner limit (8)
    const currentCount = await HeroBanner.countDocuments();
    if (currentCount >= 8) {
      return NextResponse.json(
        {
          error:
            "Maximum limit of 8 banners reached. Please edit or delete an existing banner.",
        },
        { status: 400 },
      );
    }

    const bannerData = parsed.data;

    // If sortOrder was not explicitly provided or is 0, assign next index
    if (bannerData.sortOrder === 0 && currentCount > 0) {
      const highestOrder = await HeroBanner.findOne()
        .sort({ sortOrder: -1 })
        .select("sortOrder");
      bannerData.sortOrder = (highestOrder?.sortOrder ?? 0) + 1;
    }

    const created = await HeroBanner.create({
      ...bannerData,
      startsAt: bannerData.startsAt ? new Date(bannerData.startsAt) : undefined,
      endsAt: bannerData.endsAt ? new Date(bannerData.endsAt) : undefined,
    });

    try {
      revalidateTag("banners");
    } catch {
      // Revalidation in non-edge context fallback
    }

    return NextResponse.json(
      {
        success: true,
        banner: {
          id: created._id.toString(),
          ...created.toObject(),
          scheduleStatus: getScheduleStatus(
            created.active,
            created.startsAt,
            created.endsAt,
          ),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/admin/banners] Error:", error);
    return NextResponse.json(
      { error: "Failed to create banner" },
      { status: 500 },
    );
  }
}

