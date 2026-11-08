import React from "react";

export interface CatalogSkeletonProps {
  title?: string;
}

export function CatalogSkeleton({ title = "Collection" }: CatalogSkeletonProps) {
  return (
    <div
      className="w-[calc(100%-32px)] lg:w-[80%] mx-auto py-8 sm:py-12 isolate"
      aria-busy="true"
      aria-label={`Loading ${title}`}
    >
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center space-x-2 mb-6">
        <div className="h-3.5 w-12 rounded bg-[#EAE3D4]/80 animate-pulse" />
        <span className="text-neutral-300">/</span>
        <div className="h-3.5 w-24 rounded bg-[#EAE3D4]/80 animate-pulse" />
      </div>

      {/* Header Banner Skeleton */}
      <div className="mb-8 border-b border-[#EAE3D4]/90 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-3">
          <div className="h-9 sm:h-11 w-56 sm:w-80 rounded-lg bg-[#EAE3D4] animate-pulse" />
          <div className="h-4 w-72 sm:w-96 max-w-full rounded bg-neutral-200/70 animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-24 rounded-full bg-[#EAE3D4]/70 animate-pulse" />
          <div className="h-9 w-36 rounded-full bg-[#EAE3D4]/70 animate-pulse" />
        </div>
      </div>

      {/* Product Grid Skeleton (8 luxury cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className="flex flex-col space-y-3.5">
            {/* Image Placeholder with shimmer */}
            <div className="relative aspect-[3/4] w-full rounded-2xl bg-[#EAE3D4]/50 overflow-hidden isolate shadow-sm border border-[#EAE3D4]/60">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
            </div>

            {/* Typography lines */}
            <div className="space-y-2 pt-0.5">
              <div className="h-3 w-16 rounded bg-neutral-200/70 animate-pulse" />
              <div className="h-4 w-5/6 rounded bg-neutral-300/80 animate-pulse" />
              <div className="flex items-center space-x-2 pt-0.5">
                <div className="h-4 w-20 rounded bg-neutral-400/70 animate-pulse" />
                <div className="h-3.5 w-14 rounded bg-neutral-200/60 animate-pulse" />
              </div>
              {/* Color swatches */}
              <div className="flex items-center space-x-1.5 pt-1">
                <div className="w-3.5 h-3.5 rounded-full bg-neutral-300/80 animate-pulse" />
                <div className="w-3.5 h-3.5 rounded-full bg-neutral-300/80 animate-pulse" />
                <div className="w-3.5 h-3.5 rounded-full bg-neutral-300/80 animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CatalogSkeleton;

