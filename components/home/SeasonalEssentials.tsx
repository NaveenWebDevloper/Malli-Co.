"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { CatalogProductItem } from "@/lib/catalog";

export const FALLBACK_SEASONAL_BANNER = "/uploads/banners/banner-1794072819742-31a3ae6d.png";

export interface SeasonalEssentialsProps {
  products: CatalogProductItem[];
  bannerImage?: string;
}

export function SeasonalEssentials({
  products,
  bannerImage = FALLBACK_SEASONAL_BANNER,
}: SeasonalEssentialsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const cardWidth = scrollRef.current.clientWidth * 0.45;
    const offset = direction === "left" ? -cardWidth : cardWidth;
    scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
  };

  const toggleWishlist = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWishlist((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formatRupees = (paise: number) => {
    const rupees = Math.round(paise / 100);
    return `₹${rupees.toLocaleString("en-IN")}`;
  };

  if (!products || products.length === 0) return null;

  return (
    <section className="relative w-full overflow-hidden bg-[#111111] border-b border-[#262626]">
      {/* =========================================================================
          BACKGROUND CAMPAIGN BANNER (Configured strictly by Admin in Admin Console)
      ========================================================================= */}
      <div className="relative w-full min-h-[640px] sm:min-h-[700px] lg:min-h-[780px] xl:min-h-[840px] flex flex-col justify-between">
        {/* Banner Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src={bannerImage || FALLBACK_SEASONAL_BANNER}
            alt="Malli & Co. Autumn Winter Campaign Editorial"
            fill
            priority={false}
            sizes="100vw"
            className="object-cover object-center"
          />
          {/* Subtle gradient overlays to ensure text & cards readability while preserving model clarity */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/75 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />
        </div>

        {/* =======================================================================
            TOP BAR: ATELIER WATERMARK ONLY (No public changing controls)
        ======================================================================= */}
        <div className="relative z-20 w-full px-4 sm:px-8 lg:px-12 pt-6 sm:pt-8 flex items-center justify-end">
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.28em] text-white/60 drop-shadow-sm pointer-events-none">
            Malli &amp; Co.
          </span>
        </div>

        {/* =======================================================================
            CONTENT STAGE: EDITORIAL TYPOGRAPHY & OVERLAPPING CARDS CAROUSEL
        ======================================================================= */}
        <div className="relative z-10 w-full px-4 sm:px-8 lg:px-12 pb-8 sm:pb-12 mt-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            {/* Left Column: Spacer / Atmospheric Focus on Ambassador Image on Desktop */}
            <div className="hidden lg:block lg:col-span-4 xl:col-span-4" />

            {/* Right Column: Campaign Typography Header + Overlapping Cards Carousel */}
            <div className="lg:col-span-8 xl:col-span-8 flex flex-col space-y-6">
              {/* Campaign Typography Header (Customized for Malli & Co.) */}
              <div className="flex flex-col items-start lg:items-end w-full">
                {/* Title Line 1: AUTUMN + Outlined 26 */}
                <div className="flex items-baseline gap-3 sm:gap-4">
                  <h2 className="font-sans font-black tracking-tight text-3xl sm:text-5xl lg:text-6xl xl:text-7xl text-white uppercase drop-shadow-lg leading-none">
                    AUTUMN
                  </h2>
                  <span
                    className="font-sans font-black tracking-tighter text-4xl sm:text-6xl lg:text-7xl xl:text-8xl text-transparent uppercase select-none drop-shadow-md leading-none"
                    style={{
                      WebkitTextStroke: "2px rgba(255, 255, 255, 0.95)",
                    }}
                  >
                    26
                  </span>
                </div>

                {/* Title Line 2: WINTER with Underline Rule */}
                <div className="w-full flex items-center justify-start lg:justify-end border-b-2 border-white/80 pb-2 mt-1 sm:mt-1.5">
                  <h3 className="font-sans font-black tracking-tight text-3xl sm:text-5xl lg:text-6xl xl:text-7xl text-white uppercase drop-shadow-lg leading-none">
                    WINTER
                  </h3>
                </div>

                {/* Sub-bar: Collection Label & SHOP ALL Link */}
                <div className="w-full flex items-center justify-between pt-2">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.24em] text-white/90 drop-shadow-xs">
                    Malli &amp; Co. Collection
                  </span>
                  <Link
                    href="/men"
                    className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white hover:text-[#EDE5D8] transition-colors flex items-center gap-1.5 group cursor-pointer"
                  >
                    <span>Shop All</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </Link>
                </div>
              </div>

              {/* ===================================================================
                  OVERLAPPING CARDS CAROUSEL (3 visible cards on desktop)
              =================================================================== */}
              <div className="relative w-full pt-2">
                {/* Carousel Navigation Buttons (< and >) */}
                <button
                  type="button"
                  onClick={() => handleScroll("left")}
                  aria-label="Previous products"
                  className="absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 z-30 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 hover:bg-white text-black flex items-center justify-center font-bold text-base shadow-xl transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-xs"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2">
                    <path d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => handleScroll("right")}
                  aria-label="Next products"
                  className="absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 z-30 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 hover:bg-white text-black flex items-center justify-center font-bold text-base shadow-xl transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-xs"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Horizontal Scroll Track */}
                <div
                  ref={scrollRef}
                  className="flex gap-3 sm:gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 scrollbar-none select-none"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {products.map((item) => {
                    const displayImage =
                      item.firstImage || item.images?.[0] || "/images/placeholder.jpg";
                    const hoverImage =
                      item.secondImage ||
                      (item.images && item.images.length > 1 ? item.images[1] : displayImage);
                    const hasHover = hoverImage !== displayImage;
                    const isWishlisted = Boolean(wishlist[item._id]);

                    const finalPricePaise = item.pricing?.finalPrice || item.basePricePaise;
                    const compareAtPricePaise =
                      item.pricing?.compareAtPrice &&
                      item.pricing.compareAtPrice > finalPricePaise
                        ? item.pricing.compareAtPrice
                        : item.compareAtPricePaise &&
                          item.compareAtPricePaise > finalPricePaise
                        ? item.compareAtPricePaise
                        : undefined;

                    return (
                      <div
                        key={item._id}
                        className="w-[calc(76vw-16px)] sm:w-[calc(44vw-16px)] md:w-[calc(32vw-16px)] lg:w-[calc(33.333%-11px)] flex-shrink-0 snap-start"
                      >
                        <div className="group relative flex flex-col aspect-[3/4] w-full overflow-hidden rounded-md bg-[#EDE8DE] border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
                          <Link
                            href={`/product/${item.slug}`}
                            className="block w-full h-full relative"
                          >
                            {/* Primary Image */}
                            <Image
                              src={displayImage}
                              alt={item.name}
                              fill
                              sizes="(max-width: 640px) 76vw, (max-width: 1024px) 33vw, 25vw"
                              className={`object-cover object-center transition-all duration-700 ease-out ${
                                hasHover
                                  ? "group-hover:opacity-0 group-hover:scale-105"
                                  : "group-hover:scale-105"
                              }`}
                            />

                            {/* Secondary Image Crossfade on Hover */}
                            {hasHover && (
                              <Image
                                src={hoverImage}
                                alt={`${item.name} alternate view`}
                                fill
                                sizes="(max-width: 640px) 76vw, (max-width: 1024px) 33vw, 25vw"
                                className="object-cover object-center absolute inset-0 opacity-0 transition-all duration-700 ease-out group-hover:opacity-100 group-hover:scale-105"
                              />
                            )}
                          </Link>

                          {/* Top-Left Tag: Solid Black "NEW DROP" (Exact Reference Match) */}
                          <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none">
                            <span className="bg-black text-white text-[9px] sm:text-[9.5px] uppercase font-bold tracking-widest px-2.5 py-1 shadow-sm">
                              NEW DROP
                            </span>
                          </div>

                          {/* Top-Right: Wishlist Heart Button */}
                          <button
                            type="button"
                            onClick={(e) => toggleWishlist(item._id, e)}
                            aria-label="Add to wishlist"
                            className={`absolute top-2.5 right-2.5 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full backdrop-blur-md border border-white/50 flex items-center justify-center transition-all cursor-pointer ${
                              isWishlisted
                                ? "bg-white text-red-500 scale-105 shadow-md"
                                : "bg-black/40 text-white hover:text-red-400 hover:bg-black/70 hover:scale-110 active:scale-95"
                            }`}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill={isWishlisted ? "currentColor" : "none"}
                              stroke="currentColor"
                              strokeWidth="1.75"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="w-3.5 h-3.5"
                            >
                              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                            </svg>
                          </button>

                          {/* =======================================================
                              BOTTOM INFO BAR (Exact Reference Match)
                              Split pill: Price on left, Uppercase title on right
                          ======================================================= */}
                          <Link
                            href={`/product/${item.slug}`}
                            className="absolute inset-x-0 bottom-0 z-10 bg-black/95 text-white flex items-center justify-between py-2.5 px-3 border-t border-white/10 backdrop-blur-xs transition-colors hover:bg-black"
                          >
                            {/* Left: Price in Rupees (Computed Server-Side Rule 1 & 2) */}
                            <div className="flex items-baseline gap-1.5 flex-shrink-0">
                              <span className="text-xs sm:text-sm font-bold tracking-tight text-white">
                                {formatRupees(finalPricePaise)}
                              </span>
                              {compareAtPricePaise && (
                                <span className="text-[10px] text-neutral-400 line-through">
                                  {formatRupees(compareAtPricePaise)}
                                </span>
                              )}
                            </div>

                            {/* Right: Uppercase Truncated Product Name */}
                            <span
                              title={item.name}
                              className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider text-neutral-200 truncate ml-2 text-right group-hover:text-white"
                            >
                              {item.name}
                            </span>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default SeasonalEssentials;
