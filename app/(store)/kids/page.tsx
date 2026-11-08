import type { Metadata } from "next";
import { getCatalogProducts } from "@/lib/catalog";
import { ProductCatalogView } from "@/components/store/ProductCatalogView";

export const metadata: Metadata = {
  title: "Kids' Luxury Apparel & Festive Clothing | Malli & Co.",
  description:
    "Celebratory kurta sets, festive ethnic ensembles, and pure organic cotton playwear crafted for young ones with heirloom care.",
  openGraph: {
    title: "Kids' Luxury Apparel & Festive Clothing | Malli & Co.",
    description:
      "Celebratory kurta sets, festive ethnic ensembles, and pure organic cotton playwear crafted for young ones.",
    url: "https://malliandco.com/kids",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kids' Luxury Apparel & Festive Clothing | Malli & Co.",
    description:
      "Celebratory kurta sets, festive ethnic ensembles, and pure organic cotton playwear crafted for young ones.",
  },
};

export default async function KidsCollectionPage({
  searchParams,
}: {
  searchParams: Promise<{
    size?: string | string[];
    color?: string | string[];
    brand?: string;
    sort?: "newest" | "price-asc" | "price-desc";
    minPrice?: string;
    maxPrice?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;

  const sizes = Array.isArray(params.size)
    ? params.size
    : params.size
    ? [params.size]
    : [];

  const colors = Array.isArray(params.color)
    ? params.color
    : params.color
    ? [params.color]
    : [];

  const catalogResult = await getCatalogProducts({
    gender: "KIDS",
    sizes,
    colors,
    brandSlug: params.brand,
    sortBy: params.sort || "newest",
    minPricePaise: params.minPrice ? parseInt(params.minPrice, 10) * 100 : undefined,
    maxPricePaise: params.maxPrice ? parseInt(params.maxPrice, 10) * 100 : undefined,
    page: params.page ? parseInt(params.page, 10) : 1,
  });

  const breadcrumbsJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://malliandco.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Kids",
        item: "https://malliandco.com/kids",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }}
      />
      <ProductCatalogView
        initialResult={catalogResult}
        title="Kids' Collection"
        subtitle="Artisanal celebratory outfits, gentle organic cottons, and joyful heirloom pieces for boys and girls."
        genderFilter="KIDS"
      />
    </>
  );
}

