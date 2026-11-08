import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Brand, type IBrand } from "@/models/Brand";
import { Product } from "@/models/Product";
import { BrandFormSchema } from "@/lib/validations/brand";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/brands:
 * List all brands with product counts and search filters.
 */
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
  const isActiveParam = searchParams.get("isActive");

  const query: mongoose.FilterQuery<IBrand> = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { slug: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  if (isActiveParam !== null && isActiveParam !== undefined && isActiveParam !== "") {
    query.isActive = isActiveParam === "true";
  }

  try {
    const brands = await Brand.find(query).sort({ createdAt: -1 }).lean();

    // Aggregate product counts per brand
    const brandIds = brands.map((b) => b._id);
    const productCounts = await Product.aggregate([
      { $match: { brandId: { $in: brandIds } } },
      { $group: { _id: "$brandId", count: { $sum: 1 } } },
    ]);

    const countMap = new Map<string, number>();
    for (const item of productCounts) {
      countMap.set(item._id.toString(), item.count);
    }

    const formattedBrands = brands.map((b) => ({
      _id: b._id.toString(),
      name: b.name,
      slug: b.slug,
      description: b.description || "",
      logoUrl: b.logoUrl || "",
      isActive: b.isActive,
      productCount: countMap.get(b._id.toString()) || 0,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    }));

    return NextResponse.json({
      brands: formattedBrands,
      totalCount: formattedBrands.length,
    });
  } catch (error) {
    console.error("Failed to fetch admin brands:", error);
    return NextResponse.json(
      { error: "Failed to retrieve brands from database" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/brands:
 * Create a new brand with validation and unique slug.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Admin role required" },
      { status: 403 },
    );
  }

  await connectDB();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Malformed JSON payload" },
      { status: 400 },
    );
  }

  const parseResult = BrandFormSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parseResult.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parseResult.data;

  // Slug uniqueness check
  const existingBrand = await Brand.findOne({ slug: data.slug });
  if (existingBrand) {
    return NextResponse.json(
      { error: `Brand with slug '${data.slug}' already exists.` },
      { status: 409 },
    );
  }

  try {
    const newBrand = await Brand.create({
      name: data.name,
      slug: data.slug,
      description: data.description,
      logoUrl: data.logoUrl,
      isActive: data.isActive,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Brand '${newBrand.name}' created successfully.`,
        brand: {
          _id: newBrand._id.toString(),
          name: newBrand.name,
          slug: newBrand.slug,
          description: newBrand.description,
          logoUrl: newBrand.logoUrl,
          isActive: newBrand.isActive,
          createdAt: newBrand.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create brand:", error);
    return NextResponse.json(
      { error: "Failed to create brand in database" },
      { status: 500 },
    );
  }
}

