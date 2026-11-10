import type { Metadata } from "next";
import { getCatalogProducts } from "@/lib/catalog";
import { getActiveHeroBanners, getActiveSeasonalBanner } from "@/lib/banners";
import { getFeaturedCollection } from "@/lib/collections";
import { HeroBannerCarousel } from "@/components/home/HeroBannerCarousel";
import { StoreHeroWrapper } from "@/components/store/StoreHeroWrapper";
import { SeasonPicks } from "@/components/home/SeasonPicks";
import { TrendingCategories } from "@/components/home/TrendingCategories";
import { SaleBanner } from "@/components/home/SaleBanner";
import { SeasonalEssentials } from "@/components/home/SeasonalEssentials";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Malli & Co. | Luxury Menswear & Kids' Artisanal Clothing",
  description:
    "Discover handcrafted menswear and children's celebratory apparel woven from 100% French flax linen and pure Supima cotton. Timeless luxury tailored in India.",
  openGraph: {
    title: "Malli & Co. | Luxury Menswear & Kids' Artisanal Clothing",
    description:
      "Handcrafted menswear and children's celebratory apparel woven from 100% French flax linen and pure Supima cotton.",
    url: "https://malliandco.com",
    siteName: "Malli & Co.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Malli & Co. | Luxury Menswear & Kids' Artisanal Clothing",
    description:
      "Handcrafted menswear and children's celebratory apparel woven from 100% French flax linen and pure Supima cotton.",
  },
};

export default async function StoreHomePage() {
  const [banners, seasonalBanner, featuredCollection, { products }] = await Promise.all([
    getActiveHeroBanners(),
    getActiveSeasonalBanner(),
    getFeaturedCollection(),
    getCatalogProducts({ limit: 10 }),
  ]);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ClothingStore",
    name: "Malli & Co.",
    description:
      "Artisanal luxury menswear and kids' clothing tailored from pure French linen and Pima cottons.",
    url: "https://malliandco.com",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Near Vikas Pre School, Govt High School Road, Mallampet, Bachupally",
      addressLocality: "Hyderabad",
      addressRegion: "Telangana",
      postalCode: "500090",
      addressCountry: "IN",
    },
    currenciesAccepted: "INR",
    paymentAccepted: "Razorpay, Credit Card, UPI, Net Banking",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* 1. Premier Editorial Banner Carousel (Stage 3 & 4) */}
      <HeroBannerCarousel banners={banners} />

      {/* 2. 3D WebGL Lookbook Hero Section (Rule 8 compliant, id="lookbook") */}
      <div className="my-16 sm:my-24">
        <StoreHeroWrapper />
      </div>

      {/* 3. Live Promotion Sale Banner (Top Priority Live Campaign) */}
      <div className="mb-16 sm:mb-24">
        <SaleBanner />
      </div>

      {/* 4. Season's Top Picks Curated Carousel */}
      <SeasonPicks initialCollection={featuredCollection} />

      {/* 5. Trending Categories Showcase (Flows seamlessly from Season's Top Picks and blends back into page background) */}
      <TrendingCategories />

      {/* 6. Autumn Winter Seasonal Essentials Campaign Showcase */}
      <div className="mt-14 sm:mt-24">
        <SeasonalEssentials products={products} bannerImage={seasonalBanner} />
      </div>
    </>
  );
}
