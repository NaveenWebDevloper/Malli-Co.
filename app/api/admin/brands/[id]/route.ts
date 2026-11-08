import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Brand } from "@/models/Brand";
import { Product } from "@/models/Product";
import { BrandFormSchema } from "@/lib/validations/brand";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/brands/[id]:
 * Retrieve a single brand by its MongoDB ObjectId.
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Admin role required" },
      { status: 403 },
    );
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: "Invalid brand ID format" },
      { status: 400 },
    );
  }

  await connectDB();

  const brand = await Brand.findById(id).lean();
  if (!brand) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  const productCount = await Product.countDocuments({
    brandId: new mongoose.Types.ObjectId(id),
  });

  return NextResponse.json({
    brand: {
      _id: brand._id.toString(),
      name: brand.name,
      slug: brand.slug,
      description: brand.description || "",
      logoUrl: brand.logoUrl || "",
      isActive: brand.isActive,
      productCount,
      createdAt: brand.createdAt,
      updatedAt: brand.updatedAt,
    },
  });
}

/**
 * PUT /api/admin/brands/[id]:
 * Update an existing brand.
 */
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Admin role required" },
      { status: 403 },
    );
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: "Invalid brand ID format" },
      { status: 400 },
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
  const brandId = new mongoose.Types.ObjectId(id);

  // Slug uniqueness (excluding this brand)
  const existingBrand = await Brand.findOne({
    slug: data.slug,
    _id: { $ne: brandId },
  });
  if (existingBrand) {
    return NextResponse.json(
      { error: `Slug '${data.slug}' is already taken by another brand.` },
      { status: 409 },
    );
  }

  try {
    const updated = await Brand.findByIdAndUpdate(
      brandId,
      {
        $set: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          logoUrl: data.logoUrl,
          isActive: data.isActive,
        },
      },
      { new: true },
    );

    if (!updated) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Brand '${updated.name}' updated successfully.`,
      brand: {
        _id: updated._id.toString(),
        name: updated.name,
        slug: updated.slug,
        description: updated.description,
        logoUrl: updated.logoUrl,
        isActive: updated.isActive,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error("Failed to update brand:", error);
    return NextResponse.json(
      { error: "Failed to update brand in database" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/brands/[id]:
 * Safely delete a brand with foreign-key protection guards.
 */
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Admin role required" },
      { status: 403 },
    );
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: "Invalid brand ID format" },
      { status: 400 },
    );
  }

  await connectDB();
  const brandId = new mongoose.Types.ObjectId(id);

  const brand = await Brand.findById(brandId);
  if (!brand) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  // Guard: Cannot delete if products reference this brand
  const productCount = await Product.countDocuments({ brandId });
  if (productCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete brand '${brand.name}' because ${productCount} product(s) are currently assigned to it. Please reassign those products first or deactivate this brand.`,
      },
      { status: 400 },
    );
  }

  try {
    await Brand.deleteOne({ _id: brandId });

    return NextResponse.json({
      success: true,
      message: `Brand '${brand.name}' deleted successfully.`,
    });
  } catch (error) {
    console.error("Failed to delete brand:", error);
    return NextResponse.json(
      { error: "Failed to delete brand from database" },
      { status: 500 },
    );
  }
}

