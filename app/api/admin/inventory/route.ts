import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "../../../../lib/db.ts";
import { Variant } from "../../../../models/Variant.ts";
import { Product } from "../../../../models/Product.ts";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Admin role required" },
      { status: 403 },
    );
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const lowStockOnly = searchParams.get("lowStock") === "true";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
  );
  const skip = (page - 1) * limit;

  // Filter definition
  const filter: mongoose.FilterQuery<typeof Variant> = {
    status: "ACTIVE",
  };

  if (lowStockOnly) {
    filter.$expr = {
      $lte: ["$stock", { $ifNull: ["$lowStockThreshold", 5] }],
    };
  }

  if (search) {
    const matchingProducts = await Product.find({
      name: { $regex: search, $options: "i" },
    })
      .select("_id")
      .lean();
    const productIds = matchingProducts.map((p) => p._id);

    filter.$or = [
      { sku: { $regex: search, $options: "i" } },
      { productId: { $in: productIds } },
    ];
  }

  const [variants, totalCount, lowStockCount] = await Promise.all([
    Variant.find(filter)
      .populate("productId", "name slug basePricePaise type gender images status")
      .sort({ stock: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Variant.countDocuments(filter),
    Variant.countDocuments({
      status: "ACTIVE",
      $expr: {
        $lte: ["$stock", { $ifNull: ["$lowStockThreshold", 5] }],
      },
    }),
  ]);

  // Clean serialization of options map and documents
  const serializedVariants = variants.map((v) => {
    let optionsRecord: Record<string, string> = {};
    if (v.options instanceof Map) {
      optionsRecord = Object.fromEntries(v.options);
    } else if (v.options && typeof v.options === "object") {
      optionsRecord = v.options as Record<string, string>;
    }

    const threshold = v.lowStockThreshold ?? 5;
    const isLowStock = (v.stock ?? 0) <= threshold;

    return {
      _id: v._id.toString(),
      sku: v.sku,
      pricePaise: v.pricePaise,
      compareAtPricePaise: v.compareAtPricePaise,
      stock: v.stock,
      lowStockThreshold: threshold,
      isLowStock,
      isDefault: v.isDefault,
      status: v.status,
      options: optionsRecord,
      images: v.images || [],
      product: v.productId,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    };
  });

  return NextResponse.json({
    variants: serializedVariants,
    totalCount,
    lowStockCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit) || 1,
  });
}

