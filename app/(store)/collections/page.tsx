import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { connectDB } from "@/lib/db";
import { Collection } from "@/models/Collection";
import { resolveCollectionProducts } from "@/lib/collections";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Featured Collections | Malli & Co. Premium Apparel",
  description:
    "Explore menswear and kids' clothing collections crafted by Malli & Co.",
  openGraph: {
    title: "Featured Collections | Malli & Co.",
    description:
      "Explore menswear and kids' clothing collections crafted by Malli & Co.",
    url: "https://malliandco.com/collections",
  },
};

export default async function CollectionsDirectoryPage() {
  await connectDB();
  const rawCollections = await Collection.find({ active: true })
    .sort({ updatedAt: -1 })
    .lean();

  // Resolve collection previews
  const collectionsWithPreview = await Promise.all(
    rawCollections.map(async (col) => {
      const resolved = await resolveCollectionProducts(col, { previewMax: 4 });
      return {
        _id: String(col._id),
        name: col.name,
        slug: col.slug,
        title: col.title,
        subtitle: col.subtitle,
        description: col.description,
        mode: col.mode,
        productCount: resolved.products.length,
        previewImages: resolved.products
          .map((p) => p.firstImage)
          .filter(Boolean)
          .slice(0, 4),
      };
    }),
  );

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#121212]">
      {/* Header Banner */}
      <div className="border-b border-[#EDE6D8] bg-gradient-to-b from-[#F5EFE6]/70 via-[#FAF6F0] to-[#FDFBF7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16">
          <nav aria-label="Breadcrumb" className="mb-4 text-xs text-neutral-500 font-medium">
            <Link href="/" className="hover:text-black transition-colors">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="text-[#8C7A58] font-semibold">Collections</span>
          </nav>

          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] text-[#8C7A58]">
              <span className="w-5 h-[1.5px] bg-[#8C7A58]" aria-hidden="true" />
              <span>Malli &amp; Co. Special Edits</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-serif font-black tracking-tight text-[#121212]">
              Featured Collections
            </h1>
            <p className="text-sm sm:text-base text-neutral-600 font-light max-w-2xl leading-relaxed">
              Explore our thematic showcases, seasonal edits, and signature styles made from pure linen and premium cotton.
            </p>
          </div>
        </div>
      </div>

      {/* Collections Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {collectionsWithPreview.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-[#EDE6D8] p-8 max-w-md mx-auto shadow-sm">
            <span className="text-4xl block mb-3">🧺</span>
            <h2 className="text-lg font-bold text-neutral-900 font-serif">
              Collections in preparation
            </h2>
            <p className="text-xs text-neutral-500 mt-1 mb-6">
              We are currently preparing new seasonal collections. Please check back shortly.
            </p>
            <Link
              href="/men"
              className="inline-block px-5 py-2.5 rounded-xl bg-[#26221C] text-white text-xs font-semibold hover:bg-black transition"
            >
              Explore Men&apos;s Collection
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {collectionsWithPreview.map((col) => (
              <Link
                key={col._id}
                href={`/collections/${col.slug}`}
                className="group flex flex-col justify-between rounded-3xl bg-white border border-[#EDE6D8] overflow-hidden shadow-xs hover:border-[#8C7A58] hover:shadow-xl transition-all duration-300"
              >
                <div>
                  {/* Image Collage Preview */}
                  <div className="relative aspect-[16/9] w-full bg-[#F4EFE6] overflow-hidden grid grid-cols-2 gap-0.5">
                    {col.previewImages.length > 0 ? (
                      col.previewImages.slice(0, 4).map((img, idx) => (
                        <div key={idx} className="relative w-full h-full overflow-hidden bg-neutral-100">
                          <Image
                            src={img}
                            alt=""
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="200px"
                          />
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 flex items-center justify-center text-xs text-neutral-400">
                        Malli &amp; Co.
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                    <span className="absolute bottom-3 left-3 px-2.5 py-0.5 rounded-full bg-white/90 backdrop-blur-xs text-[10px] font-bold uppercase tracking-wider text-neutral-900">
                      {col.productCount} {col.productCount === 1 ? "Product" : "Products"}
                    </span>
                  </div>

                  {/* Body Text */}
                  <div className="p-6 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8C7A58]">
                      {col.mode === "MANUAL" ? "Special Edit" : "Trending Shelf"}
                    </span>
                    <h2 className="text-xl font-serif font-bold text-neutral-900 group-hover:text-[#8C7A58] transition-colors leading-snug">
                      {col.title}
                    </h2>
                    {col.subtitle && (
                      <p className="text-xs text-neutral-600 font-serif italic">
                        {col.subtitle}
                      </p>
                    )}
                    {col.description && (
                      <p className="text-xs text-neutral-500 font-light line-clamp-2 pt-1 leading-relaxed">
                        {col.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-between text-xs font-semibold text-neutral-800 group-hover:text-black">
                  <span>Explore Collection</span>
                  <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
