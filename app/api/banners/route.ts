import { NextResponse } from "next/server";
import { getActiveHeroBanners } from "@/lib/banners";

export const dynamic = "force-dynamic";

/**
 * Public GET /api/banners:
 * Returns active hero banners whose schedule window is currently active.
 * Sorted by sortOrder (ascending), capped at max 8 banners.
 */
export async function GET() {
  try {
    const banners = await getActiveHeroBanners();

    return NextResponse.json(
      { success: true, banners },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          "x-cache-tag": "banners",
        },
      },
    );
  } catch (error) {
    console.error("[GET /api/banners] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch banners", banners: [] },
      { status: 500 },
    );
  }
}

