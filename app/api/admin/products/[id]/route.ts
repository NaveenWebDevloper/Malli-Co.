import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { revalidateTag, revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { connectDB } from "../../../../../lib/db.ts";
import { Product } from "../../../../../models/Product.ts";
import { Variant } from "../../../../../models/Variant.ts";
import { Order } from "../../../../../models/Order.ts";
import { Collection } from "../../../../../models/Collection.ts";
import { Campaign } from "../../../../../models/Campaign.ts";
import { AuditLog } from "../../../../../models/AuditLog.ts";
import { InventoryMovement } from "../../../../../models/InventoryMovement.ts";
import { ProductFormSchema } from "../../../../../lib/validations/product.ts";
import { rupeesToPaise, paiseToRupees } from "../../../../../lib/currency.ts";
import { partitionRemovableVariants } from "../../../../../lib/variants.ts";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
      { error: "Invalid product ID format" },
      { status: 400 },
    );
  }

  await connectDB();

  const product = await Product.findById(id)
    .populate("brandId", "name slug")
    .populate("categoryId", "name slug")
    .lean();

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const variants = await Variant.find({ productId: id })
    .sort({ isDefault: -1, createdAt: 1 })
    .lean();

  const formattedVariants = variants.map((v) => ({
    _id: v._id.toString(),
    sku: v.sku,
    price: paiseToRupees(v.pricePaise),
    compareAtPrice: v.compareAtPricePaise
      ? paiseToRupees(v.compareAtPricePaise)
      : null,
    stock: v.stock,
    images: v.images,
    options: Object.fromEntries(
      v.options instanceof Map ? v.options : Object.entries(v.options || {}),
    ),
    isDefault: v.isDefault,
    status: v.status,
  }));

  return NextResponse.json({
    product: {
      ...product,
      basePrice: paiseToRupees(product.basePricePaise),
      variants: formattedVariants,
    },
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
      { error: "Invalid product ID format" },
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

  const parseResult = ProductFormSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parseResult.error.format() },
      { status: 400 },
    );
  }

  const data = parseResult.data;
  const productId = new mongoose.Types.ObjectId(id);

  // 1. Slug uniqueness (excluding this product)
  const duplicateSlug = await Product.findOne({
    slug: data.slug,
    _id: { $ne: productId },
  });
  if (duplicateSlug) {
    return NextResponse.json(
      { error: `Slug '${data.slug}' is already taken by another product.` },
      { status: 409 },
    );
  }

  // 2. SKU uniqueness across entire catalog
  const incomingSkus = data.variants.map((v) => v.sku);
  const skuSet = new Set<string>();
  for (const sku of incomingSkus) {
    if (skuSet.has(sku)) {
      return NextResponse.json(
        { error: `Duplicate SKU '${sku}' found in variant table.` },
        { status: 400 },
      );
    }
    skuSet.add(sku);
  }

  // Check if any incoming SKU belongs to a different product
  const conflictingSku = await Variant.findOne({
    sku: { $in: incomingSkus },
    productId: { $ne: productId },
  });
  if (conflictingSku) {
    return NextResponse.json(
      {
        error: `SKU '${conflictingSku.sku}' is already assigned to a different product.`,
      },
      { status: 409 },
    );
  }

  // 3. Transactional update with Rule 5 (Archive variants with orders)
  const dbSession = await mongoose.startSession();
  try {
    let updatedProductResult: unknown;
    await dbSession.withTransaction(async () => {
      // Fetch existing variants
      const existingVariants = await Variant.find({ productId }).session(
        dbSession,
      );
      const existingMap = new Map(
        existingVariants.map((v) => [v._id.toString(), v]),
      );

      const incomingIds = new Set(
        data.variants
          .map((v) => v._id)
          .filter(
            (idVal): idVal is string =>
              typeof idVal === "string" && idVal.length > 0,
          ),
      );

      // Determine removed variants
      const removedVariantIds: mongoose.Types.ObjectId[] = [];
      for (const [vId, vDoc] of existingMap.entries()) {
        if (!incomingIds.has(vId) && vDoc.status !== "ARCHIVED") {
          removedVariantIds.push(vDoc._id as mongoose.Types.ObjectId);
        }
      }

      // Check which removed variants must be ARCHIVED vs can be safely deleted (Rule 5)
      const { safeToDelete, mustArchive } = await partitionRemovableVariants(
        removedVariantIds,
        dbSession,
      );

      // Archive variants with orders
      if (mustArchive.length > 0) {
        await Variant.updateMany(
          { _id: { $in: mustArchive } },
          { $set: { status: "ARCHIVED" } },
          { session: dbSession },
        );
      }

      // Delete variants with zero orders
      if (safeToDelete.length > 0) {
        await Variant.deleteMany(
          { _id: { $in: safeToDelete } },
          { session: dbSession },
        );
      }

      // Process Upserts & Updates for incoming variants
      for (let i = 0; i < data.variants.length; i++) {
        const v = data.variants[i];
        const newStock = v.stock;
        const newPricePaise = rupeesToPaise(v.price);
        const newCompareAtPricePaise = v.compareAtPrice
          ? rupeesToPaise(v.compareAtPrice)
          : undefined;

        if (v._id && existingMap.has(v._id)) {
          // Existing variant update
          const existingV = existingMap.get(v._id)!;
          const oldStock = existingV.stock;

          // If stock changed manually, record audit movement (Rule 3)
          if (newStock !== oldStock) {
            const stockDelta = newStock - oldStock;
            await InventoryMovement.create(
              [
                {
                  variantId: existingV._id,
                  productId,
                  sku: v.sku,
                  change: stockDelta,
                  previousStock: oldStock,
                  newStock,
                  reason: stockDelta > 0 ? "RESTOCK" : "ADJUST",
                  note: `Manual stock edit in admin product manager`,
                },
              ],
              { session: dbSession, ordered: true },
            );
          }

          const cleanedImages = (v.images || []).filter(
            (img: string) => !img.includes("simulated_"),
          );
          const variantImages =
            cleanedImages.length > 0 ? cleanedImages : data.images;

          await Variant.findByIdAndUpdate(
            v._id,
            {
              $set: {
                sku: v.sku,
                pricePaise: newPricePaise,
                compareAtPricePaise: newCompareAtPricePaise,
                stock: newStock,
                images: variantImages,
                options: new Map(Object.entries(v.options || {})),
                isDefault: i === 0,
                status: "ACTIVE",
              },
            },
            { session: dbSession },
          );
        } else {
          // Newly added variant
          const cleanedNewImages = (v.images || []).filter(
            (img: string) => !img.includes("simulated_"),
          );
          const newVariantImages =
            cleanedNewImages.length > 0 ? cleanedNewImages : data.images;

          const [newVariant] = await Variant.create(
            [
              {
                productId,
                sku: v.sku,
                pricePaise: newPricePaise,
                compareAtPricePaise: newCompareAtPricePaise,
                stock: newStock,
                images: newVariantImages,
                options: new Map(Object.entries(v.options || {})),
                isDefault: i === 0,
                status: "ACTIVE",
              },
            ],
            { session: dbSession, ordered: true },
          );

          if (newStock > 0) {
            await InventoryMovement.create(
              [
                {
                  variantId: newVariant._id,
                  productId,
                  sku: newVariant.sku,
                  change: newStock,
                  previousStock: 0,
                  newStock,
                  reason: "RESTOCK",
                  note: `New variant added during product edit`,
                },
              ],
              { session: dbSession, ordered: true },
            );
          }
        }
      }

      // Update parent Product
      updatedProductResult = await Product.findByIdAndUpdate(
        productId,
        {
          $set: {
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
        },
        { session: dbSession, new: true },
      );
    });

    return NextResponse.json({
      status: "success",
      product: updatedProductResult,
    });
  } finally {
    await dbSession.endSession();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
      { error: "Invalid product ID format" },
      { status: 400 },
    );
  }

  await connectDB();
  const productId = new mongoose.Types.ObjectId(id);

  const product = await Product.findById(productId);
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (product.deletedAt) {
    return NextResponse.json(
      { error: "Product is already in trash" },
      { status: 400 },
    );
  }

  let reason = "";
  try {
    const body = await req.json();
    if (typeof body?.reason === "string") {
      reason = body.reason.trim().slice(0, 200);
    }
  } catch {
    // Optional body
  }

  const now = new Date();
  const adminId = session.user.id && mongoose.Types.ObjectId.isValid(session.user.id)
    ? new mongoose.Types.ObjectId(session.user.id)
    : undefined;

  let cleanedCollections = 0;
  let cleanedCampaigns = 0;

  const dbSession = await mongoose.startSession();
  try {
    await dbSession.withTransaction(async () => {
      // 1. Soft-delete product: set deletedAt, status DRAFT
      await Product.updateOne(
        { _id: productId },
        {
          $set: {
            deletedAt: now,
            status: "DRAFT",
            deletedBy: adminId,
            deleteReason: reason || null,
          },
        },
        { session: dbSession },
      );

      // 2. Soft-delete and archive all associated variants
      await Variant.updateMany(
        { productId },
        {
          $set: {
            deletedAt: now,
            status: "ARCHIVED",
          },
        },
        { session: dbSession },
      );

      // 3. Remove product from manual collections
      const colRes = await Collection.updateMany(
        { productIds: productId },
        { $pull: { productIds: productId } },
        { session: dbSession },
      );
      cleanedCollections = colRes.modifiedCount || 0;

      // 4. Remove product from campaign scopes and exclusions
      const campRes = await Campaign.updateMany(
        {
          $or: [
            { "scope.ids": productId },
            { "scope.excludeProductIds": productId },
          ],
        },
        {
          $pull: {
            "scope.ids": productId,
            "scope.excludeProductIds": productId,
          },
        },
        { session: dbSession },
      );
      cleanedCampaigns = campRes.modifiedCount || 0;

      // 5. Create Audit Log
      await AuditLog.create(
        [
          {
            action: "PRODUCT_SOFT_DELETE",
            actor: {
              id: adminId || new mongoose.Types.ObjectId(),
              name: session.user.name || "Admin",
              email: session.user.email || "admin@malliandco.com",
            },
            productId,
            productName: product.name,
            reason: reason || undefined,
            cleanedReferences: {
              collections: cleanedCollections,
              campaigns: cleanedCampaigns,
            },
          },
        ],
        { session: dbSession },
      );
    });

    // Check open (undelivered) orders containing this product to warn the admin
    const openOrdersCount = await Order.countDocuments({
      "items.productId": productId,
      status: { $in: ["PENDING", "PROCESSING", "CONFIRMED", "SHIPPED"] },
    });

    // Revalidate Next.js cache tags
    try {
      revalidateTag("products");
      revalidateTag("collections");
      revalidateTag("categories");
      revalidatePath("/");
      revalidatePath(`/product/${product.slug}`);
      revalidatePath("/sitemap.xml");
    } catch (revalErr) {
      console.warn("Cache revalidation non-fatal error:", revalErr);
    }

    return NextResponse.json({
      success: true,
      message: `Product '${product.name}' moved to Trash.`,
      openOrdersWarning:
        openOrdersCount > 0
          ? `Warning: ${openOrdersCount} open order(s) currently contain this product.`
          : null,
      openOrdersCount,
      cleanedReferences: {
        collections: cleanedCollections,
        campaigns: cleanedCampaigns,
      },
    });
  } catch (err) {
    console.error("Failed to soft-delete product:", err);
    return NextResponse.json(
      { error: "Failed to move product to trash" },
      { status: 500 },
    );
  } finally {
    await dbSession.endSession();
  }
}
