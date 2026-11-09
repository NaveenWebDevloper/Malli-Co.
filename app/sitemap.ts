import type { MetadataRoute } from "next";
import { connectDB } from "@/lib/db";
import { Product, Category } from "@/models";
import { activeStorefrontProductFilter } from "@/lib/catalog-query";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "https://malliandco.com";

  try {
    await connectDB();

    const [products, categories] = await Promise.all([
      Product.find(activeStorefrontProductFilter())
        .select("slug updatedAt")
        .lean(),
      Category.find({ isActive: true })
        .select("slug updatedAt")
        .lean(),
    ]);

    const productUrls: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${baseUrl}/product/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    const categoryUrls: MetadataRoute.Sitemap = categories.map((c) => ({
      url: `${baseUrl}/category/${c.slug}`,
      lastModified: c.updatedAt ? new Date(c.updatedAt) : new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    const staticRoutes: MetadataRoute.Sitemap = [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 1.0,
      },
      {
        url: `${baseUrl}/men`,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 0.9,
      },
      {
        url: `${baseUrl}/kids`,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 0.9,
      },
      {
        url: `${baseUrl}/privacy`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.5,
      },
      {
        url: `${baseUrl}/terms`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.5,
      },
    ];

    return [...staticRoutes, ...categoryUrls, ...productUrls];
  } catch (error) {
    console.error("Failed to generate dynamic sitemap:", error);
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 1.0,
      },
    ];
  }
}

