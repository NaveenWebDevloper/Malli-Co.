import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { connectDB } from "@/lib/db";
import { Campaign } from "@/models/Campaign";
import { getCatalogProducts, type CatalogResult } from "@/lib/catalog";
import { ProductCatalogView } from "@/components/store/ProductCatalogView";

interface SalePageProps {
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

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: SalePageProps): Promise<Metadata> {
  await connectDB();
  const { slug } = await params;
  const campaign = await Campaign.findOne({ slug: slug.toLowerCase().trim() }).lean();

  if (!campaign) {
    return {
      title: "Sale Event | Malli & Co. Luxury Apparel",
      description: "Discover limited-time artisanal tailoring promotions at Malli & Co.",
    };
  }

  const title = `${campaign.name} | Malli & Co. Luxury Sale`;
  const description =
    campaign.description ||
    `Enjoy exclusive celebratory pricing on handcrafted linen and cotton garments during ${campaign.name}.`;

  const bannerImg = campaign.display?.bannerImage?.url || "/images/placeholder.jpg";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: bannerImg, alt: campaign.name }],
      url: `https://malliandco.com/sale/${slug}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [bannerImg],
    },
  };
}

export default async function SaleLandingPage({ params, searchParams }: SalePageProps) {
  await connectDB();
  const { slug } = await params;
  const search = await searchParams;
  const now = new Date();

  const campaign = await Campaign.findOne({
    slug: slug.toLowerCase().trim(),
  }).lean();

  const isExpired =
    !campaign ||
    !campaign.active ||
    campaign.startsAt > now ||
    campaign.endsAt < now;

  // =========================================================================
  // ENDED / INACTIVE CAMPAIGN STATE
  // =========================================================================
  if (isExpired) {
    // Fetch any currently live campaigns to offer alternatives
    const liveCampaigns = await Campaign.find({
      active: true,
      startsAt: { $lte: now },
      endsAt: { $gte: now },
    })
      .select("name slug display discount")
      .limit(3)
      .lean();

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center space-y-8">
        <div className="space-y-3">
          <span className="inline-block text-[10px] font-bold uppercase tracking-[0.25em] text-[#8C7A58] bg-[#8C7A58]/10 px-3 py-1 rounded-full">
            Event Concluded
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-black uppercase tracking-tight text-[#121212]">
            {campaign?.name || "Sale Event"} Has Ended
          </h1>
          <p className="text-sm text-neutral-600 max-w-lg mx-auto font-light leading-relaxed">
            This limited-time atelier sale event has drawn to a close. You can still discover
            ongoing promotions, our curated Season&apos;s Top Picks, or explore the permanent collections.
          </p>
        </div>

        {/* Live Alternative Sales */}
        {liveCampaigns.length > 0 && (
          <div className="pt-6 border-t border-[#EAE3D4] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500">
              Active Storewide Sales
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {liveCampaigns.map((c) => (
                <Link
                  key={c._id.toString()}
                  href={`/sale/${c.slug}`}
                  className="px-5 py-2.5 rounded-full bg-[#121212] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#8C7A58] transition"
                >
                  {c.name} →
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Permanent Collections Navigation */}
        <div className="flex justify-center gap-4 pt-4">
          <Link
            href="/men"
            className="px-6 py-3 rounded-full border border-[#DDD4C1] text-xs font-bold uppercase tracking-wider text-neutral-800 hover:bg-[#F0EBE1] transition"
          >
            Men&apos;s Collection
          </Link>
          <Link
            href="/kids"
            className="px-6 py-3 rounded-full border border-[#DDD4C1] text-xs font-bold uppercase tracking-wider text-neutral-800 hover:bg-[#F0EBE1] transition"
          >
            Kids&apos; Collection
          </Link>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ACTIVE CAMPAIGN: QUERY PRODUCTS MATCHING SCOPE
  // =========================================================================
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

  // Query catalog products with search parameters
  const catalogResult = await getCatalogProducts({
    gender: campaign.scope?.gender,
    sizes,
    colors,
    brandSlug: search.brand,
    sortBy: search.sort || "newest",
    minPricePaise: search.minPrice ? parseInt(search.minPrice, 10) * 100 : undefined,
    maxPricePaise: search.maxPrice ? parseInt(search.maxPrice, 10) * 100 : undefined,
    page: search.page ? parseInt(search.page, 10) : 1,
    limit: 24,
  });

  // Filter products by campaign scope mode
  const filteredProducts = catalogResult.products.filter((p) => {
    // Check exclusions
    if (
      campaign.scope?.excludeProductIds &&
      campaign.scope.excludeProductIds.some((id: unknown) => id?.toString() === p._id)
    ) {
      return false;
    }

    if (campaign.scope?.gender && p.gender !== campaign.scope.gender) {
      return false;
    }

    const mode = campaign.scope?.mode || "ALL";
    if (mode === "ALL") return true;

    if (mode === "CATEGORIES" && campaign.scope?.ids?.length) {
      return (
        p.category &&
        campaign.scope.ids.some((id: unknown) => id?.toString() === p.category?._id)
      );
    }

    if (mode === "BRANDS" && campaign.scope?.ids?.length) {
      return (
        p.brand &&
        campaign.scope.ids.some((id: unknown) => id?.toString() === p.brand?._id)
      );
    }

    if (mode === "PRODUCTS" && campaign.scope?.ids?.length) {
      return campaign.scope.ids.some((id: unknown) => id?.toString() === p._id);
    }

    return true;
  });

  const resolvedCatalogResult: CatalogResult = {
    ...catalogResult,
    products: filteredProducts,
    totalCount: filteredProducts.length,
  };

  const discountBadge =
    campaign.display?.badgeLabel ||
    (campaign.discount?.kind === "PERCENT"
      ? `${campaign.discount.value}% OFF`
      : `FLAT ₹${campaign.discount.value / 100} OFF`);

  const bannerImg = campaign.display?.bannerImage?.url;
  const themeColor = campaign.display?.themeColor || "#8C7A58";

  return (
    <div className="space-y-8 pb-16">
      {/* Campaign Editorial Hero Header */}
      <section className="w-[calc(100%-32px)] lg:w-[80%] mx-auto pt-6">
        <div className="relative overflow-hidden rounded-3xl bg-neutral-950 text-white min-h-[300px] sm:min-h-[380px] flex flex-col justify-end p-6 sm:p-12 border border-[#EAE3D4]/20 shadow-md">
          {bannerImg && (
            <Image
              src={bannerImg}
              alt={campaign.name}
              fill
              sizes="(max-width: 1024px) calc(100vw - 32px), 80vw"
              className="object-cover object-center"
              priority
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/30 z-10" />

          <div className="relative z-20 max-w-2xl space-y-3">
            <div>
              <span
                className="inline-block text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-md shadow-md text-white border border-white/20"
                style={{ backgroundColor: themeColor }}
              >
                {discountBadge}
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-serif font-black uppercase tracking-tight text-white drop-shadow-sm">
              {campaign.name}
            </h1>

            {campaign.description && (
              <p className="text-xs sm:text-sm text-neutral-200 font-light max-w-xl leading-relaxed">
                {campaign.description}
              </p>
            )}

            <p className="text-[11px] text-white/70 font-mono">
              Ends {new Date(campaign.endsAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </section>

      {/* Filterable Product Grid */}
      <ProductCatalogView
        wide
        initialResult={resolvedCatalogResult}
        title={campaign.name}
        subtitle={`Showing ${filteredProducts.length} items covered by ${campaign.name}`}
        genderFilter={campaign.scope?.gender}
      />
    </div>
  );
}
