"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { formatCurrency } from "@/lib/currency";
import type { ResolvedCollectionResult, CollectionProductItem } from "@/lib/collections";

export interface SeasonPicksProps {
  initialCollection?: ResolvedCollectionResult | null;
}

type FilterType = "all" | "men" | "kids" | "casual" | "traditional";

interface FilterButtonDef {
  id: FilterType;
  label: string;
  icon?: (props: React.SVGProps<SVGSVGElement>) => React.JSX.Element;
}

// Crisp, bespoke vector icons matching the reference design
function IconShirt(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5" {...props}>
      <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
    </svg>
  );
}

function IconKid(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5" {...props}>
      <circle cx="12" cy="13" r="7" />
      <circle cx="6.5" cy="7.5" r="3" />
      <circle cx="17.5" cy="7.5" r="3" />
      <circle cx="9.5" cy="12.5" r="0.75" fill="currentColor" />
      <circle cx="14.5" cy="12.5" r="0.75" fill="currentColor" />
      <path d="M10 15.5c.6.6 1.4.9 2 .9s1.4-.3 2-.9" />
    </svg>
  );
}

function IconHanger(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5" {...props}>
      <path d="M12 2a2 2 0 0 0-2 2c0 .74.4 1.39 1 1.73V7L3.5 12a1.5 1.5 0 0 0 .8 2.6L12 17l7.7-2.4a1.5 1.5 0 0 0 .8-2.6L13 7V5.73A2 2 0 0 0 12 2z" />
    </svg>
  );
}

function IconLotus(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5" {...props}>
      <path d="M12 3c-1.5 2.5-3 5.5-3 9 0 3.5 1.5 6.5 3 9 1.5-2.5 3-5.5 3-9 0-3.5-1.5-6.5-3-9z" />
      <path d="M12 12c-2.5-1.5-5.5-2.5-8.5-1 0 4 3 7 8.5 10" />
      <path d="M12 12c2.5-1.5 5.5-2.5 8.5-1 0 4-3 7-8.5 10" />
    </svg>
  );
}

const FILTER_BUTTONS: FilterButtonDef[] = [
  { id: "all", label: "All Picks" },
  { id: "men", label: "Men's Wear", icon: IconShirt },
  { id: "kids", label: "Kids' Wear", icon: IconKid },
  { id: "casual", label: "Casual Wear", icon: IconHanger },
  { id: "traditional", label: "Traditional Wear", icon: IconLotus },
];

function getEditorialTag(item: CollectionProductItem): string {
  const name = item.name.toLowerCase();
  const cat = (item.category?.name || "").toLowerCase();
  if (name.includes("jean") || cat.includes("jean") || name.includes("denim")) {
    return "DENIM ESSENTIALS";
  }
  if (item.gender === "KIDS" || cat.includes("kid")) {
    return "KIDS COLLECTION";
  }
  if (name.includes("oxford") || name.includes("plain shirt") || name.includes("classic")) {
    return "EVERYDAY CLASSIC";
  }
  if (name.includes("pant") || name.includes("trouser") || name.includes("lycra") || name.includes("derby")) {
    return "SMART CASUAL";
  }
  if (name.includes("kurta") || name.includes("festive") || cat.includes("festive")) {
    return "FESTIVE EDIT";
  }
  return "SMART CASUAL";
}

export function SeasonPicks({ initialCollection }: SeasonPicksProps) {
  const prefersReducedMotion = useReducedMotion();
  const [collection, setCollection] = useState<ResolvedCollectionResult | null>(
    initialCollection ?? null,
  );
  const [products, setProducts] = useState<CollectionProductItem[]>(
    initialCollection?.products ?? [],
  );
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState<boolean>(!initialCollection);
  const [isFiltering, setIsFiltering] = useState<boolean>(false);
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activePageIndex, setActivePageIndex] = useState(0);

  // Drag-to-scroll state
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);
  const lastX = useRef(0);
  const velocity = useRef(0);
  const animFrameId = useRef<number | null>(null);

  // Initial fetch if collection not provided via props
  useEffect(() => {
    if (initialCollection) {
      setCollection(initialCollection);
      setProducts(initialCollection.products || []);
      setLoading(false);
      return;
    }

    let isMounted = true;
    fetch("/api/collections/featured?filter=all")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted) {
          if (data?.success && data.collection) {
            setCollection(data.collection);
            setProducts(data.collection.products || []);
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [initialCollection]);

  // Fetch filtered data from backend when clicking filter buttons
  const handleFilterSelect = useCallback(async (filterId: FilterType) => {
    setActiveFilter(filterId);
    setIsFiltering(true);

    try {
      const targetSlug = collection?.slug;
      const endpoint = targetSlug
        ? `/api/collections/${targetSlug}?filter=${filterId}`
        : `/api/collections/featured?filter=${filterId}`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (data?.success && data.collection?.products) {
          setProducts(data.collection.products);
          setCollection(data.collection);
        }
      }
    } catch (err) {
      console.error("Failed to filter collection products:", err);
    } finally {
      setIsFiltering(false);
      // Reset scroll position to start smoothly
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
      }
    }
  }, [collection?.slug]);

  // Update arrow buttons visibility and pagination indicator
  const updateScrollState = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);

    const maxScroll = Math.max(1, scrollWidth - clientWidth);
    const scrollPercent = Math.min(1, Math.max(0, scrollLeft / maxScroll));
    const page = Math.min(2, Math.round(scrollPercent * 2));
    setActivePageIndex(page);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [products, updateScrollState]);

  const scrollByDirection = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!scrollRef.current || e.button !== 0) return;
    isDown.current = true;
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeftStart.current = scrollRef.current.scrollLeft;
    lastX.current = e.pageX;
    velocity.current = 0;
    if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDown.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.2;
    scrollRef.current.scrollLeft = scrollLeftStart.current - walk;
    velocity.current = e.pageX - lastX.current;
    lastX.current = e.pageX;
  };

  const handlePointerUpOrLeave = () => {
    if (!isDown.current || !scrollRef.current) return;
    isDown.current = false;
    if (!prefersReducedMotion && Math.abs(velocity.current) > 3) {
      let currentVelocity = velocity.current * 8;
      const step = () => {
        if (!scrollRef.current || Math.abs(currentVelocity) < 0.5) return;
        scrollRef.current.scrollLeft -= currentVelocity;
        currentVelocity *= 0.92;
        animFrameId.current = requestAnimationFrame(step);
      };
      animFrameId.current = requestAnimationFrame(step);
    }
  };

  const toggleWishlist = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWishlist((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Loading skeleton
  if (loading) {
    return (
      <section className="w-[calc(100%-32px)] max-w-7xl mx-auto py-12" aria-label="Loading Season's Top Picks">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="space-y-2">
            <div className="h-4 w-40 bg-neutral-200 rounded animate-pulse" />
            <div className="h-8 w-72 bg-neutral-200 rounded animate-pulse" />
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-9 w-24 bg-neutral-200 rounded-full animate-pulse" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-[4/5] bg-neutral-200 rounded-2xl animate-pulse" />
              <div className="h-4 bg-neutral-200 rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-neutral-200 rounded w-1/2 animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label="Season's Top Picks"
      className="w-[calc(100%-32px)] max-w-7xl mx-auto py-10 sm:py-16"
    >
      {/* =========================================================================
          HEADER & INTERACTIVE BACKEND FILTER BUTTONS ROW (EXACT REFERENCE DESIGN)
      ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 sm:mb-10">
        {/* Left: Eyebrow, Serif Title with Italic Accent & Subtitle */}
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold uppercase tracking-[0.22em] text-[#8C7A58]">
            <span className="w-5 h-[1.5px] bg-[#8C7A58]" aria-hidden="true" />
            <span>Curated Atelier Selection</span>
          </div>
          {collection?.title ? (
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-serif text-[#121212] tracking-tight leading-tight">
              {collection.title}
            </h2>
          ) : (
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-serif text-[#121212] tracking-tight leading-tight">
              Season&apos;s <span className="italic font-normal">Top Picks</span>
            </h2>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-xs sm:text-sm text-neutral-500 font-light">
              {collection?.subtitle || "Our most sought-after styles, handpicked for the season."}
            </p>
            {collection?.slug && (
              <Link
                href={`/collections/${collection.slug}`}
                className="text-xs font-semibold text-[#8C7A58] hover:text-[#706144] hover:underline inline-flex items-center gap-1"
              >
                <span>View Full Collection</span>
                <span>→</span>
              </Link>
            )}
          </div>
        </div>

        {/* Right: Pill Filter Buttons */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {FILTER_BUTTONS.map((btn) => {
            const isActive = activeFilter === btn.id;
            const Icon = btn.icon;

            return (
              <button
                key={btn.id}
                type="button"
                onClick={() => handleFilterSelect(btn.id)}
                className={`inline-flex items-center gap-2 px-4 sm:px-4.5 py-2 rounded-full text-xs font-medium tracking-wide transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#26221C] text-white border border-[#26221C] shadow-sm scale-[1.02]"
                    : "bg-white hover:bg-[#FAF7F2] text-neutral-700 hover:text-black border border-[#E5DECF] hover:border-neutral-400 shadow-xs active:scale-95"
                }`}
              >
                {Icon && (
                  <span className={isActive ? "text-white" : "text-neutral-500"}>
                    <Icon />
                  </span>
                )}
                <span>{btn.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          CAROUSEL VIEWPORT & PRODUCT CARDS
      ========================================================================= */}
      <div className="relative">
        {/* Desktop Previous Button */}
        <button
          type="button"
          onClick={() => scrollByDirection("left")}
          disabled={!canScrollLeft}
          aria-label="Previous items"
          className={`hidden md:flex absolute -left-4 top-[40%] -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/95 border border-[#EAE3D4] text-[#121212] items-center justify-center shadow-lg transition-all ${
            canScrollLeft
              ? "hover:bg-[#26221C] hover:text-white cursor-pointer hover:scale-105 active:scale-95"
              : "opacity-0 pointer-events-none"
          }`}
        >
          ←
        </button>

        {/* Desktop Next Button */}
        <button
          type="button"
          onClick={() => scrollByDirection("right")}
          disabled={!canScrollRight}
          aria-label="Next items"
          className={`hidden md:flex absolute -right-4 top-[40%] -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/95 border border-[#EAE3D4] text-[#121212] items-center justify-center shadow-lg transition-all ${
            canScrollRight
              ? "hover:bg-[#26221C] hover:text-white cursor-pointer hover:scale-105 active:scale-95"
              : "opacity-0 pointer-events-none"
          }`}
        >
          →
        </button>

        {/* Horizontal Card Track: 4 cards visible on desktop */}
        <div
          ref={scrollRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUpOrLeave}
          onPointerCancel={handlePointerUpOrLeave}
          className={`flex gap-4 sm:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory py-2 scrollbar-none select-none transition-opacity duration-300 ${
            isFiltering ? "opacity-60" : "opacity-100"
          }`}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          aria-live="polite"
        >
          <AnimatePresence mode="popLayout">
            {products.map((item, idx) => {
              const displayImage = item.firstImage || "/images/placeholder.jpg";
              const hoverImage = item.secondImage || displayImage;
              const hasHover = hoverImage !== displayImage;
              const editorialTag = getEditorialTag(item);
              const isWishlisted = Boolean(wishlist[item._id]);

              const discountPercent = item.pricing?.discountPercent ?? 0;
              const compareAtPricePaise =
                item.pricing?.compareAtPrice && item.pricing.compareAtPrice > item.pricing.finalPrice
                  ? item.pricing.compareAtPrice
                  : undefined;

              // Swatches: primary 3 colors
              const swatches =
                item.colorSwatches && item.colorSwatches.length > 0
                  ? item.colorSwatches
                  : [
                      { name: "Navy Blue", hex: "#1A2B4C" },
                      { name: "Khaki", hex: "#C3B091" },
                      { name: "Charcoal", hex: "#36454F" },
                    ];

              const moreCount = Math.max(0, (item.availableSizes?.length || 4) - 1);

              return (
                <motion.div
                  key={item._id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    duration: prefersReducedMotion ? 0.01 : 0.4,
                    delay: prefersReducedMotion ? 0 : Math.min(idx * 0.06, 0.24),
                    ease: "easeOut",
                  }}
                  className="w-[calc(80vw-16px)] sm:w-[calc(48vw-16px)] md:w-[calc(32vw-18px)] lg:w-[calc(25%-18px)] flex-shrink-0 snap-start"
                >
                  <div className="group relative flex flex-col rounded-2xl bg-white border border-[#EDE7DC]/80 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 h-full">
                    {/* Top Image Container */}
                    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-t-2xl bg-[#F4EFE6]">
                      <Link href={`/product/${item.slug}`} className="block w-full h-full">
                        <Image
                          src={displayImage}
                          alt={item.name}
                          fill
                          sizes="(max-width: 640px) 80vw, (max-width: 1024px) 33vw, 25vw"
                          className={`object-cover object-center transition-all duration-700 ease-out ${
                            hasHover ? "group-hover:opacity-0 group-hover:scale-105" : "group-hover:scale-105"
                          }`}
                        />
                        {hasHover && (
                          <Image
                            src={hoverImage}
                            alt={`${item.name} alternate view`}
                            fill
                            sizes="(max-width: 640px) 80vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover object-center absolute inset-0 opacity-0 transition-all duration-700 ease-out group-hover:opacity-100 group-hover:scale-105"
                          />
                        )}
                      </Link>

                      {/* Top Left: MALLI & CO. EDIT badge */}
                      <span className="absolute top-3 left-3 z-10 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded bg-[#2D2821]/80 backdrop-blur-md text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.16em] text-[#FAF6F0] pointer-events-none">
                        Malli &amp; Co. Edit
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

                      {/* Bottom Left: Curated Category Pill */}
                      <span className="absolute bottom-3 left-3 z-10 px-2.5 py-1 rounded bg-[#FAF7F2]/95 backdrop-blur-xs text-neutral-900 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shadow-xs pointer-events-none">
                        {editorialTag}
                      </span>
                    </div>

                    {/* Card Details Body */}
                    <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between gap-3">
                      {/* Title */}
                      <Link href={`/product/${item.slug}`}>
                        <h3 className="text-xs sm:text-sm font-semibold text-neutral-900 truncate group-hover:text-[#8C7A58] transition-colors">
                          {item.name}
                        </h3>
                      </Link>

                      {/* Swatches & Arrow Action Row */}
                      <div className="flex items-center justify-between gap-2">
                        {/* Color swatches */}
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center -space-x-1">
                            {swatches.slice(0, 3).map((swatch, sIdx) => (
                              <span
                                key={`${swatch.name}-${sIdx}`}
                                style={{ backgroundColor: swatch.hex }}
                                title={swatch.name}
                                className="w-3.5 h-3.5 rounded-full border border-white shadow-xs"
                              />
                            ))}
                          </div>
                          <span className="text-[11px] sm:text-xs text-neutral-500 font-medium pl-1">
                            +{moreCount > 0 ? moreCount : 3} more
                          </span>
                        </div>

                        {/* Round Arrow Button linking to Product */}
                        <Link
                          href={`/product/${item.slug}`}
                          aria-label={`View ${item.name}`}
                          className="w-8 h-8 rounded-full border border-neutral-300 flex items-center justify-center text-neutral-700 group-hover:border-black group-hover:bg-black group-hover:text-white transition-all shadow-xs cursor-pointer hover:scale-105 active:scale-95"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-3.5 h-3.5"
                          >
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                          </svg>
                        </Link>
                      </div>

                      {/* Price Row */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#F0EBE1]">
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold text-xs sm:text-sm text-neutral-900 font-serif">
                            {formatCurrency(item.pricing.finalPrice)}
                          </span>
                          {compareAtPricePaise && (
                            <span className="line-through text-[11px] text-neutral-400 font-normal">
                              {formatCurrency(compareAtPricePaise)}
                            </span>
                          )}
                        </div>

                        {discountPercent > 0 && (
                          <span className="bg-[#F4ECE1] text-[#7A6945] text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded">
                            {discountPercent}% OFF
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* =========================================================================
          BOTTOM SECTION: PAGINATION DOTS & VIEW ALL PICKS BUTTON
      ========================================================================= */}
      <div className="mt-8 sm:mt-12 flex flex-col items-center gap-6">
        {/* Pagination Dots Indicator */}
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (!scrollRef.current) return;
                const { scrollWidth, clientWidth } = scrollRef.current;
                const max = scrollWidth - clientWidth;
                scrollRef.current.scrollTo({ left: (max / 2) * idx, behavior: "smooth" });
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                activePageIndex === idx ? "w-6 bg-[#26221C]" : "w-1.5 bg-neutral-300 hover:bg-neutral-400"
              }`}
            />
          ))}
        </div>

        {/* View All Picks CTA Button */}
        <Link
          href={`/collection/${collection?.slug || "seasons-top-picks"}`}
          className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#26221C] hover:bg-[#121212] text-white text-xs font-serif font-bold uppercase tracking-[0.2em] shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <span>View All Picks</span>
          <span className="text-sm font-sans">→</span>
        </Link>
      </div>
    </section>
  );
}

export default SeasonPicks;
