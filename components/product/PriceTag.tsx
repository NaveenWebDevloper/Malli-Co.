import React from "react";
import { formatCurrency } from "@/lib/currency";
import type { ResolvedPriceResult } from "@/lib/pricing";

export interface PriceTagProps {
  /**
   * Canonical resolved price from server (Rule 1 & Rule 2).
   */
  pricing?: ResolvedPriceResult;
  /**
   * Direct integer paise values (used when rendering from legacy or subtotal structures).
   */
  finalPricePaise?: number;
  basePricePaise?: number;
  compareAtPricePaise?: number;
  discountPercent?: number;
  badgeLabel?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showTaxLabel?: boolean;
  className?: string;
}

const SIZE_STYLES = {
  xs: {
    final: "text-[11px] font-bold",
    compare: "text-[10px]",
    badge: "text-[9px] px-1 py-0.2",
    tax: "text-[9px]",
    gap: "gap-1.5",
  },
  sm: {
    final: "text-xs sm:text-sm font-bold",
    compare: "text-[11px] sm:text-xs",
    badge: "text-[10px] px-1.5 py-0.5",
    tax: "text-[10px]",
    gap: "gap-2",
  },
  md: {
    final: "text-sm sm:text-base font-bold",
    compare: "text-xs sm:text-sm",
    badge: "text-[10px] sm:text-[11px] px-2 py-0.5",
    tax: "text-[11px]",
    gap: "gap-2 sm:gap-2.5",
  },
  lg: {
    final: "text-lg sm:text-xl font-extrabold",
    compare: "text-sm sm:text-base",
    badge: "text-xs px-2 py-0.5",
    tax: "text-xs",
    gap: "gap-2.5 sm:gap-3",
  },
  xl: {
    final: "text-2xl sm:text-3xl font-extrabold",
    compare: "text-base sm:text-lg",
    badge: "text-xs sm:text-sm px-2.5 py-0.5",
    tax: "text-xs",
    gap: "gap-3 sm:gap-3.5",
  },
};

export function PriceTag({
  pricing,
  finalPricePaise,
  basePricePaise,
  compareAtPricePaise,
  discountPercent: directDiscountPercent,
  size = "sm",
  showTaxLabel = false,
  className = "",
}: PriceTagProps) {
  // Extract canonical values strictly in integer paise
  const finalPrice =
    pricing?.finalPrice ??
    finalPricePaise ??
    pricing?.basePrice ??
    basePricePaise ??
    0;

  const compareAtPrice =
    pricing?.compareAtPrice ??
    compareAtPricePaise ??
    (pricing?.finalPrice !== undefined && pricing.basePrice > pricing.finalPrice
      ? pricing.basePrice
      : undefined) ??
    (finalPricePaise !== undefined && basePricePaise && basePricePaise > finalPricePaise
      ? basePricePaise
      : undefined);

  const discountPercent =
    pricing?.discountPercent ??
    directDiscountPercent ??
    (compareAtPrice && compareAtPrice > finalPrice
      ? Math.round(((compareAtPrice - finalPrice) / compareAtPrice) * 100)
      : 0);

  const isDiscounted = discountPercent > 0 && compareAtPrice && compareAtPrice > finalPrice;
  const styles = SIZE_STYLES[size] || SIZE_STYLES.sm;

  return (
    <div className={`inline-flex flex-wrap items-baseline ${styles.gap} ${className}`}>
      {/* 1. Final Payable Price */}
      <span className={`${styles.final} text-[#121212] tracking-tight`}>
        {formatCurrency(finalPrice)}
      </span>

      {/* 2. Struck-Through Reference Price (Only when discount applies) */}
      {isDiscounted && (
        <span
          className={`${styles.compare} text-neutral-400 line-through font-normal tracking-tight`}
          aria-label={`Original price: ${formatCurrency(compareAtPrice)}`}
        >
          {formatCurrency(compareAtPrice)}
        </span>
      )}

      {/* 3. Discount Percentage Label in Accent Bronze */}
      {isDiscounted && (
        <span
          className={`${styles.badge} font-bold uppercase tracking-wider text-[#8C7A58] bg-[#8C7A58]/10 rounded-md`}
          aria-label={`${discountPercent} percent discount`}
        >
          {discountPercent}% OFF
        </span>
      )}

      {/* 4. Optional Tax Inclusive Label */}
      {showTaxLabel && (
        <span className={`${styles.tax} text-neutral-500 font-light ml-0.5`}>
          (Incl. all taxes)
        </span>
      )}
    </div>
  );
}

export default PriceTag;

