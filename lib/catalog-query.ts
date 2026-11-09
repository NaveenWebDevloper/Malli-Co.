import type { FilterQuery } from "mongoose";
import type { IProduct } from "@/models/Product";
import type { IVariant } from "@/models/Variant";

/**
 * Canonical query filter for active, non-deleted storefront products.
 * Guarantees deletedAt is strictly null and status is ACTIVE.
 */
export function activeStorefrontProductFilter(
  extra: FilterQuery<IProduct> = {}
): FilterQuery<IProduct> {
  return {
    ...extra,
    deletedAt: null,
    status: "ACTIVE",
  };
}

/**
 * Filter that excludes soft-deleted items while allowing specific statuses.
 */
export function notDeletedProductFilter(
  extra: FilterQuery<IProduct> = {}
): FilterQuery<IProduct> {
  return {
    ...extra,
    deletedAt: null,
  };
}

/**
 * Filter for active, non-deleted product variants.
 */
export function activeVariantFilter(
  extra: FilterQuery<IVariant> = {}
): FilterQuery<IVariant> {
  return {
    ...extra,
    deletedAt: null,
    status: "ACTIVE",
  };
}
