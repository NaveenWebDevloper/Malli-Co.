"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ProductCard } from "./ProductCard";
import type { CatalogResult } from "@/lib/catalog";
import { getColorHex, isLightColor } from "@/lib/colors";

interface ProductCatalogViewProps {
  initialResult: CatalogResult;
  title: string;
  subtitle?: string;
  genderFilter?: "MEN" | "KIDS" | "UNISEX";
  wide?: boolean;
}

export function ProductCatalogView({
  initialResult,
  title,
  subtitle,
  genderFilter,
  wide = false,
}: ProductCatalogViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Active query state from URL
  const selectedSizes = searchParams.getAll("size");
  const selectedColors = searchParams.getAll("color");
  const selectedBrand = searchParams.get("brand") || "";
  const currentSort = searchParams.get("sort") || "newest";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";

  const updateFilters = (key: string, value: string, isMulti: boolean = false) => {
    const params = new URLSearchParams(searchParams.toString());

    if (isMulti) {
      const currentValues = params.getAll(key);
      params.delete(key);
      if (currentValues.includes(value)) {
        currentValues.filter((v) => v !== value).forEach((v) => params.append(key, v));
      } else {
        [...currentValues, value].forEach((v) => params.append(key, v));
      }
    } else {
      if (value === "" || value === params.get(key)) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    // Reset pagination to page 1 on filter change
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const clearAllFilters = () => {
    router.push(pathname, { scroll: false });
  };

  const hasActiveFilters =
    selectedSizes.length > 0 ||
    selectedColors.length > 0 ||
    Boolean(selectedBrand) ||
    Boolean(minPrice) ||
    Boolean(maxPrice);

  return (
    <div
      className={`${
        wide
          ? "w-[calc(100%-32px)] lg:w-[80%]"
          : "max-w-7xl w-full px-4 sm:px-6 lg:px-8"
      } mx-auto py-8 sm:py-12`}
    >
      {/* Category / Page Title Banner */}
      <div className="mb-8 pb-6 border-b border-[#EAE3D4] flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-neutral-500">
            {genderFilter ? `${genderFilter} Apparel` : "Featured Collection"}
          </span>
          <h1 className="text-2xl sm:text-4xl font-serif font-black uppercase tracking-tight text-[#121212] mt-1">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-neutral-600 font-light mt-1 max-w-xl">
              {subtitle}
            </p>
          )}
        </div>

        {/* Mobile Filter Button & Desktop Sort Select */}
        <div className="flex items-center gap-3 justify-between md:justify-end">
          <button
            type="button"
            onClick={() => setIsMobileFilterOpen(true)}
            className="md:hidden inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#121212] text-white"
          >
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-neutral-500 font-medium hidden sm:inline">Sort:</span>
            <select
              value={currentSort}
              onChange={(e) => updateFilters("sort", e.target.value)}
              className="rounded-xl border border-[#DDD4C1] bg-white px-3 py-2 text-xs font-medium text-[#121212] focus:outline-none focus:border-black"
            >
              <option value="newest">Newest Arrivals</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-6 text-xs">
          <span className="text-neutral-500 font-medium">Applied Filters:</span>
          {selectedSizes.map((sz) => (
            <button
              key={sz}
              onClick={() => updateFilters("size", sz, true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#121212] text-white text-[11px]"
            >
              <span>Size: {sz}</span>
              <span>✕</span>
            </button>
          ))}
          {selectedColors.map((col) => (
            <button
              key={col}
              onClick={() => updateFilters("color", col, true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#121212] text-white text-[11px]"
            >
              <span>Color: {col}</span>
              <span>✕</span>
            </button>
          ))}
          {selectedBrand && (
            <button
              onClick={() => updateFilters("brand", "")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#121212] text-white text-[11px]"
            >
              <span>Brand: {selectedBrand}</span>
              <span>✕</span>
            </button>
          )}
          <button
            onClick={clearAllFilters}
            className="text-[11px] font-semibold text-neutral-500 hover:text-black underline underline-offset-2 ml-1"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Main Grid with Sidebar Filter */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Desktop Filter Sidebar */}
        <aside className="hidden md:block space-y-6 text-xs border-r border-[#EAE3D4] pr-6">
          {/* Sizes */}
          <div>
            <h3 className="font-bold uppercase tracking-wider text-[11px] text-[#121212] mb-3">
              Size
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {initialResult.filterFacets.sizes.map((sz) => {
                const isSelected = selectedSizes.includes(sz);
                return (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => updateFilters("size", sz, true)}
                    className={`py-2 text-center rounded-lg border font-semibold transition-all ${
                      isSelected
                        ? "bg-[#121212] text-white border-black"
                        : "bg-white text-neutral-800 border-[#DDD4C1] hover:border-black"
                    }`}
                  >
                    {sz}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Colors */}
          <div className="pt-4 border-t border-[#EAE3D4]">
            <h3 className="font-bold uppercase tracking-wider text-[11px] text-[#121212] mb-3">
              Color
            </h3>
            <div className="flex flex-col space-y-2">
              {initialResult.filterFacets.colors.map((colorName) => {
                const isSelected = selectedColors.includes(colorName);
                const hex = getColorHex(colorName);
                const isLight = isLightColor(hex);
                return (
                  <button
                    key={colorName}
                    type="button"
                    onClick={() => updateFilters("color", colorName, true)}
                    className="flex items-center justify-between text-neutral-700 hover:text-black group text-left"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`w-3.5 h-3.5 rounded-full flex-shrink-0 transition-transform group-hover:scale-110 ${
                          isLight
                            ? "border border-neutral-400/80 shadow-2xs"
                            : "border border-black/15 shadow-2xs"
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                      <span className={isSelected ? "font-bold text-black" : ""}>
                        {colorName}
                      </span>
                    </span>
                    {isSelected && <span className="text-black font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Brands */}
          {initialResult.filterFacets.brands.length > 0 && (
            <div className="pt-4 border-t border-[#EAE3D4]">
              <h3 className="font-bold uppercase tracking-wider text-[11px] text-[#121212] mb-3">
                Brands
              </h3>
              <div className="flex flex-col space-y-2">
                {initialResult.filterFacets.brands.map((b) => {
                  const isSelected = selectedBrand === b.slug;
                  return (
                    <button
                      key={b.slug}
                      type="button"
                      onClick={() => updateFilters("brand", b.slug)}
                      className="flex items-center justify-between text-neutral-700 hover:text-black text-left"
                    >
                      <span className={isSelected ? "font-bold text-black" : ""}>
                        {b.name}
                      </span>
                      {isSelected && <span className="text-black font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        {/* Product Catalog Grid (3 cols on desktop) */}
        <main className="md:col-span-3">
          {initialResult.products.length === 0 ? (
            <div className="py-20 text-center rounded-3xl bg-[#F4EFE6]/50 border border-[#EAE3D4] p-8 space-y-4">
              <span className="text-3xl">🌿</span>
              <h3 className="text-lg font-serif font-bold text-[#121212]">
                No matching garments found
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                We couldn&apos;t find any pieces matching your current filter selections. Try adjusting your size, color, or brand filters.
              </p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-6 py-2.5 rounded-full bg-[#121212] text-white text-xs font-semibold tracking-wider uppercase hover:bg-black"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {initialResult.products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Mobile Filters Drawer */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileFilterOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-xs w-full bg-[#FBF9F5] shadow-2xl p-6 flex flex-col justify-between z-10 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#EAE3D4]">
                <h3 className="font-serif font-bold uppercase tracking-wider text-sm">
                  Refine Catalogue
                </h3>
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="p-1 text-neutral-500 hover:text-black text-lg"
                >
                  ✕
                </button>
              </div>

              {/* Mobile Size Filter */}
              <div className="py-4 border-b border-[#EAE3D4]">
                <h4 className="font-bold uppercase text-xs tracking-wider mb-2.5">
                  Size
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {initialResult.filterFacets.sizes.map((sz) => {
                    const isSelected = selectedSizes.includes(sz);
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => updateFilters("size", sz, true)}
                        className={`py-2 text-center rounded-lg border text-xs font-semibold ${
                          isSelected
                            ? "bg-[#121212] text-white border-black"
                            : "bg-white text-neutral-800 border-[#DDD4C1]"
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Color Filter */}
              <div className="py-4 border-b border-[#EAE3D4]">
                <h4 className="font-bold uppercase text-xs tracking-wider mb-2.5">
                  Color
                </h4>
                <div className="flex flex-col space-y-2 text-xs">
                  {initialResult.filterFacets.colors.map((colorName) => {
                    const isSelected = selectedColors.includes(colorName);
                    const hex = getColorHex(colorName);
                    const isLight = isLightColor(hex);
                    return (
                      <button
                        key={colorName}
                        type="button"
                        onClick={() => updateFilters("color", colorName, true)}
                        className="flex items-center justify-between text-left"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={`w-3 h-3 rounded-full flex-shrink-0 ${
                              isLight
                                ? "border border-neutral-400/80 shadow-2xs"
                                : "border border-black/15 shadow-2xs"
                            }`}
                            style={{ backgroundColor: hex }}
                          />
                          <span className={isSelected ? "font-bold text-black" : "text-neutral-700"}>
                            {colorName}
                          </span>
                        </span>
                        {isSelected && <span>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#EAE3D4] flex gap-2">
              <button
                type="button"
                onClick={clearAllFilters}
                className="flex-1 py-2.5 border border-[#DDD4C1] text-xs font-semibold uppercase tracking-wider rounded-xl text-neutral-700"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-1 py-2.5 bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider rounded-xl"
              >
                View ({initialResult.products.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
