import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { revalidateTag, revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { Variant } from "@/models/Variant";
import { AuditLog } from "@/models/AuditLog";

export async function POST(
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

  if (!product.deletedAt) {
    return NextResponse.json(
      { error: "Product is not in trash" },
      { status: 400 },
    );
  }

  // 1. Conflict Check: Slug collision with active or draft non-deleted product
  const conflictingSlugProduct = await Product.findOne({
    slug: product.slug,
    _id: { $ne: productId },
    deletedAt: null,
  }).select("name slug");

  if (conflictingSlugProduct) {
    return NextResponse.json(
      {
        error: `Cannot restore '${product.name}'. Its slug '${product.slug}' is now used by another active/draft product '${conflictingSlugProduct.name}'. Please edit or rename the existing product before restoring.`,
      },
      { status: 409 },
    );
  }

  // 2. Conflict Check: SKU collision with active or draft non-deleted variants
  const productVariants = await Variant.find({ productId });
  const variantSkus = productVariants.map((v) => v.sku).filter(Boolean);

  if (variantSkus.length > 0) {
    const conflictingVariant = await Variant.findOne({
      sku: { $in: variantSkus },
      productId: { $ne: productId },
      deletedAt: null,
    }).select("sku");

    if (conflictingVariant) {
      return NextResponse.json(
        {
          error: `Cannot restore '${product.name}'. SKU '${conflictingVariant.sku}' is now used by another active/draft product variant.`,
        },
        { status: 409 },
      );
    }
  }

  const adminId = session.user.id && mongoose.Types.ObjectId.isValid(session.user.id)
    ? new mongoose.Types.ObjectId(session.user.id)
    : undefined;

  const dbSession = await mongoose.startSession();
  try {
    await dbSession.withTransaction(async () => {
      // Restore product as DRAFT (never auto-published)
      await Product.updateOne(
        { _id: productId },
        {
          $set: {
            deletedAt: null,
            deletedBy: null,
            deleteReason: null,
            status: "DRAFT",
          },
        },
        { session: dbSession },
      );

      // Restore variants as ACTIVE
      await Variant.updateMany(
        { productId },
        {
          $set: {
            deletedAt: null,
            status: "ACTIVE",
          },
        },
        { session: dbSession },
      );

      // Create Audit Log
      await AuditLog.create(
        [
          {
            action: "PRODUCT_RESTORE",
            actor: {
              id: adminId || new mongoose.Types.ObjectId(),
              name: session.user.name || "Admin",
              email: session.user.email || "admin@malliandco.com",
            },
            productId,
            productName: product.name,
          },
        ],
        { session: dbSession },
      );
    });

    try {
      revalidateTag("products");
      revalidatePath("/admin/products");
    } catch (revalErr) {
      console.warn("Revalidation warning:", revalErr);
    }

    return NextResponse.json({
      success: true,
      message: `Product '${product.name}' restored successfully as DRAFT.`,
    });
  } catch (err) {
    console.error("Failed to restore product:", err);
    return NextResponse.json(
      { error: "Failed to restore product" },
      { status: 500 },
    );
  } finally {
    await dbSession.endSession();
  }
}
