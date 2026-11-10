"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import type { CatalogProductItem } from "@/lib/catalog";
import type { DetailedProduct } from "@/lib/catalog";

interface SimilarProductsSectionProps {
  currentProduct: DetailedProduct;
  initialProducts: CatalogProductItem[];
}

export function SimilarProductsSection({
  currentProduct,
  initialProducts,
}: SimilarProductsSectionProps) {
  const [products, setProducts] = useState<CatalogProductItem[]>(initialProducts);
  const [isLoading, setIsLoading] = useState(false);
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  // If initialProducts was empty or low, attempt client-side fetch with localStorage recent views
  useEffect(() => {
    if (initialProducts.length >= 4) return;

    try {
      const raw = localStorage.getItem("malli_recent_views");
      let recentSlugs: string[] = [];
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          recentSlugs = parsed.filter((s): s is string => typeof s === "string");
        }
      }

      setIsLoading(true);
      fetch(
        `/api/products/recommendations?slug=${encodeURIComponent(
          currentProduct.slug,
        )}&recentSlugs=${encodeURIComponent(recentSlugs.join(","))}&limit=8`,
      )
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.success && Array.isArray(data.similarProducts) && data.similarProducts.length > 0) {
            setProducts(data.similarProducts);
          }
        })
        .catch((err) => console.warn("Failed to load similar products:", err))
        .finally(() => setIsLoading(false));
    } catch {
      // Ignore storage errors
    }
  }, [currentProduct.slug, initialProducts.length]);

  const toggleWishlist = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWishlist((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const cardWidth = scrollRef.current.clientWidth * 0.5;
    const offset = direction === "left" ? -cardWidth : cardWidth;
    scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
  };

  const formatRupees = (paise: number) => {
    const rupees = (paise / 100).toFixed(2);
    const parts = rupees.split(".");
    const integerPart = parts[0];
    const decimalPart = parts[1] === "00" ? "" : `.${parts[1]}`;
    // Indian numbering format
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    const formattedInteger =
      otherNumbers !== ""
        ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree
        : lastThree;
    return `₹${formattedInteger}${decimalPart}`;
  };

  if (!isLoading && products.length === 0) {
    return null;
  }

  return (
    <section className="relative w-full border-t border-[#EAE3D4] bg-[#FAF8F5]/80 py-16 sm:py-20 px-4 sm:px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Header with Title and Scroll Controls */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-12">
          <div>
            <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold tracking-[0.22em] text-[#8C7A58] uppercase mb-1.5">
              <span>—</span>
              <span>Personalized Selection</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-[#121212] tracking-tight">
              Similar Styles &amp; <span className="italic font-normal">Recommendations</span>
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 font-light mt-1.5 max-w-xl">
              Intelligently recommended based on your silhouette preferences, fabrics, and wardrobe history.
            </p>
          </div>

          {/* Left / Right Carousel Controls */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => scroll("left")}
              aria-label="Scroll left"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#DCD5C8] bg-white text-neutral-800 hover:bg-[#121212] hover:text-white hover:border-[#121212] flex items-center justify-center transition-all active:scale-95 shadow-xs cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              aria-label="Scroll right"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#DCD5C8] bg-white text-neutral-800 hover:bg-[#121212] hover:text-white hover:border-[#121212] flex items-center justify-center transition-all active:scale-95 shadow-xs cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Horizontal Carousel Track */}
        <div
          ref={scrollRef}
          className="flex gap-4 sm:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 pt-1 scrollbar-none select-none"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {products.map((item) => {
            const displayImage = item.firstImage || "/images/placeholder.jpg";
            const hoverImage = item.secondImage || displayImage;
            const hasHover = hoverImage !== displayImage;
            const isWishlisted = Boolean(wishlist[item._id]);

            const finalPricePaise = item.pricing?.finalPrice || item.basePricePaise;
            const compareAtPaise =
              item.pricing?.compareAtPrice && item.pricing.compareAtPrice > finalPricePaise
                ? item.pricing.compareAtPrice
                : item.compareAtPricePaise && item.compareAtPricePaise > finalPricePaise
                ? item.compareAtPricePaise
                : undefined;

            const discountPercent =
              item.pricing?.discountPercent ||
              (compareAtPaise
                ? Math.round(((compareAtPaise - finalPricePaise) / compareAtPaise) * 100)
                : 0);

            const badgeLabel = item.recommendationReason || "Recommended For You";

            // Swatches
            const swatches =
              item.colorSwatches && item.colorSwatches.length > 0
                ? item.colorSwatches.slice(0, 3)
                : (item.availableColors || []).slice(0, 3).map((c) => ({
                    name: c,
                    hex: "#1A2B4C",
                  }));

            const moreColorsCount = Math.max(0, (item.availableColors?.length || 0) - 3);

            return (
              <div
                key={item._id}
                className="w-[calc(78vw-16px)] sm:w-[calc(46vw-16px)] md:w-[calc(31vw-16px)] lg:w-[calc(25%-18px)] flex-shrink-0 snap-start"
              >
                <div className="group relative flex flex-col rounded-2xl bg-white border border-[#EAE3D4]/90 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_10px_28px_rgba(0,0,0,0.07)] transition-all duration-300 h-full">
                  {/* Photo Container */}
                  <div className="relative aspect-[4/5] w-full overflow-hidden rounded-t-2xl bg-[#F4EFE6]">
                    <Link href={`/product/${item.slug}`} className="block w-full h-full">
                      <Image
                        src={displayImage}
                        alt={item.name}
                        fill
                        sizes="(max-width: 640px) 78vw, (max-width: 1024px) 33vw, 25vw"
                        className={`object-cover object-center transition-all duration-700 ease-out ${
                          hasHover ? "group-hover:opacity-0 group-hover:scale-105" : "group-hover:scale-105"
                        }`}
                      />
                      {hasHover && (
                        <Image
                          src={hoverImage}
                          alt={`${item.name} preview`}
                          fill
                          sizes="(max-width: 640px) 78vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-cover object-center absolute inset-0 opacity-0 transition-all duration-700 ease-out group-hover:opacity-100 group-hover:scale-105"
                        />
                      )}
                    </Link>

                    {/* Top Left: Atelier Recommendation Badge */}
                    <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-md bg-[#1B1917]/85 backdrop-blur-md text-[9px] font-bold uppercase tracking-[0.14em] text-[#FAF6F0] pointer-events-none shadow-xs">
                      {badgeLabel}
                    </span>

                    {/* Top Right: Wishlist Heart */}
                    <button
                      type="button"
                      onClick={(e) => toggleWishlist(item._id, e)}
                      aria-label="Add to wishlist"
                      className={`absolute top-3 right-3 z-10 w-8 h-8 rounded-full backdrop-blur-md border border-white/60 flex items-center justify-center transition-all shadow-xs cursor-pointer ${
                        isWishlisted
                          ? "bg-white text-red-500 scale-105"
                          : "bg-white/80 text-neutral-700 hover:text-red-500 hover:bg-white hover:scale-110 active:scale-95"
                      }`}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill={isWishlisted ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-4 h-4"
                      >
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                      </svg>
                    </button>

                    {/* Bottom Left: Brand / Category pill */}
                    {(item.category?.name || item.brand?.name) && (
                      <span className="absolute bottom-3 left-3 z-10 px-2.5 py-0.5 rounded bg-[#FAF7F2]/95 backdrop-blur-xs text-neutral-800 text-[9.5px] font-semibold tracking-wider shadow-xs pointer-events-none border border-[#EAE3D4]/50">
                        {item.category?.name || item.brand?.name}
                      </span>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between gap-3">
                    {/* Title */}
                    <Link href={`/product/${item.slug}`}>
                      <h3 className="text-xs sm:text-sm font-semibold text-neutral-900 truncate group-hover:text-[#8C7A58] transition-colors">
                        {item.name}
                      </h3>
                    </Link>

                    {/* Swatches & Arrow Button Row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {swatches.map((s, sIdx) => (
                          <span
                            key={sIdx}
                            title={s.name}
                            className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-2xs inline-block"
                            style={{ backgroundColor: s.hex }}
                          />
                        ))}
                        {moreColorsCount > 0 && (
                          <span className="text-[10px] text-neutral-500 font-medium ml-0.5">
                            +{moreColorsCount} more
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/product/${item.slug}`}
                        aria-label={`View ${item.name}`}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-neutral-300 hover:border-neutral-900 flex items-center justify-center text-neutral-600 hover:text-black transition-all hover:scale-105 active:scale-95"
                      >
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-2">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>

                    {/* Price Row: Strict Integer Paise (Rule 2) */}
                    <div className="flex items-center gap-2 pt-1 border-t border-[#F2ECE1]">
                      <span className="text-xs sm:text-sm font-bold text-neutral-900 tracking-tight">
                        {formatRupees(finalPricePaise)}
                      </span>

                      {compareAtPaise && (
                        <span className="text-[11px] sm:text-xs text-neutral-400 line-through">
                          {formatRupees(compareAtPaise)}
                        </span>
                      )}

                      {discountPercent > 0 && (
                        <span className="text-[9px] sm:text-[10px] font-bold text-[#8C7A58] bg-[#F7F2E7] px-1.5 py-0.5 rounded tracking-wide ml-auto">
                          {discountPercent}% OFF
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

