import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { connectDB } from "../lib/db.ts";
import { HeroBanner } from "../models/HeroBanner.ts";

function loadEnv() {
  if (process.env.MONGODB_URI) return;

  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const [key, ...rest] = trimmed.split("=");
        if (key && rest.length > 0) {
          const val = rest.join("=").replace(/^["'](.*)["']$/, "$1");
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = val.trim();
          }
        }
      }
      break;
    }
  }
}

loadEnv();

const SAMPLE_BANNERS = [
  {
    title: "W I N T E R",
    subtitle:
      "Hand-tailored outerwear, French flax linen overshirts, and heavyweight Pima layers designed for understated distinction.",
    eyebrow: "THE FINER SIDE OF",
    ctaLabel: "EXPLORE WINTERWEAR",
    ctaUrl: "/men",
    secondaryCtaLabel: "DISCOVER LOOKBOOK",
    secondaryCtaUrl: "#lookbook",
    imageDesktop: {
      url: "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=2400&auto=format&fit=crop",
      width: 2400,
      height: 1350,
    },
    imageMobile: {
      url: "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=1200&auto=format&fit=crop",
      width: 1200,
      height: 1600,
    },
    altText: "Gentleman in bespoke Malli & Co. winter tailoring",
    textPosition: "left",
    textTheme: "light",
    overlayOpacity: 45,
    sortOrder: 0,
    active: true,
  },
  {
    title: "SARTORIAL HERITAGE",
    subtitle:
      "Pure Supima cotton and bespoke single-needle stitching tailored with uncompromising Indian craftsmanship.",
    eyebrow: "ATELIER CRAFTSMANSHIP",
    ctaLabel: "SHOP NOBLE SHIRTING",
    ctaUrl: "/men",
    secondaryCtaLabel: "OUR HERITAGE",
    secondaryCtaUrl: "/men",
    imageDesktop: {
      url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=2400&auto=format&fit=crop",
      width: 2400,
      height: 1350,
    },
    imageMobile: {
      url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=1200&auto=format&fit=crop",
      width: 1200,
      height: 1600,
    },
    altText: "Artisanal craftsmanship and tailored luxury linen shirts",
    textPosition: "left",
    textTheme: "light",
    overlayOpacity: 35,
    sortOrder: 1,
    active: true,
  },
  {
    title: "CELEBRATIONS IN SILK & LINEN",
    subtitle:
      "Featherlight festive apparel for boys and young gentlemen. Crafted for joy, grandeur, and heirloom memories.",
    eyebrow: "LITTLE MALLI BOYS",
    ctaLabel: "EXPLORE KIDS' COLLECTION",
    ctaUrl: "/kids",
    secondaryCtaLabel: "NEW ARRIVALS",
    secondaryCtaUrl: "/kids",
    imageDesktop: {
      url: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?q=80&w=2400&auto=format&fit=crop",
      width: 2400,
      height: 1350,
    },
    imageMobile: {
      url: "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?q=80&w=1200&auto=format&fit=crop",
      width: 1200,
      height: 1600,
    },
    altText: "Festive celebratory luxury apparel for boys",
    textPosition: "center",
    textTheme: "light",
    overlayOpacity: 30,
    sortOrder: 2,
    active: true,
  },
];

export async function seedHeroBanners() {
  await connectDB();
  const existingCount = await HeroBanner.countDocuments();

  if (existingCount > 0) {
    console.log(
      `ℹ️ Found ${existingCount} existing banner(s). Sample banners are ready.`,
    );
    return;
  }

  console.log("Seeding sample hero banners into MongoDB...");
  await HeroBanner.insertMany(SAMPLE_BANNERS);
  console.log(`✅ Successfully seeded ${SAMPLE_BANNERS.length} hero banners.`);
}

seedHeroBanners()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("Failed to seed hero banners:", err);
    await mongoose.disconnect();
    process.exit(1);
  });
