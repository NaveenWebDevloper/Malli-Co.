import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "../../../../lib/db.ts";
import { Product, type IProduct } from "../../../../models/Product.ts";
import { Variant } from "../../../../models/Variant.ts";
import { InventoryMovement } from "../../../../models/InventoryMovement.ts";
import { Brand } from "../../../../models/Brand.ts";
import { Category } from "../../../../models/Category.ts";
import { ProductFormSchema } from "../../../../lib/validations/product.ts";
import { rupeesToPaise } from "../../../../lib/currency.ts";

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
  const categoryId = searchParams.get("categoryId")?.trim();
  const brandId = searchParams.get("brandId")?.trim();
  const status = searchParams.get("status")?.trim();
  const gender = searchParams.get("gender")?.trim();
  const type = searchParams.get("type")?.trim();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    50,
    Math.max(1, parseInt(searchParams.get("limit") || "10", 10)),
  );
  const skip = (page - 1) * limit;

  const query: mongoose.FilterQuery<IProduct> = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { slug: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
    query.categoryId = new mongoose.Types.ObjectId(categoryId);
  }

  if (brandId && mongoose.Types.ObjectId.isValid(brandId)) {
    query.brandId = new mongoose.Types.ObjectId(brandId);
  }

  if (status && (status === "ACTIVE" || status === "DRAFT")) {
    query.status = status;
  }

  if (gender && (gender === "MEN" || gender === "KIDS")) {
    query.gender = gender;
  }

  if (type && (type === "SIMPLE" || type === "VARIABLE")) {
    query.type = type;
  }

  const [products, totalCount, brands, categories] = await Promise.all([
    Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("brandId", "name slug")
      .populate("categoryId", "name slug")
      .lean(),
    Product.countDocuments(query),
    Brand.find({ isActive: true }).select("name slug").lean(),
    Category.find({ isActive: true }).select("name slug gender").lean(),
  ]);

  // For each product, fetch aggregate variant info (stock and SKU count)
  const productIds = products.map((p) => p._id);
  const variants = await Variant.find({
    productId: { $in: productIds },
    status: "ACTIVE",
  })
    .select("productId stock sku pricePaise compareAtPricePaise isDefault")
    .lean();

  const variantsByProduct = new Map<string, typeof variants>();
  for (const v of variants) {
    const pId = v.productId.toString();
    const list = variantsByProduct.get(pId) || [];
    list.push(v);
    variantsByProduct.set(pId, list);
  }

  const enrichedProducts = products.map((p) => {
    const pVariants = variantsByProduct.get(p._id.toString()) || [];
    const totalStock = pVariants.reduce((sum, v) => sum + (v.stock || 0), 0);
    const skuCount = pVariants.length;

    let stockBadge: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" = "IN_STOCK";
    if (totalStock === 0) {
      stockBadge = "OUT_OF_STOCK";
    } else if (totalStock <= 5) {
      stockBadge = "LOW_STOCK";
    }

    return {
      ...p,
      totalStock,
      skuCount,
      stockBadge,
      sampleSku: pVariants[0]?.sku || "",
    };
  });

  return NextResponse.json({
    products: enrichedProducts,
    pagination: {
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    },
    facets: {
      brands,
      categories,
    },
  });
}

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

  // Rule 6: Validate with Zod
  const parseResult = ProductFormSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parseResult.error.format() },
      { status: 400 },
    );
  }

  const data = parseResult.data;

  // 1. Check duplicate product slug
  const existingProduct = await Product.findOne({ slug: data.slug });
  if (existingProduct) {
    return NextResponse.json(
      { error: `A product with slug '${data.slug}' already exists.` },
      { status: 409 },
    );
  }

  // 2. Check unique SKUs across entire catalog
  const incomingSkus = data.variants.map((v) => v.sku);
  const skuSet = new Set<string>();
  for (const sku of incomingSkus) {
    if (skuSet.has(sku)) {
      return NextResponse.json(
        { error: `Duplicate SKU '${sku}' found in the variant table.` },
        { status: 400 },
      );
    }
    skuSet.add(sku);
  }

  const existingVariantWithSku = await Variant.findOne({
    sku: { $in: incomingSkus },
  });
  if (existingVariantWithSku) {
    return NextResponse.json(
      {
        error: `SKU '${existingVariantWithSku.sku}' is already assigned to another product.`,
      },
      { status: 409 },
    );
  }

  // 3. Atomic creation inside transaction
  const dbSession = await mongoose.startSession();
  try {
    let createdProduct: unknown;
    await dbSession.withTransaction(async () => {
      // Create Product
      const [newProduct] = await Product.create(
        [
          {
            name: data.name,
            slug: data.slug,
            description: data.description,
            brandId: new mongoose.Types.ObjectId(data.brandId),
            categoryId: new mongoose.Types.ObjectId(data.categoryId),
            gender: data.gender,
            type: data.type,
            basePricePaise: rupeesToPaise(data.basePrice),
            status: data.status,
            images: data.images,
            productAttributes: data.productAttributes.map((attr) => ({
              attributeId:
                attr.attributeId &&
                mongoose.Types.ObjectId.isValid(attr.attributeId)
                  ? new mongoose.Types.ObjectId(attr.attributeId)
                  : new mongoose.Types.ObjectId(),
              name: attr.name,
              values: attr.values,
            })),
          },
        ],
        { session: dbSession },
      );

      createdProduct = newProduct;

      // Create Variants
      const variantsToCreate = data.variants.map((v, index) => ({
        productId: newProduct._id,
        sku: v.sku,
        pricePaise: rupeesToPaise(v.price),
        compareAtPricePaise: v.compareAtPrice
          ? rupeesToPaise(v.compareAtPrice)
          : undefined,
        stock: v.stock,
        images:
          (v.images || []).filter((img: string) => !img.includes("simulated_"))
            .length > 0
            ? (v.images || []).filter(
                (img: string) => !img.includes("simulated_"),
              )
            : data.images,
        options: new Map(Object.entries(v.options || {})),
        isDefault: index === 0, // First variant is default
        status: v.status || "ACTIVE",
      }));

      const insertedVariants = await Variant.create(variantsToCreate, {
        session: dbSession,
        ordered: true,
      });

      // Audit Initial Inventory Movements for stock > 0 (Rule 3)
      const movementsToLog = insertedVariants
        .filter((v) => v.stock > 0)
        .map((v) => ({
          variantId: v._id,
          productId: newProduct._id,
          sku: v.sku,
          change: v.stock,
          previousStock: 0,
          newStock: v.stock,
          reason: "RESTOCK" as const,
          note: `Initial product creation: ${newProduct.name}`,
        }));

      if (movementsToLog.length > 0) {
        await InventoryMovement.create(movementsToLog, {
          session: dbSession,
          ordered: true,
        });
      }
    });

    return NextResponse.json(
      { status: "success", product: createdProduct },
      { status: 201 },
    );
  } finally {
    await dbSession.endSession();
  }
}
