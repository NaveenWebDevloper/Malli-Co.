"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatCurrency } from "@/lib/currency";
import type { ResolvedCollectionResult } from "@/lib/collections";

interface CollectionViewProps {
  collection: ResolvedCollectionResult;
  otherCollections?: Array<{
    _id: string;
    title: string;
    subtitle?: string;
    slug: string;
    productCount: number;
    mode: string;
  }>;
}

type FilterCategory = "all" | "men" | "kids" | "casual" | "traditional";
type SortOption = "featured" | "price-asc" | "price-desc" | "name";

export function CollectionView({ collection, otherCollections = [] }: CollectionViewProps) {
  const [activeCategory, setActiveCategory] = useState<FilterCategory>("all");
  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});

  const toggleWishlist = (productId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWishlist((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  // Filter products by category/gender/style
  const filteredProducts = useMemo(() => {
    let list = [...collection.products];

    if (activeCategory === "men") {
      list = list.filter((p) => p.gender === "MEN");
    } else if (activeCategory === "kids") {
      list = list.filter((p) => p.gender === "KIDS");
    } else if (activeCategory === "casual") {
      list = list.filter((p) => {
        const cat = (p.category?.name || "").toLowerCase();
        const name = p.name.toLowerCase();
        return (
          cat.includes("pant") ||
          cat.includes("shirt") ||
          cat.includes("t-shirt") ||
          cat.includes("casual") ||
          cat.includes("jean") ||
          name.includes("jean") ||
          name.includes("casual")
        );
      });
    } else if (activeCategory === "traditional") {
      list = list.filter((p) => {
        const cat = (p.category?.name || "").toLowerCase();
        const name = p.name.toLowerCase();
        return (
          cat.includes("kurta") ||
          cat.includes("festive") ||
          cat.includes("traditional") ||
          name.includes("kurta") ||
          name.includes("festive")
        );
      });
    }

    // Sort
    if (sortBy === "price-asc") {
      list.sort((a, b) => a.pricing.finalPrice - b.pricing.finalPrice);
    } else if (sortBy === "price-desc") {
      list.sort((a, b) => b.pricing.finalPrice - a.pricing.finalPrice);
    } else if (sortBy === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [collection.products, activeCategory, sortBy]);

  const categoriesCount = useMemo(() => {
    const prods = collection.products;
    return {
      all: prods.length,
      men: prods.filter((p) => p.gender === "MEN").length,
      kids: prods.filter((p) => p.gender === "KIDS").length,
      casual: prods.filter((p) => {
        const cat = (p.category?.name || "").toLowerCase();
        const name = p.name.toLowerCase();
        return (
          cat.includes("pant") ||
          cat.includes("shirt") ||
          cat.includes("t-shirt") ||
          cat.includes("casual") ||
          cat.includes("jean") ||
          name.includes("jean") ||
          name.includes("casual")
        );
      }).length,
      traditional: prods.filter((p) => {
        const cat = (p.category?.name || "").toLowerCase();
        const name = p.name.toLowerCase();
        return (
          cat.includes("kurta") ||
          cat.includes("festive") ||
          cat.includes("traditional") ||
          name.includes("kurta") ||
          name.includes("festive")
        );
      }).length,
    };
  }, [collection.products]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#121212]">
      {/* =========================================================================
          HERO & EDITORIAL BANNER SECTION
      ========================================================================= */}
      <div className="relative border-b border-[#EDE6D8] bg-gradient-to-b from-[#F5EFE6]/70 via-[#FAF6F0] to-[#FDFBF7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 sm:pt-12 sm:pb-16">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-neutral-500 font-medium">
            <Link href="/" className="hover:text-black transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link href="/collections" className="hover:text-black transition-colors">
              Collections
            </Link>
            <span>/</span>
            <span className="text-[#8C7A58] font-semibold truncate max-w-[200px] sm:max-w-none">
              {collection.title}
            </span>
          </nav>

          <div className="max-w-3xl space-y-4">
            {/* Editorial Eyebrow Tag */}
            <div className="inline-flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] text-[#8C7A58]">
              <span className="w-5 h-[1.5px] bg-[#8C7A58]" aria-hidden="true" />
              <span>
                {collection.mode === "MANUAL"
                  ? "Handpicked Collection"
                  : "Trending Showcase"}
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-black tracking-tight text-[#121212] leading-[1.1]">
              {collection.title}
            </h1>

            {/* Subtitle / Narrative */}
            {collection.subtitle && (
              <p className="text-base sm:text-lg text-neutral-700 font-serif italic">
                {collection.subtitle}
              </p>
            )}

            {/* Description */}
            {collection.description && (
              <p className="text-xs sm:text-sm text-neutral-600 font-light leading-relaxed max-w-2xl pt-1">
                {collection.description}
              </p>
            )}

            {/* Meta tags / badge strip */}
            <div className="pt-2 flex items-center gap-3 flex-wrap text-xs text-neutral-500">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E5DECF] font-semibold text-neutral-800 shadow-2xs">
                <span>✨</span>
                <span>{collection.products.length} {collection.products.length === 1 ? "Product" : "Products"}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E5DECF] font-medium text-neutral-600 shadow-2xs">
                <span>⚡</span>
                <span>Fast Shipping Across India</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          CONTROLS: FILTER PILLS & SORT SELECTOR
      ========================================================================= */}
      <div className="sticky top-16 z-20 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-[#EDE6D8]/80 py-3.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === "all"
                  ? "bg-[#26221C] text-white shadow-xs"
                  : "bg-white text-neutral-700 border border-[#E5DECF] hover:bg-[#FAF7F2]"
              }`}
            >
              All Items ({categoriesCount.all})
            </button>

            {categoriesCount.men > 0 && (
              <button
                type="button"
                onClick={() => setActiveCategory("men")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeCategory === "men"
                    ? "bg-[#26221C] text-white shadow-xs"
                    : "bg-white text-neutral-700 border border-[#E5DECF] hover:bg-[#FAF7F2]"
                }`}
              >
                Men&apos;s Wear ({categoriesCount.men})
              </button>
            )}

            {categoriesCount.kids > 0 && (
              <button
                type="button"
                onClick={() => setActiveCategory("kids")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeCategory === "kids"
                    ? "bg-[#26221C] text-white shadow-xs"
                    : "bg-white text-neutral-700 border border-[#E5DECF] hover:bg-[#FAF7F2]"
                }`}
              >
                Kids&apos; Wear ({categoriesCount.kids})
              </button>
            )}

            {categoriesCount.casual > 0 && (
              <button
                type="button"
                onClick={() => setActiveCategory("casual")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeCategory === "casual"
                    ? "bg-[#26221C] text-white shadow-xs"
                    : "bg-white text-neutral-700 border border-[#E5DECF] hover:bg-[#FAF7F2]"
                }`}
              >
                Casual Wear ({categoriesCount.casual})
              </button>
            )}

            {categoriesCount.traditional > 0 && (
              <button
                type="button"
                onClick={() => setActiveCategory("traditional")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeCategory === "traditional"
                    ? "bg-[#26221C] text-white shadow-xs"
                    : "bg-white text-neutral-700 border border-[#E5DECF] hover:bg-[#FAF7F2]"
                }`}
              >
                Festive &amp; Ethnic ({categoriesCount.traditional})
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            <span className="text-xs text-neutral-500 font-medium hidden sm:inline">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-[#E5DECF] rounded-xl text-neutral-800 focus:outline-none focus:ring-1 focus:ring-[#8C7A58] cursor-pointer"
            >
              <option value="featured">Recommended</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name">Alphabetical</option>
            </select>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PRODUCT GRID SECTION
      ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        {filteredProducts.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-[#EDE6D8] p-8 max-w-lg mx-auto shadow-sm">
            <span className="text-4xl block mb-3">🧺</span>
            <h3 className="text-lg font-bold text-neutral-900 font-serif">No products found</h3>
            <p className="text-xs text-neutral-500 mt-1 mb-6">
              There are currently no items matching the selected filter in this collection.
            </p>
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className="px-5 py-2.5 rounded-xl bg-[#26221C] text-white text-xs font-semibold hover:bg-black transition cursor-pointer"
            >
              View All Collection Items
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((item) => {
              const displayImage = item.firstImage || "/images/placeholder.jpg";
              const hoverImage = item.secondImage || displayImage;
              const hasHover = hoverImage !== displayImage;
              const isWishlisted = Boolean(wishlist[item._id]);
              const compareAt = item.pricing.compareAtPrice;
              const discountPercent = item.pricing.discountPercent || 0;

              return (
                <div
                  key={item._id}
                  className="group relative flex flex-col rounded-2xl bg-white border border-[#EDE7DC]/80 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300"
                >
                  {/* Image Container with aspect ratio 4/5 */}
                  <div className="relative aspect-[4/5] w-full overflow-hidden rounded-t-2xl bg-[#F4EFE6]">
                    <Link href={`/product/${item.slug}`} className="block w-full h-full">
                      <Image
                        src={displayImage}
                        alt={item.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className={`object-cover object-center transition-all duration-700 ease-out ${
                          hasHover ? "group-hover:opacity-0 group-hover:scale-105" : "group-hover:scale-105"
                        }`}
                      />
                      {hasHover && (
                        <Image
                          src={hoverImage}
                          alt={`${item.name} alternate view`}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-cover object-center absolute inset-0 opacity-0 transition-all duration-700 ease-out group-hover:opacity-100 group-hover:scale-105"
                        />
                      )}
                    </Link>

                    {/* Top Left Edit Badge */}
                    <span className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded bg-[#2D2821]/80 backdrop-blur-md text-[9px] font-bold uppercase tracking-[0.16em] text-[#FAF6F0] pointer-events-none">
                      {collection.title}
                    </span>

                    {/* Top Right Wishlist Heart */}
                    <button
                      type="button"
                      onClick={(e) => toggleWishlist(item._id, e)}
                      aria-label="Add to wishlist"
                      className={`absolute top-2.5 right-2.5 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full backdrop-blur-md border border-white/60 flex items-center justify-center transition-all shadow-xs cursor-pointer ${
                        isWishlisted
                          ? "bg-white text-red-500 scale-105"
                          : "bg-white/80 text-neutral-700 hover:text-red-500 hover:bg-white active:scale-95"
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

                    {/* Bottom Left: Tag */}
                    {item.category?.name && (
                      <span className="absolute bottom-2.5 left-2.5 z-10 px-2 py-0.5 rounded bg-[#FAF7F2]/95 backdrop-blur-xs text-neutral-900 text-[9px] font-bold uppercase tracking-wider shadow-xs pointer-events-none">
                        {item.category.name}
                      </span>
                    )}
                  </div>

                  {/* Card Details Body */}
                  <div className="p-3.5 sm:p-5 flex flex-col flex-1 justify-between gap-3">
                    <Link href={`/product/${item.slug}`}>
                      <h2 className="text-xs sm:text-sm font-semibold text-neutral-900 truncate group-hover:text-[#8C7A58] transition-colors">
                        {item.name}
                      </h2>
                    </Link>

                    {/* Swatches & Arrow Action Row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        {item.colorSwatches && item.colorSwatches.length > 0 ? (
                          <div className="flex items-center -space-x-1">
                            {item.colorSwatches.slice(0, 3).map((swatch, sIdx) => (
                              <span
                                key={`${swatch.name}-${sIdx}`}
                                style={{ backgroundColor: swatch.hex }}
                                title={swatch.name}
                                className="w-3.5 h-3.5 rounded-full border border-white shadow-xs"
                              />
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-neutral-400">Pure Linen</span>
                        )}
                      </div>

                      <Link
                        href={`/product/${item.slug}`}
                        aria-label={`View ${item.name}`}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-neutral-300 flex items-center justify-center text-neutral-700 group-hover:border-black group-hover:bg-black group-hover:text-white transition-all shadow-xs"
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
                        {compareAt && (
                          <span className="line-through text-[11px] text-neutral-400 font-normal">
                            {formatCurrency(compareAt)}
                          </span>
                        )}
                      </div>

                      {discountPercent > 0 && (
                        <span className="bg-[#F4ECE1] text-[#7A6945] text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded">
                          {discountPercent}% OFF
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* =========================================================================
            CROSS-COLLECTION NAVIGATION FOOTER
        ========================================================================= */}
        {otherCollections.length > 0 && (
          <div className="mt-20 pt-12 border-t border-[#EDE6D8]">
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8C7A58] block mb-1">
                  More Collections
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-neutral-900">
                  Explore Other Collections
                </h3>
              </div>
              <Link
                href="/collections"
                className="text-xs font-semibold text-[#8C7A58] hover:underline hidden sm:inline"
              >
                View All Collections →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {otherCollections.map((col) => (
                <Link
                  key={col._id}
                  href={`/collections/${col.slug}`}
                  className="group p-6 rounded-2xl bg-white border border-[#EDE6D8] hover:border-[#8C7A58] hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C7A58] bg-[#8C7A58]/10 px-2.5 py-0.5 rounded-full inline-block mb-3">
                      {col.productCount} {col.productCount === 1 ? "Product" : "Products"}
                    </span>
                    <h4 className="text-lg font-serif font-bold text-neutral-900 group-hover:text-[#8C7A58] transition-colors">
                      {col.title}
                    </h4>
                    {col.subtitle && (
                      <p className="text-xs text-neutral-500 font-serif italic mt-1">
                        {col.subtitle}
                      </p>
                    )}
                  </div>
                  <div className="pt-4 mt-4 border-t border-neutral-100 flex items-center justify-between text-xs font-semibold text-neutral-700 group-hover:text-black">
                    <span>Explore Collection</span>
                    <span>→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CollectionView;
