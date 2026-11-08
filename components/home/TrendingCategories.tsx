"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "motion/react";

const Prism = dynamic(() => import("@/components/ui/Prism"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-[#0e0d14]" />,
});

export interface TrendingCategoryItem {
  _id: string;
  name: string;
  slug: string;
  gender: "MEN" | "KIDS";
  label: string;
  badge?: string;
  tileImage: string;
  link: string;
  productCount: number;
  sortOrder: number;
}

export interface TrendingCategoriesProps {
  initialCategories?: TrendingCategoryItem[];
}

export function TrendingCategories({ initialCategories }: TrendingCategoriesProps) {
  const prefersReducedMotion = useReducedMotion();
  const [categories, setCategories] = useState<TrendingCategoryItem[]>(
    initialCategories || [],
  );
  const [loading, setLoading] = useState<boolean>(!initialCategories);

  useEffect(() => {
    if (initialCategories) return;

    let isMounted = true;
    fetch("/api/categories/trending")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted) {
          if (data?.success && Array.isArray(data.categories)) {
            setCategories(data.categories);
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
  }, [initialCategories]);

  if (loading) {
    return (
      <section
        className="relative isolate min-h-[760px] sm:min-h-[820px] lg:min-h-[880px] overflow-hidden pt-28 sm:pt-36 pb-28 sm:pb-36 text-white"
        style={{
          background:
            "linear-gradient(180deg, #FBF9F5 0%, rgba(251,249,245,0.98) 5%, rgba(246,243,237,0.92) 10%, rgba(235,230,222,0.82) 16%, rgba(215,208,198,0.70) 22%, rgba(175,166,160,0.55) 28%, rgba(120,112,118,0.45) 35%, rgba(70,62,75,0.65) 42%, rgba(35,30,42,0.88) 48%, #0e0d14 55%, #0e0d14 65%, rgba(35,30,42,0.88) 72%, rgba(70,62,75,0.65) 78%, rgba(120,112,118,0.45) 83%, rgba(175,166,160,0.55) 87%, rgba(215,208,198,0.70) 90%, rgba(235,230,222,0.82) 93%, rgba(246,243,237,0.92) 96%, rgba(251,249,245,0.98) 98%, #FBF9F5 100%)",
        }}
      >
        <div className="mx-auto w-[calc(100%-32px)] sm:w-[calc(100%-48px)] lg:w-[88%] xl:w-[86%] max-w-[1480px]">
          <div className="mb-8 h-8 w-64 animate-pulse rounded bg-white/10" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-white/10" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  // Adjust grid columns based on count (e.g. 3, 4, 6 or 8)
  const gridColsClass =
    categories.length <= 4
      ? "grid-cols-2 sm:grid-cols-2 md:grid-cols-4"
      : categories.length === 5
      ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-5"
      : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";

  return (
    <section
      className="relative isolate min-h-[760px] sm:min-h-[820px] lg:min-h-[880px] overflow-hidden pt-28 sm:pt-36 pb-28 sm:pb-36 text-white"
      style={{
        background:
          "linear-gradient(180deg, #FBF9F5 0%, rgba(251,249,245,0.98) 5%, rgba(246,243,237,0.92) 10%, rgba(235,230,222,0.82) 16%, rgba(215,208,198,0.70) 22%, rgba(175,166,160,0.55) 28%, rgba(120,112,118,0.45) 35%, rgba(70,62,75,0.65) 42%, rgba(35,30,42,0.88) 48%, #0e0d14 55%, #0e0d14 65%, rgba(35,30,42,0.88) 72%, rgba(70,62,75,0.65) 78%, rgba(120,112,118,0.45) 83%, rgba(175,166,160,0.55) 87%, rgba(215,208,198,0.70) 90%, rgba(235,230,222,0.82) 93%, rgba(246,243,237,0.92) 96%, rgba(251,249,245,0.98) 98%, #FBF9F5 100%)",
      }}
    >
      {/* Dynamic 3D Prism WebGL Background with Gradient Mask & Opacity Tuning */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {/* WebGL Canvas with smooth vertical fade-out mask on top & bottom */}
        <div
          className="w-full h-full opacity-65 sm:opacity-80 transition-opacity duration-1000"
          style={{
            maskImage:
              "linear-gradient(to bottom, transparent 0%, transparent 14%, black 30%, black 70%, transparent 88%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, transparent 14%, black 30%, black 70%, transparent 88%, transparent 100%)",
          }}
        >
          <Prism
            animationType="rotate"
            timeScale={0.45}
            height={3.5}
            baseWidth={5.5}
            scale={3.6}
            hueShift={0}
            colorFrequency={1}
            glow={0.85}
            colors={[]}
            saturation={1.4}
            noise={0}
            interactive
            hoverStrength={1.8}
            inertia={0.05}
            intro
            resolution={0.5}
            lightMode={false}
            className="w-full h-full"
          />
        </div>

        {/* 1. Top Shaded Gradient Overlay: seamless feathered blend from #FBF9F5 (Season's Top Picks) */}
        <div
          className="absolute inset-x-0 top-0 h-56 sm:h-72 pointer-events-none z-10"
          style={{
            background:
              "linear-gradient(180deg, #FBF9F5 0%, rgba(251,249,245,0.85) 25%, rgba(251,249,245,0.45) 50%, rgba(251,249,245,0.1) 75%, transparent 100%)",
          }}
        />

        {/* 2. Bottom Shaded Gradient Overlay: seamless feathered blend into #FBF9F5 (background color) */}
        <div
          className="absolute inset-x-0 bottom-0 h-56 sm:h-72 pointer-events-none z-10"
          style={{
            background:
              "linear-gradient(0deg, #FBF9F5 0%, rgba(251,249,245,0.90) 25%, rgba(251,249,245,0.50) 50%, rgba(251,249,245,0.1) 75%, transparent 100%)",
          }}
        />

        {/* 3. Radial Vignette for focused center luminance & cinematic card contrast */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(14,13,20,0.55)_65%,rgba(10,9,15,0.92)_95%)] pointer-events-none z-10" />
      </div>

      <div className="relative z-10 mx-auto w-[calc(100%-32px)] sm:w-[calc(100%-48px)] lg:w-[88%] xl:w-[86%] max-w-[1480px]">
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-white/15 pb-5 sm:mb-10 sm:flex-row sm:items-end">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#D5CBB5]">
              Popular Departments
            </span>
            <h3 className="mt-1 font-serif text-3xl font-black uppercase tracking-wide text-white sm:text-4xl">
              Trending Categories
            </h3>
          </div>
          <Link
            href="/men"
            className="text-xs font-semibold uppercase tracking-wider text-white/80 underline underline-offset-4 transition-colors hover:text-[#D5CBB5]"
          >
            Explore All Wardrobes →
          </Link>
        </div>

        <div className={`grid ${gridColsClass} gap-3 sm:gap-4`}>
          {categories.map((cat, idx) => (
            <motion.div
              key={cat._id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{
                duration: prefersReducedMotion ? 0.01 : 0.5,
                delay: prefersReducedMotion ? 0 : (idx % 6) * 0.07,
                ease: "easeOut",
              }}
            >
              <Link
                href={cat.link}
                className="group relative block aspect-[4/5] w-full overflow-hidden rounded-2xl border border-white/15 bg-[radial-gradient(ellipse_at_50%_28%,rgba(182,151,220,0.34),transparent_48%),linear-gradient(145deg,#34291f,#111)] shadow-[0_18px_50px_rgba(0,0,0,0.32)]"
              >
                {cat.tileImage !== "/images/placeholder.jpg" && (
                  <Image
                    src={cat.tileImage}
                    alt={cat.label}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                    className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                )}

                <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/90 via-black/35 to-transparent transition-colors duration-500 group-hover:from-black/95 group-hover:via-black/45" />

                {cat.badge && (
                  <div className="absolute left-3 top-3 z-20">
                    <span className="inline-block rounded bg-[#8C7A58] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
                      {cat.badge}
                    </span>
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end p-3.5 text-white sm:p-4">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#D5CBB5]">
                    {cat.gender}
                  </span>
                  <div className="mt-0.5 flex items-center justify-between gap-1">
                    <h4 className="line-clamp-1 text-xs font-bold text-white transition-colors group-hover:text-[#FBF9F5] sm:text-sm">
                      {cat.label}
                    </h4>
                    <span
                      aria-hidden="true"
                      className="translate-x-[-4px] text-xs text-white/90 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                    >
                      →
                    </span>
                  </div>
                  {cat.productCount > 0 && (
                    <p className="mt-0.5 text-[10px] font-light text-white/70">
                      {cat.productCount} {cat.productCount === 1 ? "design" : "designs"}
                    </p>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default TrendingCategories;

