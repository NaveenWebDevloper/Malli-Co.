import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { type ICampaign } from "@/models/Campaign";
import { Product } from "@/models/Product";
import { Variant } from "@/models/Variant";
import { resolvePrice } from "@/lib/pricing";
import { countAffectedProducts, detectCampaignOverlaps } from "@/lib/campaigns";

export const dynamic = "force-dynamic";

export interface SampleProductPreview {
  id: string;
  name: string;
  image: string;
  basePriceRupees: number;
  finalPriceRupees: number;
  discountPercent: number;
  savingsRupees: number;
  belowCostWarning?: string;
}

/**
 * POST /api/admin/campaigns/preview
 * Evaluates draft campaign targeting, computes live affected product count,
 * resolves 3 real sample products showing before/after prices,
 * and surfaces overlap or margin warnings.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
  }

  try {
    await connectDB();
    const body = await req.json();

    const {
      startsAt = new Date().toISOString(),
      endsAt = new Date(Date.now() + 7 * 86400000).toISOString(),
      discount = { kind: "PERCENT", value: 20 },
      scope = { mode: "ALL" },
      campaignId,
    } = body;

    // 1. Live affected count
    const affectedCount = await countAffectedProducts(scope);

    // 2. Overlap warnings
    const warnings = await detectCampaignOverlaps({
      _id: campaignId,
      startsAt,
      endsAt,
      scope,
    });

    // 3. Find up to 3 sample products in scope
    const filter: Record<string, unknown> = { status: "ACTIVE" };

    if (scope?.gender) {
      filter.gender = scope.gender;
    }
    if (scope?.excludeProductIds && scope.excludeProductIds.length > 0) {
      filter._id = { $nin: scope.excludeProductIds };
    }

    const mode = scope?.mode || "ALL";
    const ids = scope?.ids || [];

    switch (mode) {
      case "CATEGORIES":
        filter.categoryId = { $in: ids };
        break;
      case "BRANDS":
        filter.brandId = { $in: ids };
        break;
      case "PRODUCTS":
        filter._id = filter._id
          ? { ...(filter._id as Record<string, unknown>), $in: ids }
          : { $in: ids };
        break;
      case "ALL":
      default:
        break;
    }

    const sampleProducts = await Product.find(filter)
      .limit(3)
      .populate("categoryId", "name")
      .lean();

    // Fabricate a draft campaign object to pass to resolvePrice
    const draftCampaign: ICampaign = {
      _id: "draft_preview",
      name: "Draft Preview",
      slug: "draft-preview",
      type: "FESTIVE",
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      active: true,
      priority: 999999, // Ensure draft wins for the preview
      discount,
      scope,
    } as unknown as ICampaign;

    const previews: SampleProductPreview[] = [];

    for (const prod of sampleProducts) {
      // Find a default or first active variant
      const variant = await Variant.findOne({
        productId: prod._id,
        status: "ACTIVE",
      }).lean();

      const resolved = resolvePrice(variant, prod, [draftCampaign], new Date(startsAt));

      const basePricePaise = resolved.basePrice;
      const finalPricePaise = resolved.finalPrice;
      const savingsPaise = Math.max(0, basePricePaise - finalPricePaise);

      let belowCostWarning: string | undefined;
      // If variant has costPricePaise or product has cost
      const costPricePaise = (variant as unknown as { costPricePaise?: number })?.costPricePaise;
      if (costPricePaise && costPricePaise > 0 && finalPricePaise < costPricePaise) {
        belowCostWarning = `Final price ₹${(finalPricePaise / 100).toFixed(2)} is below cost ₹${(costPricePaise / 100).toFixed(2)}.`;
      }

      previews.push({
        id: prod._id.toString(),
        name: prod.name,
        image: prod.images?.[0] || "",
        basePriceRupees: Math.round(basePricePaise / 100),
        finalPriceRupees: Math.round(finalPricePaise / 100),
        discountPercent: resolved.discountPercent,
        savingsRupees: Math.round(savingsPaise / 100),
        belowCostWarning,
      });
    }

    return NextResponse.json({
      success: true,
      affectedCount,
      sampleProducts: previews,
      warnings,
    });
  } catch (error) {
    console.error("Campaign preview error:", error);
    return NextResponse.json({ error: "Failed to generate campaign preview" }, { status: 500 });
  }
}
