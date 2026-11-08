import fs from "fs";
import path from "path";
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import {
  HeroBannerSchema,
  SafeUrlSchema,
  HeroBannerReorderSchema,
} from "../lib/validations/banner.ts";
import { getImageDimensions } from "../lib/images.ts";
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

describe("Hero Banner: Data Model, Zod Validation & Public API (Stage 1)", () => {
  const BASE_URL = "http://localhost:3000";
  const createdBannerIds: mongoose.Types.ObjectId[] = [];

  before(async () => {
    await connectDB();
  });

  after(async () => {
    if (createdBannerIds.length > 0) {
      await HeroBanner.deleteMany({ _id: { $in: createdBannerIds } });
    }
    await mongoose.disconnect();
  });

  describe("1. URL Scheme & Input Sanitization (Rule 6)", () => {
    it("accepts valid internal paths for ctaUrl", () => {
      const validInternal = ["/men", "/kids", "/collections/winter", "/product/linen-shirt"];
      for (const url of validInternal) {
        const res = SafeUrlSchema.safeParse(url);
        assert.equal(res.success, true, `Should accept internal path: ${url}`);
      }
    });

    it("accepts valid HTTPS URLs for ctaUrl", () => {
      const validHttps = [
        "https://malliandco.com/lookbook",
        "https://cdn.example.com/editorial",
      ];
      for (const url of validHttps) {
        const res = SafeUrlSchema.safeParse(url);
        assert.equal(res.success, true, `Should accept HTTPS URL: ${url}`);
      }
    });

    it("strictly rejects javascript: and malicious schemes", () => {
      const malicious = [
        "javascript:alert(1)",
        "javascript:void(0)",
        "data:text/html,<script>alert(1)</script>",
        "vbscript:msgbox(1)",
        "http://insecure.com/steal",
        "//protocol-relative-domain.com",
      ];
      for (const url of malicious) {
        const res = SafeUrlSchema.safeParse(url);
        assert.equal(res.success, false, `Must reject malicious URL: ${url}`);
      }
    });

    it("enforces title, subtitle, and overlay opacity bounds in HeroBannerSchema", () => {
      const validPayload = {
        title: "Autumn Heritage 2026",
        subtitle: "Noble tailoring and bespoke silhouettes.",
        eyebrow: "NEW ARRIVALS",
        ctaLabel: "EXPLORE NOW",
        ctaUrl: "/men",
        imageDesktop: {
          url: "https://images.unsplash.com/photo-1",
          width: 2400,
          height: 1350,
        },
        altText: "Artisanal collection",
        overlayOpacity: 30,
      };

      const parsed = HeroBannerSchema.safeParse(validPayload);
      assert.equal(parsed.success, true);

      // Title > 80 chars
      const longTitle = "A".repeat(81);
      assert.equal(
        HeroBannerSchema.safeParse({ ...validPayload, title: longTitle }).success,
        false,
      );

      // Subtitle > 160 chars
      const longSubtitle = "B".repeat(161);
      assert.equal(
        HeroBannerSchema.safeParse({ ...validPayload, subtitle: longSubtitle }).success,
        false,
      );

      // Overlay opacity > 60
      assert.equal(
        HeroBannerSchema.safeParse({ ...validPayload, overlayOpacity: 75 }).success,
        false,
      );

      // Missing alt text
      assert.equal(
        HeroBannerSchema.safeParse({ ...validPayload, altText: "" }).success,
        false,
      );
    });
  });

  describe("2. Image Dimension Header Extractor (Rule 10 Compliant)", () => {
    it("correctly parses PNG dimensions from buffer header", () => {
      // Mock minimal 1600x900 PNG header
      const pngBuffer = Buffer.alloc(24);
      pngBuffer[0] = 0x89;
      pngBuffer[1] = 0x50;
      pngBuffer[2] = 0x4e;
      pngBuffer[3] = 0x47;
      pngBuffer.writeUInt32BE(1600, 16); // width = 1600
      pngBuffer.writeUInt32BE(900, 20);  // height = 900

      const dims = getImageDimensions(pngBuffer);
      assert.ok(dims);
      assert.equal(dims.type, "png");
      assert.equal(dims.width, 1600);
      assert.equal(dims.height, 900);
    });

    it("returns null for non-image or corrupted buffers", () => {
      const textBuffer = Buffer.from("Hello world this is not an image");
      const dims = getImageDimensions(textBuffer);
      assert.equal(dims, null);
    });
  });

  describe("3. Schedule Window & Public API Filtering", () => {
    it("public GET /api/banners returns active banners and excludes expired or future scheduled banners", async () => {
      const now = Date.now();

      // 1. Create an active banner with no dates
      const activeBanner = await HeroBanner.create({
        title: `Active Test Banner ${now}`,
        ctaLabel: "SHOP",
        ctaUrl: "/men",
        imageDesktop: { url: "https://example.com/desktop.jpg" },
        altText: "Active banner",
        active: true,
        sortOrder: 0,
      });
      createdBannerIds.push(activeBanner._id as mongoose.Types.ObjectId);

      // 2. Create an expired banner (ended 2 hours ago)
      const expiredBanner = await HeroBanner.create({
        title: `Expired Test Banner ${now}`,
        ctaLabel: "SHOP",
        ctaUrl: "/men",
        imageDesktop: { url: "https://example.com/desktop.jpg" },
        altText: "Expired banner",
        active: true,
        endsAt: new Date(now - 2 * 60 * 60 * 1000), // 2 hrs ago
        sortOrder: 1,
      });
      createdBannerIds.push(expiredBanner._id as mongoose.Types.ObjectId);

      // 3. Create a future scheduled banner (starts in 2 days)
      const futureBanner = await HeroBanner.create({
        title: `Future Test Banner ${now}`,
        ctaLabel: "SHOP",
        ctaUrl: "/men",
        imageDesktop: { url: "https://example.com/desktop.jpg" },
        altText: "Future banner",
        active: true,
        startsAt: new Date(now + 2 * 24 * 60 * 60 * 1000), // 2 days in future
        sortOrder: 2,
      });
      createdBannerIds.push(futureBanner._id as mongoose.Types.ObjectId);

      // 4. Create an inactive banner (active: false)
      const inactiveBanner = await HeroBanner.create({
        title: `Inactive Test Banner ${now}`,
        ctaLabel: "SHOP",
        ctaUrl: "/men",
        imageDesktop: { url: "https://example.com/desktop.jpg" },
        altText: "Inactive banner",
        active: false,
        sortOrder: 3,
      });
      createdBannerIds.push(inactiveBanner._id as mongoose.Types.ObjectId);

      // Fetch public API
      const res = await fetch(`${BASE_URL}/api/banners`);
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.ok(data.success);
      assert.ok(Array.isArray(data.banners));

      const returnedTitles = data.banners.map((b: { title: string }) => b.title);

      // Active banner MUST be present
      assert.ok(
        returnedTitles.includes(activeBanner.title),
        "Active banner must appear in public banners",
      );

      // Expired banner MUST NOT be present
      assert.ok(
        !returnedTitles.includes(expiredBanner.title),
        "Expired banner must NOT appear in public banners",
      );

      // Future scheduled banner MUST NOT be present
      assert.ok(
        !returnedTitles.includes(futureBanner.title),
        "Future scheduled banner must NOT appear in public banners",
      );

      // Inactive banner MUST NOT be present
      assert.ok(
        !returnedTitles.includes(inactiveBanner.title),
        "Inactive banner must NOT appear in public banners",
      );

      // Verify max 8 cap
      assert.ok(data.banners.length <= 8, "Must not exceed 8 banners");
    });
  });

  describe("4. Reorder Schema & Bulk Logic", () => {
    it("validates well-formed reorder payload", () => {
      const validPayload = {
        items: [
          { id: "6aeda76d4722e72f3550dfcc", sortOrder: 1 },
          { id: "6aeda76d4722e72f3550dfcd", sortOrder: 0 },
        ],
      };
      const parsed = HeroBannerReorderSchema.safeParse(validPayload);
      assert.equal(parsed.success, true);
    });

    it("rejects reorder payload with empty items", () => {
      const invalid = { items: [{ id: "", sortOrder: 0 }] };
      const parsed = HeroBannerReorderSchema.safeParse(invalid);
      assert.equal(parsed.success, false);
    });
  });

  describe("5. Admin RBAC Protection (Rule 7)", () => {
    it("blocks unauthenticated requests to /api/admin/banners with 401 Unauthorized", async () => {
      const res = await fetch(`${BASE_URL}/api/admin/banners`);
      assert.equal(res.status, 401, "Unauthenticated request to /api/admin/banners must return 401");
    });

    it("blocks unauthenticated requests to /api/admin/banners/reorder with 401 Unauthorized", async () => {
      const res = await fetch(`${BASE_URL}/api/admin/banners/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [] }),
      });
      assert.equal(res.status, 401, "Unauthenticated request to reorder must return 401");
    });

    it("blocks unauthenticated requests to /api/admin/banners/upload with 401 Unauthorized", async () => {
      const res = await fetch(`${BASE_URL}/api/admin/banners/upload`, {
        method: "POST",
      });
      assert.equal(res.status, 401, "Unauthenticated request to upload must return 401");
    });
  });
});
