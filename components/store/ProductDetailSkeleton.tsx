import React from "react";

export function ProductDetailSkeleton() {
  return (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 isolate"
      aria-busy="true"
      aria-label="Loading product details"
    >
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center space-x-2 mb-8">
        <div className="h-3.5 w-12 rounded bg-[#EAE3D4]/80 animate-pulse" />
        <span className="text-neutral-300">/</span>
        <div className="h-3.5 w-20 rounded bg-[#EAE3D4]/80 animate-pulse" />
        <span className="text-neutral-300">/</span>
        <div className="h-3.5 w-36 rounded bg-[#EAE3D4]/80 animate-pulse" />
      </div>

      {/* Main Product Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
        {/* Gallery Skeleton */}
        <div className="flex flex-col-reverse sm:flex-row gap-4">
          {/* Thumbnails */}
          <div className="flex sm:flex-col gap-3 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="w-16 h-20 sm:w-20 sm:h-24 rounded-xl bg-[#EAE3D4]/60 border border-[#EAE3D4] overflow-hidden relative shrink-0"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
              </div>
            ))}
          </div>

          {/* Main Large Image */}
          <div className="flex-1 aspect-[3/4] rounded-2xl bg-[#EAE3D4]/50 border border-[#EAE3D4]/80 overflow-hidden relative shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
          </div>
        </div>

        {/* Product Info Skeleton */}
        <div className="flex flex-col space-y-6 pt-2">
          <div className="space-y-3">
            <div className="h-4 w-28 rounded bg-[#EAE3D4] animate-pulse" />
            <div className="h-9 sm:h-12 w-4/5 rounded-lg bg-[#EAE3D4] animate-pulse" />
            <div className="h-6 w-36 rounded bg-neutral-300/80 animate-pulse mt-2" />
          </div>

          <div className="border-t border-b border-[#EAE3D4] py-6 space-y-4">
            {/* Color selector skeleton */}
            <div className="space-y-2">
              <div className="h-3.5 w-20 rounded bg-neutral-200/70 animate-pulse" />
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-neutral-300/80 animate-pulse" />
                <div className="w-8 h-8 rounded-full bg-neutral-300/80 animate-pulse" />
                <div className="w-8 h-8 rounded-full bg-neutral-300/80 animate-pulse" />
              </div>
            </div>

            {/* Size selector skeleton */}
            <div className="space-y-2 pt-2">
              <div className="h-3.5 w-24 rounded bg-neutral-200/70 animate-pulse" />
              <div className="flex gap-2.5">
                {["S", "M", "L", "XL"].map((s) => (
                  <div
                    key={s}
                    className="w-12 h-11 rounded-lg bg-[#EAE3D4]/70 border border-[#EAE3D4] animate-pulse"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* CTA Buttons Skeleton */}
          <div className="space-y-3 pt-2">
            <div className="h-14 w-full rounded-full bg-[#121212]/80 animate-pulse" />
            <div className="h-12 w-full rounded-full bg-[#EAE3D4]/60 border border-[#EAE3D4] animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetailSkeleton;

