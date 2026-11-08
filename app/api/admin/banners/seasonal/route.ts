import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Setting } from "@/models/Setting";
import { FALLBACK_SEASONAL_BANNER } from "@/lib/banners";

export const dynamic = "force-dynamic";

const UpdateSeasonalBannerSchema = z.object({
  bannerUrl: z.string().min(1, "Banner URL is required").trim(),
});

function getUploadedBannerFiles(): string[] {
  try {
    const bannersDir = path.join(process.cwd(), "public", "uploads", "banners");
    if (fs.existsSync(bannersDir)) {
      const files = fs.readdirSync(bannersDir);
      return files
        .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
        .map((f) => `/uploads/banners/${f}`);
    }
  } catch (err) {
    console.warn("Could not read public/uploads/banners directory:", err);
  }
  return [FALLBACK_SEASONAL_BANNER];
}

/**
 * GET /api/admin/banners/seasonal
 * Returns active seasonal banner and all uploaded banners available.
 * Protected: Admin role required (Rule 7).
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
    const setting = await Setting.findOne({ key: "seasonal_banner_url" }).lean();
    const activeBanner = setting?.value || FALLBACK_SEASONAL_BANNER;
    const availableBanners = getUploadedBannerFiles();

    // Ensure active banner is in the list
    if (!availableBanners.includes(activeBanner)) {
      availableBanners.unshift(activeBanner);
    }

    return NextResponse.json({
      success: true,
      activeBanner,
      availableBanners,
    });
  } catch (error) {
    console.error("Failed to retrieve seasonal banner settings:", error);
    return NextResponse.json(
      { error: "Failed to retrieve seasonal banner settings" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/banners/seasonal
 * Updates active seasonal essentials banner.
 * Protected: Admin role required (Rule 7).
 * Validated with Zod (Rule 6).
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
    const json = await req.json();
    const parsed = UpdateSeasonalBannerSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { bannerUrl } = parsed.data;

    await connectDB();
    const setting = await Setting.findOneAndUpdate(
      { key: "seasonal_banner_url" },
      { value: bannerUrl, description: "Active storefront Seasonal Essentials campaign background banner" },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return NextResponse.json({
      success: true,
      message: "Seasonal Essentials banner updated successfully",
      activeBanner: setting.value,
    });
  } catch (error) {
    console.error("Failed to update seasonal banner:", error);
    return NextResponse.json(
      { error: "Failed to update seasonal banner" },
      { status: 500 },
    );
  }
}

