import { HeroCarouselManager } from "@/components/admin/HeroCarouselManager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Hero Carousel Manager | Admin Console",
  description: "Configure 3D FlexCarousel slides for Malli & Co. storefront.",
};

export default function AdminHeroCarouselPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Storefront 3D Hero Lookbook
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Upload new lookbook images, adjust fabric titles, re-order garments, and activate/deactivate slides displayed in the 3D WebGL FlexCarousel.
        </p>
      </div>

      <HeroCarouselManager />
    </div>
  );
}

