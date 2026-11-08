import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getProductBySlug, buildProductJsonLd } from "@/lib/catalog";
import { ProductDetailView } from "@/components/store/ProductDetailView";
import { getPersonalizedSimilarProducts } from "@/lib/recommendations";
import { SimilarProductsSection } from "@/components/product/SimilarProductsSection";
import { RecentlyViewedSection } from "@/components/product/RecentlyViewedSection";
import { RecentlyViewedTracker } from "@/components/product/RecentlyViewedTracker";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Product Not Found | Malli & Co.",
    };
  }

  const title = `${product.name} | Malli & Co. Luxury Apparel`;
  const description =
    product.description ||
    `Discover ${product.name} crafted from pure luxury fabrics by ${
      product.brand?.name || "Malli & Co."
    }.`;

  const primaryImage = product.images?.[0] || "/images/placeholder.jpg";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: primaryImage,
          alt: product.name,
        },
      ],
      url: `https://malliandco.com/product/${slug}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [primaryImage],
    },
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const session = await auth();
  const userId = session?.user?.id;

  // Retrieve personalized recommendations based on category, gender, style, and customer order history
  const similarProducts = await getPersonalizedSimilarProducts({
    currentProductId: product._id,
    currentSlug: product.slug,
    categoryId: product.category?._id,
    gender: product.gender,
    basePricePaise: product.basePricePaise,
    name: product.name,
    description: product.description,
    userId,
    limit: 8,
  });

  const jsonLd = buildProductJsonLd(product, "https://malliandco.com");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <RecentlyViewedTracker slug={product.slug} />
      <ProductDetailView product={product} />
      <SimilarProductsSection
        currentProduct={product}
        initialProducts={similarProducts}
      />
      <RecentlyViewedSection currentSlug={product.slug} />
    </>
  );
}

