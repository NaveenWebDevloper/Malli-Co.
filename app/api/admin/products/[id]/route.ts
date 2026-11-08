import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "../../../../../lib/db.ts";
import { Product } from "../../../../../models/Product.ts";
import { Variant } from "../../../../../models/Variant.ts";
import { Order } from "../../../../../models/Order.ts";
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
  const productId = new mongoose.Types.ObjectId(id);

  const product = await Product.findById(productId);
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Foreign key guard: check if any order references this product
  const existingOrder = await Order.findOne({ "items.productId": productId });
  if (existingOrder) {
    return NextResponse.json(
      {
        error: `Cannot delete product '${product.name}' because it has associated orders (e.g. Order #${existingOrder.orderNumber}). Please change status to DRAFT instead.`,
      },
      { status: 400 },
    );
  }

  const dbSession = await mongoose.startSession();
  try {
    await dbSession.withTransaction(async () => {
      // Delete variants
      await Variant.deleteMany({ productId }, { session: dbSession });
      // Delete inventory movements
      await InventoryMovement.deleteMany({ productId }, { session: dbSession });
      // Delete product
      await Product.deleteOne({ _id: productId }, { session: dbSession });
    });

    return NextResponse.json({
      success: true,
      message: `Product '${product.name}' and all associated variants were deleted successfully.`,
    });
  } catch (err) {
    console.error("Failed to delete product:", err);
    return NextResponse.json(
      { error: "Failed to delete product from database" },
      { status: 500 },
    );
  } finally {
    await dbSession.endSession();
  }
}
