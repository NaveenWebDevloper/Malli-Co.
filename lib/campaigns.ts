import { Campaign, type ICampaign } from "@/models/Campaign";
import { Product } from "@/models/Product";

export function computeCampaignStatus(
  active: boolean,
  startsAt: Date | string,
  endsAt: Date | string,
): "LIVE" | "SCHEDULED" | "ENDED" | "PAUSED" {
  if (!active) return "PAUSED";
  const now = new Date().getTime();
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (start > now) return "SCHEDULED";
  if (end < now) return "ENDED";
  return "LIVE";
}

export async function countAffectedProducts(scope?: ICampaign["scope"]): Promise<number> {
  try {
    const filter: Record<string, unknown> = {};

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

    return await Product.countDocuments(filter);
  } catch (err) {
    console.error("Failed to count affected products:", err);
    return 0;
  }
}

export async function detectCampaignOverlaps(
  target: {
    _id?: string;
    startsAt: Date | string;
    endsAt: Date | string;
    scope?: ICampaign["scope"];
  },
): Promise<string[]> {
  try {
    const existingCampaigns = await Campaign.find({
      active: true,
      ...(target._id ? { _id: { $ne: target._id } } : {}),
      startsAt: { $lte: new Date(target.endsAt) },
      endsAt: { $gte: new Date(target.startsAt) },
    }).lean();

    const warnings: string[] = [];

    for (const c of existingCampaigns) {
      const genderMatch =
        !target.scope?.gender ||
        !c.scope?.gender ||
        target.scope.gender === c.scope.gender;

      if (!genderMatch) continue;

      const targetMode = target.scope?.mode || "ALL";
      const existingMode = c.scope?.mode || "ALL";

      let hasCollision = false;
      if (targetMode === "ALL" || existingMode === "ALL") {
        hasCollision = true;
      } else if (targetMode === existingMode) {
        const targetIds = (target.scope?.ids || []).map((id) => id.toString());
        const existingIds = (c.scope?.ids || []).map((id) => id.toString());
        hasCollision = targetIds.some((id) => existingIds.includes(id));
      }

      if (hasCollision) {
        const discountStr =
          c.discount.kind === "PERCENT"
            ? `${c.discount.value}%`
            : `₹${Math.round(c.discount.value / 100)}`;
        warnings.push(
          `Overlaps with live/scheduled campaign "${c.name}" (${discountStr} off, priority ${c.priority}). Only the highest priority campaign will apply on shared products.`,
        );
      }
    }

    return warnings;
  } catch (err) {
    console.error("Failed to detect overlaps:", err);
    return [];
  }
}

