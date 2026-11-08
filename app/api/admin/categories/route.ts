import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Category, type ICategory } from "@/models/Category";
import { Product } from "@/models/Product";
import { CategoryFormSchema } from "@/lib/validations/category";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/categories:
 * List all categories with parent hierarchy and product counts.
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
  const gender = searchParams.get("gender")?.trim();
  const isActiveParam = searchParams.get("isActive");

  const query: mongoose.FilterQuery<ICategory> = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { slug: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  if (gender && (gender === "MEN" || gender === "KIDS" || gender === "UNISEX")) {
    query.gender = gender;
  }

  if (isActiveParam !== null && isActiveParam !== undefined && isActiveParam !== "") {
    query.isActive = isActiveParam === "true";
  }

  try {
    const categories = await Category.find(query)
      .populate("parentId", "name slug")
      .sort({ createdAt: -1 })
      .lean();

    // Aggregate product counts per category
    const categoryIds = categories.map((c) => c._id);
    const productCounts = await Product.aggregate([
      { $match: { categoryId: { $in: categoryIds } } },
      { $group: { _id: "$categoryId", count: { $sum: 1 } } },
    ]);

    const countMap = new Map<string, number>();
    for (const item of productCounts) {
      countMap.set(item._id.toString(), item.count);
    }

    const formattedCategories = categories.map((c) => {
      const parent = c.parentId as unknown as { _id?: unknown; name?: string; slug?: string } | null;
      return {
        _id: c._id.toString(),
        name: c.name,
        slug: c.slug,
        description: c.description || "",
        imageUrl: c.imageUrl || "",
        gender: c.gender,
        parentId: parent?._id ? parent._id.toString() : null,
        parentName: parent?.name || null,
        isActive: c.isActive,
        trending: c.trending || { enabled: false, sortOrder: 0 },
        productCount: countMap.get(c._id.toString()) || 0,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });

    return NextResponse.json({
      categories: formattedCategories,
      totalCount: formattedCategories.length,
    });
  } catch (error) {
    console.error("Failed to fetch admin categories:", error);
    return NextResponse.json(
      { error: "Failed to retrieve categories from database" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/categories:
 * Create a new category with strict validation and unique slug enforcement.
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

  const parseResult = CategoryFormSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parseResult.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parseResult.data;

  // 1. Slug uniqueness check
  const existingCategory = await Category.findOne({ slug: data.slug });
  if (existingCategory) {
    return NextResponse.json(
      { error: `Category with slug '${data.slug}' already exists.` },
      { status: 409 },
    );
  }

  // 2. Parent Category existence check
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
    const newCategory = await Category.create({
      name: data.name,
      slug: data.slug,
      description: data.description,
      imageUrl: data.imageUrl || undefined,
      gender: data.gender,
      parentId: parentObjectId,
      isActive: data.isActive,
      trending: data.trending || { enabled: false, sortOrder: 0 },
    });

    try {
      revalidateTag("categories");
      revalidateTag("categories-trending");
    } catch {
      // Ignore cache revalidation errors
    }

    return NextResponse.json(
      {
        success: true,
        message: `Category '${newCategory.name}' created successfully.`,
        category: {
          _id: newCategory._id.toString(),
          name: newCategory.name,
          slug: newCategory.slug,
          description: newCategory.description,
          imageUrl: newCategory.imageUrl,
          gender: newCategory.gender,
          parentId: newCategory.parentId ? newCategory.parentId.toString() : null,
          isActive: newCategory.isActive,
          trending: newCategory.trending,
          createdAt: newCategory.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create category:", error);
    return NextResponse.json(
      { error: "Failed to create category in database" },
      { status: 500 },
    );
  }
}

