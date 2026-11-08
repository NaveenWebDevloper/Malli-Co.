import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { HeroSlide } from "@/models/HeroSlide";
import { DEFAULT_HERO_SLIDES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const SlideItemSchema = z.object({
  id: z.string().optional(),
  src: z.string().min(1, "Image URL or path is required").trim(),
  alt: z.string().default(""),
  title: z.string().default(""),
  subtitle: z.string().optional().default(""),
  order: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

const UpdateHeroSlidesSchema = z.object({
  slides: z.array(SlideItemSchema).min(1, "At least one slide is required in the carousel"),
});

/**
 * GET /api/admin/hero:
 * Returns all configured hero carousel slides for admin management.
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
    const slides = await HeroSlide.find()
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
    console.error("Admin failed to fetch hero slides:", error);
    return NextResponse.json(
      { error: "Failed to retrieve hero slides from database" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/hero:
 * Saves and synchronizes the full list of carousel slides.
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
    const body = await req.json();
    const parsed = UpdateHeroSlidesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    await connectDB();
    const { slides } = parsed.data;

    // Delete existing slides and replace with new ordered list
    await HeroSlide.deleteMany({});

    const docsToInsert = slides.map((slide, idx) => ({
      src: slide.src,
      alt: slide.alt,
      title: slide.title,
      subtitle: slide.subtitle,
      order: idx,
      isActive: slide.isActive,
    }));

    const inserted = await HeroSlide.insertMany(docsToInsert);

    const formatted = inserted.map((s) => ({
      id: s._id.toString(),
      src: s.src,
      alt: s.alt || "",
      title: s.title || "",
      subtitle: s.subtitle || "",
      order: s.order,
      isActive: s.isActive,
    }));

    return NextResponse.json({
      success: true,
      message: "Hero carousel updated successfully",
      slides: formatted,
    });
  } catch (error) {
    console.error("Failed to update hero slides:", error);
    return NextResponse.json(
      { error: "Failed to update hero carousel in database" },
      { status: 500 },
    );
  }
}

