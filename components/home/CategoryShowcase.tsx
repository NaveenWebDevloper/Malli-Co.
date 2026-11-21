"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";

interface CategoryItem {
  id: string;
  label: string;
  href: string;
  image: string;
  alt: string;
  bgTint: string;
}

const CATEGORIES: CategoryItem[] = [
  {
    id: "boys",
    label: "Boys",
    href: "/kids?gender=boys",
    image: "/images/showcase/category-boys-v2.jpg",
    alt: "Boys Fashion Collection",
    bgTint: "bg-[#EAEFF7]",
  },
  {
    id: "girls",
    label: "Girls",
    href: "/kids?gender=girls",
    image: "/images/showcase/category-girls-v2.jpg",
    alt: "Girls Fashion Collection",
    bgTint: "bg-[#FDF0F3]",
  },
  {
    id: "mens",
    label: "Men's",
    href: "/men",
    image: "/images/showcase/category-mens-v2.jpg",
    alt: "Men's Luxury & Casual Wear",
    bgTint: "bg-[#F7F2EC]",
  },
  {
    id: "newborn",
    label: "Newborn",
    href: "/kids?category=newborn",
    image: "/images/showcase/category-newborn-v2.jpg",
    alt: "Newborn & Baby Wear",
    bgTint: "bg-[#FFF4EC]",
  },
  {
    id: "ethnic",
    label: "Ethnic Wear",
    href: "/kids?category=ethnic-wear",
    image: "/images/showcase/category-ethnic-v2.jpg",
    alt: "Ethnic & Festive Celebration Apparel",
    bgTint: "bg-[#FDF6EA]",
  },
];

export function CategoryShowcase() {
  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
      {/* =========================================================================
          1. SECTION HEADER: "— Shop by Category —"
      ========================================================================= */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 md:gap-5 mb-8 sm:mb-12">
        <span
          className="w-8 sm:w-12 md:w-16 h-[2.5px] bg-[#F5B817] rounded-full"
          aria-hidden="true"
        />
        <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-bold text-[#10264B] tracking-tight font-sans text-center">
          Shop by Category
        </h2>
        <span
          className="w-8 sm:w-12 md:w-16 h-[2.5px] bg-[#F5B817] rounded-full"
          aria-hidden="true"
        />
      </div>

      {/* =========================================================================
          2. FIVE CATEGORY CARDS (Grid on desktop / smooth scroll on mobile)
      ========================================================================= */}
      <div className="flex md:grid md:grid-cols-5 gap-4 sm:gap-6 lg:gap-8 overflow-x-auto snap-x snap-mandatory pb-4 md:pb-0 scrollbar-none max-w-5xl mx-auto">
        {CATEGORIES.map((cat, idx) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45, delay: idx * 0.06 }}
            className="flex-shrink-0 w-32 sm:w-40 md:w-auto snap-center"
          >
            <Link
              href={cat.href}
              className="group flex flex-col items-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B817] rounded-2xl p-1"
            >
              {/* Rounded card image frame */}
              <div
                className={`aspect-square w-full rounded-2xl sm:rounded-3xl overflow-hidden ${cat.bgTint} shadow-sm border border-neutral-200/60 transition-all duration-300 group-hover:shadow-md group-hover:scale-[1.04] relative`}
              >
                <Image
                  src={cat.image}
                  alt={cat.alt}
                  fill
                  quality={95}
                  sizes="(max-width: 640px) 180px, (max-width: 1024px) 240px, 320px"
                  className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
                />
              </div>

              {/* Category label */}
              <span className="mt-3 text-xs sm:text-sm md:text-base font-bold text-[#10264B] group-hover:text-[#F5B817] transition-colors tracking-tight font-sans">
                {cat.label}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* =========================================================================
          3. DUAL FEATURE BANNER CARDS: KIDS COLLECTION & MEN'S COLLECTION
      ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mt-10 sm:mt-14 lg:mt-16">
        {/* Card A: Kids Collection */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#FFF0F5] via-[#FFE8EE] to-[#FDE1E7] border border-[#FAD4DD]/80 shadow-sm hover:shadow-md transition-all duration-300 min-h-[220px] sm:min-h-[260px] md:min-h-[280px] p-6 sm:p-8 flex items-center justify-between group"
        >
          {/* Left Text & CTA */}
          <div className="relative z-10 max-w-[62%] sm:max-w-[58%] flex flex-col items-start">
            <h3 className="text-2xl sm:text-3xl lg:text-[34px] font-bold text-[#10264B] tracking-tight leading-tight font-sans">
              Kids
              <br />
              Collection
            </h3>
            <p className="text-xs sm:text-sm font-semibold text-[#10264B]/80 mt-1.5 sm:mt-2 tracking-wide font-sans">
              Casual • Party • Ethnic
            </p>

            <Link
              href="/kids"
              className="inline-flex items-center gap-2 mt-5 sm:mt-6 px-6 sm:px-7 py-2.5 sm:py-3 rounded-full bg-[#F5B817] text-[#10264B] font-bold text-xs sm:text-sm uppercase tracking-wider shadow-sm hover:bg-[#D39B0A] hover:scale-105 active:scale-95 transition-all font-sans focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10264B]"
            >
              <span>Shop Now</span>
              <span className="text-sm font-sans" aria-hidden="true">
                →
              </span>
            </Link>
          </div>

          {/* Right Hero Character Imagery */}
          <div className="absolute right-0 bottom-0 top-0 w-[46%] sm:w-[50%] md:w-[48%] pointer-events-none flex items-end justify-end overflow-hidden">
            <div
              className="relative w-full h-full"
              style={{
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 15%, black 35%)",
                maskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 15%, black 35%)",
              }}
            >
              <Image
                src="/images/showcase/banner-kids-v2.jpg"
                alt="Malli & Co. Kids Collection - Joyful Girl in Party Dress"
                fill
                quality={95}
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 45vw, 600px"
                className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
              />
            </div>
          </div>
        </motion.div>

        {/* Card B: Men's Collection */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#EEF5FC] via-[#E2EEFA] to-[#D5E7F7] border border-[#CCE2F7]/80 shadow-sm hover:shadow-md transition-all duration-300 min-h-[220px] sm:min-h-[260px] md:min-h-[280px] p-6 sm:p-8 flex items-center justify-between group"
        >
          {/* Left Text & CTA */}
          <div className="relative z-10 max-w-[62%] sm:max-w-[58%] flex flex-col items-start">
            <h3 className="text-2xl sm:text-3xl lg:text-[34px] font-bold text-[#10264B] tracking-tight leading-tight font-sans">
              Men&apos;s
              <br />
              Collection
            </h3>
            <p className="text-xs sm:text-sm font-semibold text-[#10264B]/80 mt-1.5 sm:mt-2 tracking-wide font-sans">
              Shirts • T-Shirts • Jeans
            </p>

            <Link
              href="/men"
              className="inline-flex items-center gap-2 mt-5 sm:mt-6 px-6 sm:px-7 py-2.5 sm:py-3 rounded-full bg-[#F5B817] text-[#10264B] font-bold text-xs sm:text-sm uppercase tracking-wider shadow-sm hover:bg-[#D39B0A] hover:scale-105 active:scale-95 transition-all font-sans focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10264B]"
            >
              <span>Shop Now</span>
              <span className="text-sm font-sans" aria-hidden="true">
                →
              </span>
            </Link>
          </div>

          {/* Right Hero Character Imagery */}
          <div className="absolute right-0 bottom-0 top-0 w-[46%] sm:w-[50%] md:w-[48%] pointer-events-none flex items-end justify-end overflow-hidden">
            <div
              className="relative w-full h-full"
              style={{
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 15%, black 35%)",
                maskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 15%, black 35%)",
              }}
            >
              <Image
                src="/images/showcase/banner-mens-v2.jpg"
                alt="Malli & Co. Men's Collection - Stylish Gentleman in Jacket"
                fill
                quality={95}
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 45vw, 600px"
                className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default CategoryShowcase;

