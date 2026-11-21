import React from "react";

export function HeroBannerCarouselSkeleton() {
  return (
    <div
      className="relative w-full overflow-hidden bg-[#10264B] rounded-none h-[50vh] min-h-[380px] sm:h-[58vh] sm:min-h-[460px] lg:h-[64vh] lg:min-h-[520px] xl:h-[68vh] xl:min-h-[560px] max-h-[720px] mb-0 isolate"
      style={{
        transform: "translateZ(0)",
      }}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-[#0B1B36] via-[#10264B] to-[#0B1B36] animate-pulse" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />

      {/* Content Skeleton */}
      <div className="relative z-10 h-full w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 flex flex-col justify-end pb-20 sm:pb-24 lg:pb-24 space-y-4">
        <div className="w-32 h-4 rounded-full bg-neutral-700/60" />
        <div className="w-3/4 max-w-xl h-10 sm:h-14 rounded-xl bg-neutral-700/60" />
        <div className="w-1/2 max-w-md h-5 rounded-lg bg-neutral-700/40" />
        <div className="flex gap-3 pt-2">
          <div className="w-36 h-10 rounded-full bg-neutral-600/70" />
          <div className="w-32 h-10 rounded-full bg-neutral-800/60 border border-neutral-700/50" />
        </div>
      </div>
    </div>
  );
}
