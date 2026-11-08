import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Campaign, type ICampaign } from "@/models/Campaign";
import { CampaignUpdateSchema } from "@/lib/validations/campaign";
import {
  computeCampaignStatus,
  countAffectedProducts,
  detectCampaignOverlaps,
} from "@/lib/campaigns";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/campaigns/[id]
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await connectDB();
    const campaign = await Campaign.findById(id).lean();

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const status = computeCampaignStatus(campaign.active, campaign.startsAt, campaign.endsAt);
    const affectedCount = await countAffectedProducts(campaign.scope);

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign._id.toString(),
        ...campaign,
        status,
        affectedCount,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/campaigns/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch campaign" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/campaigns/[id]
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await connectDB();
    const rawBody = await req.json();

    const parsed = CampaignUpdateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await Campaign.findById(id);
    if (!existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const updates = parsed.data;

    // Slug check if changed
    if (updates.slug && updates.slug !== existing.slug) {
      const slugCollision = await Campaign.findOne({
        slug: updates.slug,
        _id: { $ne: id },
      });
      if (slugCollision) {
        return NextResponse.json(
          { error: `Slug "${updates.slug}" is already taken.` },
          { status: 409 },
        );
      }
    }

    // Overlap warnings
    const targetStartsAt = updates.startsAt || existing.startsAt;
    const targetEndsAt = updates.endsAt || existing.endsAt;
    const targetScope = (updates.scope || existing.scope) as unknown as ICampaign["scope"];

    const warnings = await detectCampaignOverlaps({
      _id: id,
      startsAt: targetStartsAt,
      endsAt: targetEndsAt,
      scope: targetScope,
    });

    const updated = await Campaign.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true },
    ).lean();

    try {
      revalidateTag("campaigns");
    } catch {
      // safe fallback
    }

    return NextResponse.json({
      success: true,
      campaign: {
        id: updated!._id.toString(),
        ...updated,
      },
      warnings,
    });
  } catch (error: unknown) {
    console.error("PATCH /api/admin/campaigns/[id] error:", error);
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/campaigns/[id]
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await connectDB();
    const deleted = await Campaign.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    try {
      revalidateTag("campaigns");
    } catch {
      // safe fallback
    }

    return NextResponse.json({
      success: true,
      message: "Campaign deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /api/admin/campaigns/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 });
  }
}
