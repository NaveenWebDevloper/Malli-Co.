import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Category } from "@/models/Category";
import { getCatalogProducts } from "@/lib/catalog";
import { ProductCatalogView } from "@/components/store/ProductCatalogView";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    size?: string | string[];
    color?: string | string[];
    brand?: string;
    sort?: "newest" | "price-asc" | "price-desc";
    minPrice?: string;
    maxPrice?: string;
    page?: string;
  }>;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  if (!process.env.MONGODB_URI) {
    return {
      title: "Category | Malli & Co. Luxury Apparel",
    };
  }
  await connectDB();
  const { slug } = await params;
  const category = await Category.findOne({ slug, isActive: true }).lean();

  if (!category) {
    return {
      title: "Category Not Found | Malli & Co.",
    };
  }

  const title = `${category.name} | Malli & Co. Luxury Apparel`;
  const description =
    category.description ||
    `Explore handcrafted ${category.name} tailored from luxury French linen and pure Supima cottons.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://malliandco.com/category/${slug}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  if (!process.env.MONGODB_URI) {
    notFound();
  }
  await connectDB();
  const { slug } = await params;
  const search = await searchParams;

  const category = await Category.findOne({ slug, isActive: true }).lean();
  if (!category) {
    notFound();
  }

  const sizes = Array.isArray(search.size)
    ? search.size
    : search.size
    ? [search.size]
    : [];

  const colors = Array.isArray(search.color)
    ? search.color
    : search.color
    ? [search.color]
    : [];

  const catalogResult = await getCatalogProducts({
    categorySlug: slug,
    sizes,
    colors,
    brandSlug: search.brand,
    sortBy: search.sort || "newest",
    minPricePaise: search.minPrice ? parseInt(search.minPrice, 10) * 100 : undefined,
    maxPricePaise: search.maxPrice ? parseInt(search.maxPrice, 10) * 100 : undefined,
    page: search.page ? parseInt(search.page, 10) : 1,
  });

  const parentGender = category.gender === "MEN" ? "Men" : "Kids";
  const parentUrl = category.gender === "MEN" ? "/men" : "/kids";

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
        name: parentGender,
        item: `https://malliandco.com${parentUrl}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: category.name,
        item: `https://malliandco.com/category/${slug}`,
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
        title={category.name}
        subtitle={category.description}
        genderFilter={category.gender}
      />
    </>
  );
}
