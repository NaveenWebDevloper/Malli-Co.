"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FlexCarousel, type CarouselItem } from "./FlexCarousel";
import { HeroPosterFallback } from "./HeroPosterFallback";
import { HeroCallouts } from "@/components/store/HeroCallouts";
import { VaporType } from "@/components/ui/VaporType";
import { DEFAULT_HERO_SLIDES } from "@/lib/constants";

export function Hero() {
  const [hasWebGL2, setHasWebGL2] = useState<boolean | null>(null);
  const [slides, setSlides] = useState<CarouselItem[]>(DEFAULT_HERO_SLIDES);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2");
      setHasWebGL2(!!gl);
    } catch {
      setHasWebGL2(false);
    }

    // Fetch active hero slides from DB
    fetch("/api/hero-slides")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.slides && Array.isArray(data.slides) && data.slides.length > 0) {
          setSlides(data.slides);
        }
      })
      .catch((err) => {
        console.warn("Could not load dynamic hero slides, using defaults:", err);
      });
  }, []);

  // Show graceful non-3D fallback while detecting or if WebGL2 is unsupported (Rule 8)
  if (hasWebGL2 === false) {
    return <HeroPosterFallback />;
  }

  return (
    <section
      id="lookbook"
      className="relative w-full bg-[#FBF9F5] overflow-hidden border-b border-[#EAE3D4]/80 scroll-mt-24 sm:scroll-mt-28"
    >
      {/* Decorative Handwritten Callouts with Looping SVG Arrows */}
      <HeroCallouts />

      {/* Top Editorial Banner */}
      <div className="pt-12 pb-4 text-center px-4 max-w-4xl mx-auto">
        <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] font-medium text-[#8C7A58] block mb-2">
          Autumn / Winter 2026 Collection
        </span>
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-light font-serif tracking-tight text-[#121212]">
          Malli & Co.{" "}
          <VaporType
            words={[
              "Premium Menswear",
              "Pure Linens",
              "Classic Shirts",
              "Kids Collection",
            ]}
            vaporColor="#8C7A58"
            color="#121212"
            align="center"
            className="italic font-normal text-[#121212]"
            density={1.2}
            particleSize={1.2}
            spread={1.3}
            rise={1.0}
            turbulence={0.7}
            condense={1.6}
            hold={2.6}
            dissolve={1.8}
            interactive
            pauseOnHover
            clickAdvance
          />
        </h1>
        <p className="mt-3 text-xs sm:text-sm text-neutral-600 max-w-lg mx-auto tracking-wide">
          Interactive 3D Lookbook. Swipe horizontally or tap arrows to explore our featured collection.
        </p>
      </div>

      {/* 3D FlexCarousel Container */}
      <div className="relative w-full h-[460px] sm:h-[540px] md:h-[640px]">
        {hasWebGL2 === null ? (
          <HeroPosterFallback />
        ) : (
          <FlexCarousel
            items={slides}
            preset="liquid"
            intro="rise"
            cardHeight={0.52}
            gap={16}
            radius={8}
            squeeze={0.2}
            focusOnClick
            captions
            captureWheel={false}
            autoplay
            interval={4.5}
          />
        )}
      </div>

      {/* Action Footer Bar */}
      <div className="pb-12 pt-4 px-6 flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          href="/men"
          className="w-full sm:w-auto px-8 py-3.5 bg-[#121212] text-[#FBF9F5] text-xs uppercase tracking-[0.2em] font-medium hover:bg-neutral-800 transition-colors text-center"
        >
          Explore Men&apos;s Collection
        </Link>
        <Link
          href="/kids"
          className="w-full sm:w-auto px-8 py-3.5 border border-[#121212] text-[#121212] text-xs uppercase tracking-[0.2em] font-medium hover:bg-black/5 transition-colors text-center"
        >
          Explore Kids&apos; Collection
        </Link>
      </div>
    </section>
  );
}

export default Hero;
