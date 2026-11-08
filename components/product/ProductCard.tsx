"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { PriceTag } from "./PriceTag";
import { useCart } from "@/components/store/CartContext";
import type { CatalogProductItem } from "@/lib/catalog";
import { getColorHex } from "@/lib/collections";

export interface ProductCardProps {
  product: CatalogProductItem;
  className?: string;
}

export function ProductCard({ product, className = "" }: ProductCardProps) {
  const { addToCart, openCart } = useCart();
  const [isSizePickerOpen, setIsSizePickerOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);

  const displayImage = product.firstImage || product.images?.[0] || "/images/placeholder.jpg";
  const hoverImage =
    product.secondImage ||
    (product.images && product.images.length > 1 ? product.images[1] : displayImage);
  const hasMultipleImages = hoverImage !== displayImage;

  // 1. Badge Priority: Sale badge wins over NEW DROP (< 14 days)
  const hasSaleBadge = Boolean(
    product.pricing?.badgeLabel ||
      (product.pricing?.discountPercent && product.pricing.discountPercent > 0),
  );
  const saleBadgeLabel =
    product.pricing?.badgeLabel ||
    (product.pricing?.discountPercent ? `${product.pricing.discountPercent}% OFF` : null);

  const isNewDrop = product.createdAt
    ? Date.now() - new Date(product.createdAt).getTime() < 14 * 24 * 60 * 60 * 1000
    : false;

  // Swatches
  const swatches =
    product.colorSwatches && product.colorSwatches.length > 0
      ? product.colorSwatches
      : (product.availableColors || []).map((c) => ({
          name: c,
          hex: getColorHex(c),
        }));

  const handleQuickAdd = async (size: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setSelectedSize(size);
    setIsAdding(true);

    // Find corresponding variant if variants list exists, otherwise default fallback
    const targetVariant = product.variants?.find((v) => {
      const vSize = v.options?.Size || v.options?.size;
      return vSize === size && v.stock > 0;
    }) || product.variants?.[0];

    const variantId = targetVariant?._id || `${product._id}-${size}`;

    try {
      await addToCart(variantId, 1);
      setAddedSuccess(true);
      setTimeout(() => {
        setAddedSuccess(false);
        setIsSizePickerOpen(false);
        openCart();
      }, 500);
    } catch (err) {
      console.error("Quick add failed:", err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className={`group relative flex flex-col ${className}`}>
      {/* =========================================================================
          THUMBNAIL CONTAINER
      ========================================================================= */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-[#F0EBE1] border border-[#E8E2D6] shadow-sm">
        <Link href={`/product/${product.slug}`} className="block w-full h-full">
          {/* Primary Image */}
          <Image
            src={displayImage}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-cover object-center transition-all duration-700 ease-out ${
              hasMultipleImages
                ? "group-hover:opacity-0 group-hover:scale-105"
                : "group-hover:scale-105"
            }`}
          />

          {/* Secondary Image Crossfade on Hover */}
          {hasMultipleImages && (
            <Image
              src={hoverImage}
              alt={`${product.name} secondary view`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="absolute inset-0 object-cover object-center opacity-0 transition-all duration-700 ease-out group-hover:opacity-100 group-hover:scale-105"
            />
          )}
        </Link>

        {/* =======================================================================
            TOP-LEFT BADGE: Sale Badge WINS over NEW DROP (< 14 days)
        ======================================================================= */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 items-start pointer-events-none">
          {hasSaleBadge && saleBadgeLabel ? (
            <span className="bg-[#8C7A58] text-white text-[9.5px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md shadow-sm">
              {saleBadgeLabel}
            </span>
          ) : isNewDrop ? (
            <span className="bg-black/85 text-[#FBF9F5] text-[9.5px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-md backdrop-blur-sm shadow-sm border border-white/10">
              NEW DROP
            </span>
          ) : null}

          {!product.hasStock && (
            <span className="bg-neutral-900/90 text-white text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded backdrop-blur-sm">
              Sold Out
            </span>
          )}
        </div>

        {/* Brand Label (Bottom-Left) */}
        {product.brand && (
          <div className="absolute bottom-3 left-3 z-10 bg-[#FBF9F5]/90 text-neutral-800 text-[9.5px] font-semibold tracking-wider px-2 py-0.5 rounded backdrop-blur-sm border border-[#EAE3D4]/60 pointer-events-none">
            {product.brand.name}
          </div>
        )}

        {/* =======================================================================
            QUICK-ADD "+" BUTTON (Bottom-Right)
        ======================================================================= */}
        {product.hasStock && (
          <div className="absolute bottom-3 right-3 z-20">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsSizePickerOpen((prev) => !prev);
              }}
              aria-label={`Quick add ${product.name} to bag`}
              aria-expanded={isSizePickerOpen}
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-sm sm:text-base shadow-md transition-all duration-200 active:scale-95 ${
                isSizePickerOpen
                  ? "bg-[#121212] text-white rotate-45"
                  : "bg-white/95 text-neutral-900 hover:bg-[#8C7A58] hover:text-white"
              }`}
            >
              +
            </button>
          </div>
        )}

        {/* =======================================================================
            INLINE SIZE PICKER POPOVER
        ======================================================================= */}
        {isSizePickerOpen && (
          <div
            className="absolute inset-x-3 bottom-14 z-30 bg-[#FBF9F5] rounded-xl p-3 border border-[#EAE3D4] shadow-xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#EAE3D4]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-600">
                Select Size
              </span>
              <button
                type="button"
                onClick={() => setIsSizePickerOpen(false)}
                className="text-neutral-400 hover:text-black text-xs font-bold px-1"
                aria-label="Close size picker"
              >
                ✕
              </button>
            </div>

            {product.availableSizes.length > 0 ? (
              <div className="grid grid-cols-4 gap-1.5">
                {product.availableSizes.map((sz) => {
                  const variant = product.variants?.find((v) => {
                    const s = v.options?.Size || v.options?.size;
                    return s === sz;
                  });
                  const isOutOfStock = variant ? variant.stock <= 0 : false;
                  const isCurrent = selectedSize === sz && isAdding;

                  return (
                    <button
                      key={sz}
                      type="button"
                      disabled={isOutOfStock || isAdding}
                      onClick={(e) => handleQuickAdd(sz, e)}
                      className={`py-1.5 text-center text-xs font-bold rounded-lg transition-all ${
                        isOutOfStock
                          ? "bg-neutral-100 text-neutral-300 line-through cursor-not-allowed"
                          : isCurrent
                          ? "bg-[#8C7A58] text-white"
                          : "bg-white text-neutral-800 border border-[#EAE3D4] hover:border-[#8C7A58] hover:text-[#8C7A58]"
                      }`}
                    >
                      {isCurrent ? "..." : sz}
                    </button>
                  );
                })}
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => handleQuickAdd("Standard", e)}
                disabled={isAdding}
                className="w-full py-1.5 bg-[#8C7A58] text-white text-xs font-bold rounded-lg hover:bg-[#786747]"
              >
                {isAdding ? "Adding..." : "Add One Size"}
              </button>
            )}

            {addedSuccess && (
              <p className="mt-2 text-center text-[10px] font-bold text-emerald-700 animate-pulse">
                ✓ Added to bag
              </p>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          PRODUCT META
      ========================================================================= */}
      <div className="mt-3 flex flex-col space-y-1.5">
        {/* Name truncated to 1 line with tooltip */}
        <Link
          href={`/product/${product.slug}`}
          title={product.name}
          className="text-xs sm:text-sm font-semibold tracking-tight text-[#121212] hover:underline truncate"
        >
          {product.name}
        </Link>

        {/* Color Swatches */}
        {swatches.length > 0 && (
          <div className="flex items-center gap-1.5 pt-0.5" aria-label="Available colors">
            {swatches.slice(0, 5).map((swatch) => (
              <span
                key={swatch.name}
                title={swatch.name}
                className="inline-block w-3 h-3 rounded-full border border-black/15 shadow-2xs"
                style={{ backgroundColor: swatch.hex }}
              />
            ))}
            {swatches.length > 5 && (
              <span className="text-[10px] text-neutral-400 font-mono">
                +{swatches.length - 5}
              </span>
            )}
          </div>
        )}

        {/* PriceTag */}
        <div className="pt-0.5">
          <PriceTag
            pricing={product.pricing}
            finalPricePaise={product.basePricePaise}
            compareAtPricePaise={product.compareAtPricePaise}
            size="sm"
          />
        </div>
      </div>
    </div>
  );
}

export default ProductCard;

