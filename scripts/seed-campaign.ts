import mongoose from "mongoose";
import { connectDB } from "../lib/db.ts";
import { Campaign } from "../models/Campaign.ts";

async function seedSampleCampaign() {
  await connectDB();
  const existing = await Campaign.findOne({ slug: "diwali-festive-sale" });
  if (existing) {
    console.log("Campaign diwali-festive-sale already exists.");
    return;
  }

  const now = new Date();
  const ends = new Date(Date.now() + 7 * 86400000);

  await Campaign.create({
    name: "Diwali Festive Luxury Sale",
    slug: "diwali-festive-sale",
    type: "FESTIVE",
    description: "Annual Diwali atelier celebration across all artisanal menswear and festive kids tailoring.",
    startsAt: now,
    endsAt: ends,
    active: true,
    priority: 20,
    discount: {
      kind: "PERCENT",
      value: 20,
      maxDiscountAmount: 200000, // ₹2,000 max cap in paise
    },
    scope: {
      mode: "ALL",
      gender: "MEN",
    },
    display: {
      badgeLabel: "DIWALI SALE",
      themeColor: "#D4AF37",
      showCountdown: true,
      landingEnabled: true,
    },
  });

  // Also create a scheduled flash offer
  const futureStart = new Date(Date.now() + 3 * 86400000);
  const futureEnd = new Date(Date.now() + 4 * 86400000);
  await Campaign.create({
    name: "Midnight Flash Linen Drop",
    slug: "midnight-flash-linen",
    type: "FLASH",
    description: "24-hour flash offer on French flax linen shirts.",
    startsAt: futureStart,
    endsAt: futureEnd,
    active: true,
    priority: 30,
    discount: {
      kind: "FLAT",
      value: 50000, // ₹500 off in paise
    },
    scope: {
      mode: "CATEGORIES",
    },
    display: {
      badgeLabel: "FLASH 24H",
      themeColor: "#991B1B",
      showCountdown: true,
      landingEnabled: false,
    },
  });

  console.log("Seeded sample campaigns.");
}

seedSampleCampaign()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  });

