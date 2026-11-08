import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Campaign, type ICampaign } from "@/models/Campaign";
import { CampaignCreateSchema } from "@/lib/validations/campaign";
import {
  computeCampaignStatus,
  countAffectedProducts,
  detectCampaignOverlaps,
} from "@/lib/campaigns";
import { sendNewSaleBroadcastEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/campaigns
 * List all campaigns with computed status, affected product counts, and summary.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
  }

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const statusFilter = searchParams.get("status")?.toUpperCase();

    const query: Record<string, unknown> = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
      ];
    }

    const campaigns = await Campaign.find(query)
      .sort({ priority: -1, startsAt: -1, createdAt: -1 })
      .lean();

    // Map each campaign with computed status and affected products count
    const formatted = await Promise.all(
      campaigns.map(async (c) => {
        const status = computeCampaignStatus(c.active, c.startsAt, c.endsAt);
        const affectedCount = await countAffectedProducts(c.scope);

        // Scope human-readable summary
        let scopeSummary = "All Products";
        const discountStr =
          c.discount.kind === "PERCENT"
            ? `${c.discount.value}% off`
            : `Flat ₹${Math.round(c.discount.value / 100)} off`;

        if (c.scope?.mode === "CATEGORIES") {
          scopeSummary = `${discountStr} in ${(c.scope.ids || []).length} Categories`;
        } else if (c.scope?.mode === "BRANDS") {
          scopeSummary = `${discountStr} in ${(c.scope.ids || []).length} Brands`;
        } else if (c.scope?.mode === "PRODUCTS") {
          scopeSummary = `${discountStr} on ${(c.scope.ids || []).length} Products`;
        } else {
          scopeSummary = `${discountStr} Storewide`;
        }

        if (c.scope?.gender) {
          scopeSummary += ` (${c.scope.gender})`;
        }

        return {
          id: c._id.toString(),
          name: c.name,
          slug: c.slug,
          type: c.type,
          description: c.description || "",
          startsAt: c.startsAt,
          endsAt: c.endsAt,
          active: c.active,
          priority: c.priority,
          discount: c.discount,
          scope: c.scope,
          display: c.display,
          status,
          scopeSummary,
          affectedCount,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        };
      }),
    );

    // Apply status filter if present
    const filtered = statusFilter
      ? formatted.filter((c) => c.status === statusFilter)
      : formatted;

    return NextResponse.json({
      success: true,
      campaigns: filtered,
      total: filtered.length,
    });
  } catch (error) {
    console.error("GET /api/admin/campaigns error:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/campaigns
 * Creates a new campaign with strict validation and overlap detection.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
  }

  try {
    await connectDB();
    const rawBody = await req.json();

    const parsed = CampaignCreateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Check slug uniqueness
    const existingSlug = await Campaign.findOne({ slug: data.slug });
    if (existingSlug) {
      return NextResponse.json(
        { error: `Slug "${data.slug}" is already in use.` },
        { status: 409 },
      );
    }

    // Check overlaps
    const warnings = await detectCampaignOverlaps({
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      scope: data.scope as unknown as ICampaign["scope"],
    });

    const newCampaign = await Campaign.create(data);

    // Notify registered client accounts of the new Sale
    try {
      const discountStr =
        data.discount.kind === "PERCENT"
          ? `${data.discount.value}% off`
          : `Flat ₹${Math.round(data.discount.value / 100)} off`;
      sendNewSaleBroadcastEmail({
        name: newCampaign.name,
        slug: newCampaign.slug,
        discountSummary: `${discountStr} ${data.scope?.mode === "ALL" ? "Storewide" : "Special Curation"}`,
        description: newCampaign.description,
        startsAt: newCampaign.startsAt,
        endsAt: newCampaign.endsAt,
      }).catch((emailErr) => {
        console.warn("Background sale broadcast email error:", emailErr);
      });
    } catch {
      // Safe non-blocking email trigger
    }

    // Revalidate storefront cache tag
    try {
      revalidateTag("campaigns");
    } catch {
      // safe fallback in dev
    }

    return NextResponse.json(
      {
        success: true,
        campaign: {
          id: newCampaign._id.toString(),
          ...newCampaign.toObject(),
        },
        warnings,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("POST /api/admin/campaigns error:", error);
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
