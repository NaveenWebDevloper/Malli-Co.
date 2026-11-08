import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { CategoryFormSchema } from "@/lib/validations/category";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/categories/[id]:
 * Retrieve a single category by its MongoDB ObjectId.
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
      { error: "Invalid category ID format" },
      { status: 400 },
    );
  }

  await connectDB();

  const category = await Category.findById(id)
    .populate("parentId", "name slug")
    .lean();

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const productCount = await Product.countDocuments({
    categoryId: new mongoose.Types.ObjectId(id),
  });

  const parent = category.parentId as unknown as { _id?: unknown; name?: string; slug?: string } | null;

  return NextResponse.json({
    category: {
      _id: category._id.toString(),
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      imageUrl: category.imageUrl || "",
      gender: category.gender,
      parentId: parent?._id ? parent._id.toString() : null,
      parentName: parent?.name || null,
      isActive: category.isActive,
      trending: category.trending || { enabled: false, sortOrder: 0 },
      productCount,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    },
  });
}

/**
 * PUT /api/admin/categories/[id]:
 * Update an existing category.
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
      { error: "Invalid category ID format" },
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

  const parseResult = CategoryFormSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parseResult.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parseResult.data;
  const categoryId = new mongoose.Types.ObjectId(id);

  // 1. Slug uniqueness (excluding this category)
  const existingCategory = await Category.findOne({
    slug: data.slug,
    _id: { $ne: categoryId },
  });
  if (existingCategory) {
    return NextResponse.json(
      { error: `Slug '${data.slug}' is already taken by another category.` },
      { status: 409 },
    );
  }

  // 2. Prevent setting itself as parent
  if (data.parentId && data.parentId === id) {
    return NextResponse.json(
      { error: "A category cannot be its own parent category." },
      { status: 400 },
    );
  }

  // 3. Parent existence check
  let parentObjectId: mongoose.Types.ObjectId | null = null;
  if (data.parentId) {
    if (!mongoose.Types.ObjectId.isValid(data.parentId)) {
      return NextResponse.json(
        { error: "Invalid parent category ID format" },
        { status: 400 },
      );
    }
    const parent = await Category.findById(data.parentId);
    if (!parent) {
      return NextResponse.json(
        { error: "Selected parent category does not exist" },
        { status: 404 },
      );
    }
    parentObjectId = parent._id as mongoose.Types.ObjectId;
  }

  try {
    const updatePayload: Record<string, unknown> = {
      name: data.name,
      slug: data.slug,
      description: data.description,
      imageUrl: data.imageUrl || undefined,
      gender: data.gender,
      parentId: parentObjectId,
      isActive: data.isActive,
    };

    if (data.trending) {
      updatePayload.trending = data.trending;
    }

    const updated = await Category.findByIdAndUpdate(
      categoryId,
      { $set: updatePayload },
      { new: true },
    );

    if (!updated) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    try {
      revalidateTag("categories");
      revalidateTag("categories-trending");
    } catch {
      // Ignore cache revalidation errors
    }

    return NextResponse.json({
      success: true,
      message: `Category '${updated.name}' updated successfully.`,
      category: {
        _id: updated._id.toString(),
        name: updated.name,
        slug: updated.slug,
        description: updated.description,
        imageUrl: updated.imageUrl,
        gender: updated.gender,
        parentId: updated.parentId ? updated.parentId.toString() : null,
        isActive: updated.isActive,
        trending: updated.trending,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error("Failed to update category:", error);
    return NextResponse.json(
      { error: "Failed to update category in database" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/categories/[id]:
 * Safely delete a category with strict foreign-key protection guards.
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
      { error: "Invalid category ID format" },
      { status: 400 },
    );
  }

  await connectDB();
  const categoryId = new mongoose.Types.ObjectId(id);

  const category = await Category.findById(categoryId);
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  // Guard 1: Cannot delete if products reference this category
  const productCount = await Product.countDocuments({ categoryId });
  if (productCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete category '${category.name}' because ${productCount} product(s) are currently assigned to it. Please reassign those products first or deactivate this category.`,
      },
      { status: 400 },
    );
  }

  // Guard 2: Cannot delete if other categories have this category as parent
  const childCategoryCount = await Category.countDocuments({ parentId: categoryId });
  if (childCategoryCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete category '${category.name}' because ${childCategoryCount} subcategories depend on it. Please reassign or delete subcategories first.`,
      },
      { status: 400 },
    );
  }

  try {
    await Category.deleteOne({ _id: categoryId });

    return NextResponse.json({
      success: true,
      message: `Category '${category.name}' deleted successfully.`,
    });
  } catch (error) {
    console.error("Failed to delete category:", error);
    return NextResponse.json(
      { error: "Failed to delete category from database" },
      { status: 500 },
    );
  }
}

export const PATCH = PUT;


