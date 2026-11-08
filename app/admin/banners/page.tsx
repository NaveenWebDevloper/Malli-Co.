import type { Metadata } from "next";
import { BannerManager } from "@/components/admin/BannerManager";
import { SeasonalBannerManager } from "@/components/admin/SeasonalBannerManager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Banner Management | Admin Console | Malli & Co.",
  description: "Manage homepage hero banners, seasonal campaign backdrops, image assets, scheduling, and live carousel ordering.",
};

export default function AdminBannersPage() {
  return (
    <div className="space-y-8">
      {/* 1. Seasonal Essentials Campaign Banner Manager (Only Accessible by Admin) */}
      <SeasonalBannerManager />

      {/* 2. Homepage Hero Carousel Banners */}
      <div className="pt-4 border-t border-neutral-800">
        <BannerManager />
      </div>
    </div>
  );
}

