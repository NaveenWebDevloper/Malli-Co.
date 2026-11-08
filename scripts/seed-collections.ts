import mongoose from "mongoose";
import { connectDB } from "../lib/db.ts";
import { Collection } from "../models/Collection.ts";
import { Product } from "../models/Product.ts";

export async function seedCollections() {
  await connectDB();
  console.log("Seeding curated collections...");

  // 1. Seed "Season's Top Picks" (MANUAL mode)
  const existingTopPicks = await Collection.findOne({ slug: "seasons-top-picks" });
  if (!existingTopPicks) {
    // Find active products to add into manual order
    const sampleProducts = await Product.find({ status: "ACTIVE" })
      .limit(8)
      .select("_id")
      .lean();

    const productIds = sampleProducts.map((p) => p._id);

    await Collection.create({
      name: "Season's Top Picks Shelf",
      slug: "seasons-top-picks",
      title: "Season's Top Picks",
      subtitle: "Our most sought-after silhouettes and luxury linen tailoring",
      description: "Hand-curated bespoke pieces celebrating Indian craftsmanship and Italian linen.",
      mode: "MANUAL",
      productIds,
      maxItems: 8,
      active: true,
    });
    console.log("✓ Seeded 'Season\'s Top Picks' collection (MANUAL)");
  } else {
    console.log("ℹ 'Season\'s Top Picks' collection already exists");
  }

  // 2. Seed "New Arrivals" (AUTO NEWEST mode)
  const existingNewArrivals = await Collection.findOne({ slug: "new-arrivals" });
  if (!existingNewArrivals) {
    await Collection.create({
      name: "New Arrivals Atelier Drop",
      slug: "new-arrivals",
      title: "New Arrivals",
      subtitle: "Freshly released cuts and contemporary seasonal tones",
      description: "Automatically curated newest additions across Malli & Co. ateliers.",
      mode: "AUTO",
      autoRule: {
        type: "NEWEST",
        limit: 10,
      },
      maxItems: 10,
      active: true,
    });
    console.log("✓ Seeded 'New Arrivals' collection (AUTO NEWEST)");
  } else {
    console.log("ℹ 'New Arrivals' collection already exists");
  }

  console.log("Curated collections seeding complete.");
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith("seed-collections.ts")) {
  seedCollections()
    .then(() => {
      console.log("Done.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seeding error:", err);
      process.exit(1);
    });
}

