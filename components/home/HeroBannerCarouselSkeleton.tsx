import React from "react";

export function HeroBannerCarouselSkeleton() {
  return (
    <div
      className="relative w-[calc(100%-24px)] sm:w-[calc(100%-32px)] max-w-[1240px] mx-auto overflow-hidden bg-[#121212] rounded-[20px] sm:rounded-[24px] lg:rounded-[32px] h-[60vh] min-h-[440px] md:h-[72vh] md:min-h-[520px] md:max-h-[760px] mb-12 md:mb-16 isolate"
      style={{
        WebkitMaskImage: "-webkit-radial-gradient(white, black)",
        transform: "translateZ(0)",
      }}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 animate-pulse" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />

      {/* Content Skeleton */}
      <div className="relative z-10 h-full w-full p-6 lg:p-10 flex flex-col justify-end pb-20 sm:pb-24 lg:pb-24 space-y-4">
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
