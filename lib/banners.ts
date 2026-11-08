import { connectDB } from "./db.ts";
import { HeroBanner } from "../models/HeroBanner.ts";
import { Setting } from "../models/Setting.ts";
import type { BannerSlide } from "../components/home/HeroBannerCarousel.tsx";

/**
 * Server-side helper to fetch currently active hero banners whose schedule window is active.
 * Sorted by sortOrder ASC, capped at 8.
 */
export async function getActiveHeroBanners(): Promise<BannerSlide[]> {
  try {
    await connectDB();
    const now = new Date();

    const banners = await HeroBanner.find({
      active: true,
      $and: [
        {
          $or: [
            { startsAt: { $exists: false } },
            { startsAt: null },
            { startsAt: { $lte: now } },
          ],
        },
        {
          $or: [
            { endsAt: { $exists: false } },
            { endsAt: null },
            { endsAt: { $gte: now } },
          ],
        },
      ],
    })
      .sort({ sortOrder: 1, createdAt: 1 })
      .limit(8)
      .lean();

    return banners.map((b) => ({
      id: b._id.toString(),
      title: b.title,
      subtitle: b.subtitle || "",
      eyebrow: b.eyebrow || "",
      ctaLabel: b.ctaLabel,
      ctaUrl: b.ctaUrl,
      secondaryCtaLabel: b.secondaryCtaLabel || "",
      secondaryCtaUrl: b.secondaryCtaUrl || "",
      imageDesktop: {
        url: b.imageDesktop.url,
        publicId: b.imageDesktop.publicId,
        width: b.imageDesktop.width,
        height: b.imageDesktop.height,
      },
      imageMobile: b.imageMobile
        ? {
            url: b.imageMobile.url,
            publicId: b.imageMobile.publicId,
            width: b.imageMobile.width,
            height: b.imageMobile.height,
          }
        : {
            url: b.imageDesktop.url,
            publicId: b.imageDesktop.publicId,
            width: b.imageDesktop.width,
            height: b.imageDesktop.height,
          },
      altText: b.altText,
      textPosition: b.textPosition,
      textTheme: b.textTheme,
      overlayOpacity: b.overlayOpacity,
      sortOrder: b.sortOrder,
    }));
  } catch (error) {
    console.error("Failed to fetch active hero banners:", error);
    return [];
  }
}

export const FALLBACK_SEASONAL_BANNER = "/uploads/banners/banner-1794072819742-31a3ae6d.png";

/**
 * Retrieves the currently active Seasonal Essentials banner configured by the Admin.
 */
export async function getActiveSeasonalBanner(): Promise<string> {
  try {
    await connectDB();
    const setting = await Setting.findOne({ key: "seasonal_banner_url" }).lean();
    return setting?.value || FALLBACK_SEASONAL_BANNER;
  } catch (error) {
    console.warn("Failed to fetch active seasonal banner setting:", error);
    return FALLBACK_SEASONAL_BANNER;
  }
}
