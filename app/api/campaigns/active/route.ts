import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Campaign } from "@/models/Campaign";

export const dynamic = "force-dynamic";

/**
 * GET /api/campaigns/active
 * Public cached endpoint returning sanitized running campaigns.
 */
export async function GET() {
  try {
    await connectDB();
    const now = new Date();

    const campaigns = await Campaign.find({
      active: true,
      startsAt: { $lte: now },
      endsAt: { $gte: now },
    })
      .select("name slug type startsAt endsAt discount display priority")
      .sort({ priority: -1, startsAt: 1 })
      .lean();

    const sanitized = campaigns.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      slug: c.slug,
      type: c.type,
      startsAt: c.startsAt,
      endsAt: c.endsAt,
      discountKind: c.discount.kind,
      discountValue: c.discount.value,
      badgeLabel: c.display?.badgeLabel || "",
      bannerImage: c.display?.bannerImage?.url || "",
      themeColor: c.display?.themeColor || "#121212",
      showCountdown: Boolean(c.display?.showCountdown),
      landingEnabled: Boolean(c.display?.landingEnabled),
    }));

    return NextResponse.json(
      {
        success: true,
        serverNow: now.toISOString(),
        campaigns: sanitized,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    console.error("GET /api/campaigns/active error:", error);
    return NextResponse.json(
      { error: "Failed to fetch active campaigns" },
      { status: 500 },
    );
  }
}

