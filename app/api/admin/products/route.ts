import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "../../../../lib/db.ts";
import { Product, type IProduct } from "../../../../models/Product.ts";
import { Variant } from "../../../../models/Variant.ts";
import { Order } from "../../../../models/Order.ts";
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
  const view = (searchParams.get("view")?.trim().toLowerCase() || "active") as
    | "active"
    | "draft"
    | "trash"
    | "all";
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

  // Tab view filtering
  if (view === "trash") {
    query.deletedAt = { $ne: null };
  } else if (view === "draft") {
    query.deletedAt = null;
    query.status = "DRAFT";
  } else if (view === "active") {
    query.deletedAt = null;
    query.status = "ACTIVE";
  } else {
    // "all" view
    query.deletedAt = null;
  }

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

  if (status && (status === "ACTIVE" || status === "DRAFT") && view === "all") {
    query.status = status;
  }

  if (gender && (gender === "MEN" || gender === "KIDS")) {
    query.gender = gender;
  }

  if (type && (type === "SIMPLE" || type === "VARIABLE")) {
    query.type = type;
  }

  const [products, totalCount, brands, categories, activeCount, draftCount, trashCount] =
    await Promise.all([
      Product.find(query)
        .sort(view === "trash" ? { deletedAt: -1 } : { createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("brandId", "name slug")
        .populate("categoryId", "name slug")
        .lean(),
      Product.countDocuments(query),
      Brand.find({ isActive: true }).select("name slug").lean(),
      Category.find({ isActive: true }).select("name slug gender").lean(),
      Product.countDocuments({ deletedAt: null, status: "ACTIVE" }),
      Product.countDocuments({ deletedAt: null, status: "DRAFT" }),
      Product.countDocuments({ deletedAt: { $ne: null } }),
    ]);

  // For each product, fetch aggregate variant info (stock and SKU count)
  const productIds = products.map((p) => p._id);
  const variants = await Variant.find({
    productId: { $in: productIds },
  })
    .select("productId stock sku pricePaise compareAtPricePaise isDefault status deletedAt")
    .lean();

  const variantsByProduct = new Map<string, typeof variants>();
  for (const v of variants) {
    const pId = v.productId.toString();
    const list = variantsByProduct.get(pId) || [];
    list.push(v);
    variantsByProduct.set(pId, list);
  }

  // If in trash view, check if products have historical orders
  const productOrderCounts = new Map<string, number>();
  if (view === "trash" && productIds.length > 0) {
    const orders = await Order.find({
      "items.productId": { $in: productIds },
    }).select("items.productId");

    for (const o of orders) {
      for (const item of o.items) {
        if (item.productId) {
          const idStr = item.productId.toString();
          productOrderCounts.set(idStr, (productOrderCounts.get(idStr) || 0) + 1);
        }
      }
    }
  }

  const enrichedProducts = products.map((p) => {
    const pVariants = variantsByProduct.get(p._id.toString()) || [];
    const activeVariants = pVariants.filter((v) => v.status === "ACTIVE" && !v.deletedAt);
    const totalStock = activeVariants.reduce((sum, v) => sum + (v.stock || 0), 0);
    const skuCount = pVariants.length;

    let stockBadge: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" = "IN_STOCK";
    if (totalStock === 0) {
      stockBadge = "OUT_OF_STOCK";
    } else if (totalStock <= 5) {
      stockBadge = "LOW_STOCK";
    }

    const orderCount = productOrderCounts.get(p._id.toString()) || 0;
    const canPermanentlyDelete = orderCount === 0;

    // Calculate days remaining for auto-purge (30-day retention)
    let daysUntilPurge: number | null = null;
    if (p.deletedAt) {
      const deletedTime = new Date(p.deletedAt).getTime();
      const elapsedDays = (Date.now() - deletedTime) / (1000 * 60 * 60 * 24);
      daysUntilPurge = Math.max(0, Math.ceil(30 - elapsedDays));
    }

    return {
      ...p,
      totalStock,
      skuCount,
      stockBadge,
      sampleSku: pVariants[0]?.sku || "",
      orderCount,
      canPermanentlyDelete,
      daysUntilPurge,
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
    counts: {
      active: activeCount,
      draft: draftCount,
      trash: trashCount,
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
