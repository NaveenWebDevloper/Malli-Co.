import mongoose from "mongoose";
import { Order } from "../models/Order.ts";

export * from "./variant-utils.ts";
import type { GeneratedVariantBlueprint } from "./variant-utils.ts";

export interface VariantDiffResult {
  toCreate: GeneratedVariantBlueprint[];
  toUpdate: GeneratedVariantBlueprint[];
  toArchive: mongoose.Types.ObjectId[];
  toDelete: mongoose.Types.ObjectId[];
}

/**
 * Rule 5 Check:
 * "Editing a variable product must never delete existing variants that have orders; archive them instead."
 * Checks removed variant IDs against Order line items and returns partitioned IDs.
 */
export async function partitionRemovableVariants(
  removedVariantIds: Array<string | mongoose.Types.ObjectId>,
  session?: mongoose.ClientSession,
): Promise<{
  safeToDelete: mongoose.Types.ObjectId[];
  mustArchive: mongoose.Types.ObjectId[];
}> {
  if (!removedVariantIds || removedVariantIds.length === 0) {
    return { safeToDelete: [], mustArchive: [] };
  }

  const objectIds = removedVariantIds.map((id) =>
    typeof id === "string" ? new mongoose.Types.ObjectId(id) : id,
  );

  // Check which variant IDs are present in existing Orders
  const orderQuery = Order.find({
    "items.variantId": { $in: objectIds },
  }).select("items.variantId");

  if (session) {
    orderQuery.session(session);
  }

  const existingOrders = await orderQuery;

  const orderedVariantIdSet = new Set<string>();
  for (const order of existingOrders) {
    for (const item of order.items) {
      if (item.variantId) {
        orderedVariantIdSet.add(item.variantId.toString());
      }
    }
  }

  const safeToDelete: mongoose.Types.ObjectId[] = [];
  const mustArchive: mongoose.Types.ObjectId[] = [];

  for (const id of objectIds) {
    if (orderedVariantIdSet.has(id.toString())) {
      mustArchive.push(id);
    } else {
      safeToDelete.push(id);
    }
  }

  return { safeToDelete, mustArchive };
}
