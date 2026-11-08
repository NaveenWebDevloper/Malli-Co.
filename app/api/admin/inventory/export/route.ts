import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "../../../../../lib/db.ts";
import { Variant } from "../../../../../models/Variant.ts";
import { Product } from "../../../../../models/Product.ts";

function escapeCSV(value: string | number | undefined | null): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

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

  const variants = await Variant.find(filter)
    .populate("productId", "name slug")
    .sort({ stock: 1, sku: 1 })
    .lean();

  const headers = [
    "SKU",
    "Product Name",
    "Options",
    "Current Stock",
    "Low Stock Threshold",
    "Stock Status",
    "Price (INR)",
    "Status",
  ];

  const rows = variants.map((v) => {
    let optionsStr = "";
    if (v.options instanceof Map) {
      optionsStr = Array.from(v.options.entries())
        .map(([k, val]) => `${k}: ${val}`)
        .join("; ");
    } else if (v.options && typeof v.options === "object") {
      optionsStr = Object.entries(v.options)
        .map(([k, val]) => `${k}: ${val}`)
        .join("; ");
    }

    const productName =
      v.productId && typeof v.productId === "object" && "name" in v.productId
        ? (v.productId as { name: string }).name
        : "Unknown Product";

    const threshold = v.lowStockThreshold ?? 5;
    const isLow = (v.stock ?? 0) <= threshold;
    const stockStatus = (v.stock ?? 0) === 0 ? "OUT OF STOCK" : isLow ? "LOW STOCK" : "IN STOCK";
    const priceINR = (v.pricePaise / 100).toFixed(2);

    return [
      escapeCSV(v.sku),
      escapeCSV(productName),
      escapeCSV(optionsStr || "-"),
      escapeCSV(v.stock),
      escapeCSV(threshold),
      escapeCSV(stockStatus),
      escapeCSV(priceINR),
      escapeCSV(v.status),
    ].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\r\n");
  const dateStr = new Date().toISOString().slice(0, 10);

  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inventory-export-${dateStr}.csv"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

