import type { Metadata } from "next";
import { getCatalogProducts } from "@/lib/catalog";
import { ProductCatalogView } from "@/components/store/ProductCatalogView";

export const metadata: Metadata = {
  title: "Men's Luxury Clothing & Tailoring | Malli & Co.",
  description:
    "Explore pure French flax linen shirts, structured Oxford button-downs, and heavyweight Pima cotton essentials tailored for discerning gentlemen.",
  openGraph: {
    title: "Men's Luxury Clothing & Tailoring | Malli & Co.",
    description:
      "Explore pure French flax linen shirts, structured Oxford button-downs, and heavyweight Pima cotton essentials.",
    url: "https://malliandco.com/men",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Men's Luxury Clothing & Tailoring | Malli & Co.",
    description:
      "Explore pure French flax linen shirts, structured Oxford button-downs, and heavyweight Pima cotton essentials.",
  },
};

export default async function MenCollectionPage({
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
    gender: "MEN",
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
        name: "Men",
        item: "https://malliandco.com/men",
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
        title="Men's Collection"
        subtitle="Artisanal French linen tailoring, Oxford shirts, and luxurious Pima cotton staples cut for the modern gentleman."
        genderFilter="MEN"
      />
    </>
  );
}

