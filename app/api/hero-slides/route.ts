import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { HeroSlide } from "@/models/HeroSlide";
import { DEFAULT_HERO_SLIDES } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * Public GET: Fetch active hero slides for the storefront 3D FlexCarousel.
 */
export async function GET() {
  try {
    await connectDB();
    const slides = await HeroSlide.find({ isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    if (!slides || slides.length === 0) {
      return NextResponse.json({ slides: DEFAULT_HERO_SLIDES });
    }

    const formatted = slides.map((s) => ({
      id: s._id.toString(),
      src: s.src,
      alt: s.alt || "",
      title: s.title || "",
      subtitle: s.subtitle || "",
      order: s.order ?? 0,
      isActive: s.isActive ?? true,
    }));

    return NextResponse.json({ slides: formatted });
  } catch (error) {
    console.error("Failed to fetch hero slides:", error);
    // Graceful fallback to default slides
    return NextResponse.json({ slides: DEFAULT_HERO_SLIDES });
  }
}

