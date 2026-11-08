import fs from "fs";
import path from "path";
import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { connectDB } from "../lib/db.ts";
import { HeroBanner } from "../models/HeroBanner.ts";
import { getActiveHeroBanners } from "../lib/banners.ts";

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

test("Homepage Hero Banner & Storefront Integration (Stage 4)", async (t) => {
  await connectDB();

  await t.test("1. Server-side getActiveHeroBanners() query", async () => {
    const banners = await getActiveHeroBanners();
    assert.ok(Array.isArray(banners), "Expected banners array");
    assert.ok(banners.length > 0, "Expected at least 1 active banner seeded");
    assert.ok(banners.length <= 8, "Expected max 8 banners");

    // Verify sort order
    for (let i = 1; i < banners.length; i++) {
      assert.ok(
        banners[i].sortOrder >= banners[i - 1].sortOrder,
        `Expected sort order to be non-decreasing: ${banners[i - 1].sortOrder} <= ${banners[i].sortOrder}`
      );
    }

    // Verify all returned banners have essential UI properties
    for (const b of banners) {
      assert.ok(b.id, "Banner must have id");
      assert.ok(b.title, "Banner must have title");
      assert.ok(b.ctaLabel, "Banner must have ctaLabel");
      assert.ok(b.ctaUrl, "Banner must have ctaUrl");
      assert.ok(b.imageDesktop?.url, "Banner must have desktop image url");
      assert.ok(b.altText, "Banner must have altText for accessibility");
    }
  });

  await t.test("2. Schedule window filtering in getActiveHeroBanners()", async () => {
    const now = Date.now();
    // Create an expired banner and a future banner
    const expiredBanner = await HeroBanner.create({
      title: "Expired Winter Sale",
      ctaLabel: "Shop Expired",
      ctaUrl: "/sale",
      imageDesktop: {
        url: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35",
      },
      altText: "Expired banner",
      startsAt: new Date(now - 7 * 86400000),
      endsAt: new Date(now - 1 * 86400000), // Ended yesterday
      active: true,
      sortOrder: 99,
    });

    const futureBanner = await HeroBanner.create({
      title: "Future Spring Collection",
      ctaLabel: "Coming Soon",
      ctaUrl: "/spring",
      imageDesktop: {
        url: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35",
      },
      altText: "Future banner",
      startsAt: new Date(now + 3 * 86400000), // Starts in 3 days
      active: true,
      sortOrder: 99,
    });

    try {
      const activeBanners = await getActiveHeroBanners();
      const expiredFound = activeBanners.find((b) => b.id === expiredBanner._id.toString());
      const futureFound = activeBanners.find((b) => b.id === futureBanner._id.toString());

      assert.equal(expiredFound, undefined, "Expired banner must not appear in active storefront query");
      assert.equal(futureFound, undefined, "Future scheduled banner must not appear in active storefront query");
    } finally {
      await HeroBanner.deleteOne({ _id: expiredBanner._id });
      await HeroBanner.deleteOne({ _id: futureBanner._id });
    }
  });

  await mongoose.disconnect();
});
