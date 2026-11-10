import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { getCollectionBySlug, getActiveCollections } from "@/lib/collections";
import { CollectionView } from "@/components/store/CollectionView";

export const dynamic = "force-dynamic";

interface CollectionPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const cleanSlug = decodeURIComponent(slug).toLowerCase().trim().replace(/^\/+/, "");

  const collection = await getCollectionBySlug(cleanSlug);
  if (!collection) {
    return {
      title: "Collection | Malli & Co. Luxury Apparel",
      description: "Explore curated artisanal luxury menswear and kids' clothing at Malli & Co.",
    };
  }

  const title = `${collection.title} | Malli & Co. Luxury Collections`;
  const description =
    collection.description ||
    collection.subtitle ||
    `Discover ${collection.title} — a curated atelier selection of handcrafted luxury menswear and festive apparel at Malli & Co.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://malliandco.com/collections/${cleanSlug}`,
      type: "website",
      images: collection.products[0]?.firstImage
        ? [{ url: collection.products[0].firstImage, alt: collection.title }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: collection.products[0]?.firstImage ? [collection.products[0].firstImage] : undefined,
    },
  };
}

export default async function CollectionDetailPage({ params }: CollectionPageProps) {
  const { slug } = await params;
  const cleanSlug = decodeURIComponent(slug).toLowerCase().trim().replace(/^\/+/, "");

  await connectDB();
  const collection = await getCollectionBySlug(cleanSlug);

  if (!collection) {
    // If not found, fetch active collections to suggest
    const activeCollections = await getActiveCollections();
    if (activeCollections.length === 0) {
      notFound();
    }

    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-20 bg-[#FDFBF7]">
        <div className="max-w-md space-y-4">
          <span className="text-4xl block">🧺</span>
          <h1 className="text-2xl font-serif font-bold text-neutral-900">
            Collection Not Found
          </h1>
          <p className="text-xs text-neutral-500 leading-relaxed">
            The collection <span className="font-mono text-neutral-700">/{cleanSlug}</span> is either inactive or does not exist. Explore our other curated showcases below:
          </p>
          <div className="pt-4 flex flex-col gap-2">
            {activeCollections.slice(0, 3).map((col) => (
              <a
                key={String(col._id)}
                href={`/collections/${col.slug}`}
                className="px-4 py-3 rounded-xl bg-white border border-[#EDE6D8] hover:border-[#8C7A58] text-xs font-semibold text-neutral-800 transition shadow-2xs"
              >
                {col.title} →
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Fetch other active collections for bottom cross-navigation
  const allActive = await getActiveCollections();
  const otherCollections = allActive
    .filter((c) => c.slug !== cleanSlug)
    .slice(0, 3)
    .map((c) => ({
      _id: String(c._id),
      title: c.title,
      subtitle: c.subtitle,
      slug: c.slug,
      productCount: c.mode === "MANUAL" ? (c.productIds || []).length : (c.maxItems || 10),
      mode: c.mode,
    }));

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: collection.title,
    description: collection.description || collection.subtitle,
    url: `https://malliandco.com/collections/${cleanSlug}`,
    hasPart: collection.products.map((p, index) => ({
      "@type": "Product",
      position: index + 1,
      name: p.name,
      url: `https://malliandco.com/product/${p.slug}`,
      image: p.firstImage,
      offers: {
        "@type": "Offer",
        price: (p.pricing.finalPrice / 100).toFixed(2),
        priceCurrency: "INR",
        availability: p.hasStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <CollectionView collection={collection} otherCollections={otherCollections} />
    </>
  );
}
