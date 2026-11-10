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

interface ResolvedCategory {
  _id?: unknown;
  name: string;
  slug: string;
  description?: string;
  gender: "MEN" | "KIDS" | "UNISEX";
  isActive: boolean;
}

async function resolveCategory(slug: string): Promise<ResolvedCategory | null> {
  const normalized = slug.toLowerCase().trim();

  // 1. Exact match in database
  const category = await Category.findOne({ slug: normalized, isActive: true }).lean();
  if (category) {
    return category as unknown as ResolvedCategory;
  }

  // 2. Umbrella / alias patterns (e.g. "mens-shirts", "shirts", "mens-t-shirts")
  let regex: RegExp | null = null;
  let defaultName = "";
  let defaultGender: "MEN" | "KIDS" = "MEN";

  if (/^(?:mens?[-_]?)?shirts?$/i.test(normalized)) {
    regex = /shirt/i;
    defaultName = "Men's Shirts";
  } else if (/^(?:mens?[-_]?)?t[-_]?shirts?$|^tshirts?$/i.test(normalized)) {
    regex = /t[-_]?shirt|tee/i;
    defaultName = "Men's T-Shirts";
  } else if (/^(?:kids?[-_]?)?shirts?$/i.test(normalized)) {
    regex = /shirt/i;
    defaultName = "Kids' Shirts";
    defaultGender = "KIDS";
  } else if (/^(?:mens?[-_]?)?jeans?$|^baggy[-_]?jeans?$/i.test(normalized)) {
    regex = /jean/i;
    defaultName = "Men's Jeans";
  } else if (/^(?:mens?[-_]?)?pants?$|trousers?$/i.test(normalized)) {
    regex = /pant|trouser/i;
    defaultName = "Men's Pants & Trousers";
  }

  if (regex) {
    const matched = await Category.find({
      $or: [{ slug: regex }, { name: regex }],
      isActive: true,
    }).lean();

    return {
      _id: matched[0]?._id,
      name: defaultName || (matched[0]?.name ?? "Category"),
      slug: normalized,
      description: matched[0]?.description || `Explore our handcrafted ${defaultName}.`,
      gender: defaultGender,
      isActive: true,
    };
  }

  // 3. Fuzzy search by keywords in category name
  const fuzzy = await Category.findOne({
    name: { $regex: normalized.replace(/[-_]/g, " "), $options: "i" },
    isActive: true,
  }).lean();

  if (fuzzy) {
    return fuzzy as unknown as ResolvedCategory;
  }

  return null;
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
  const category = await resolveCategory(slug);

  if (!category) {
    return {
      title: "Category Not Found | Malli & Co.",
    };
  }

  const title = `${category.name} | Malli & Co. Luxury Apparel`;
  const description =
    category.description ||
    `Explore premium ${category.name} crafted from pure linen and quality cottons.`;

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

  const category = await resolveCategory(slug);
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
