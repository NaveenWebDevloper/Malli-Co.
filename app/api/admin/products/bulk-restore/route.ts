import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { revalidateTag, revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { Variant } from "@/models/Variant";
import { AuditLog } from "@/models/AuditLog";

const BulkRestoreSchema = z.object({
  ids: z
    .array(z.string().refine((id) => mongoose.Types.ObjectId.isValid(id), "Invalid ObjectId"))
    .min(1, "At least one product ID is required")
    .max(100, "Cannot process more than 100 products per bulk operation"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Admin role required" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed JSON payload" }, { status: 400 });
  }

  const parseResult = BulkRestoreSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const { ids } = parseResult.data;
  const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));

  await connectDB();

  // Find products currently in trash
  const productsToRestore = await Product.find({
    _id: { $in: objectIds },
    deletedAt: { $ne: null },
  }).select("_id name slug");

  if (productsToRestore.length === 0) {
    return NextResponse.json(
      { error: "No products in Trash match the provided IDs" },
      { status: 400 },
    );
  }

  const targetIds = productsToRestore.map((p) => p._id);
  const targetSlugs = productsToRestore.map((p) => p.slug);

  // 1. Pre-flight Slug Collision Check: check if any target slug is already used by an active/draft non-deleted product
  const conflictingSlug = await Product.findOne({
    slug: { $in: targetSlugs },
    _id: { $nin: targetIds },
    deletedAt: null,
  }).select("slug name");

  if (conflictingSlug) {
    return NextResponse.json(
      {
        error: `Cannot restore. Slug '${conflictingSlug.slug}' is currently occupied by active product '${conflictingSlug.name}'.`,
      },
      { status: 409 },
    );
  }

  // 2. Pre-flight SKU Collision Check
  const variants = await Variant.find({ productId: { $in: targetIds } });
  const variantSkus = variants.map((v) => v.sku).filter(Boolean);

  if (variantSkus.length > 0) {
    const conflictingSku = await Variant.findOne({
      sku: { $in: variantSkus },
      productId: { $nin: targetIds },
      deletedAt: null,
    }).select("sku");

    if (conflictingSku) {
      return NextResponse.json(
        {
          error: `Cannot restore. SKU '${conflictingSku.sku}' is currently occupied by another active product variant.`,
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
      // 1. Restore products as DRAFT
      await Product.updateMany(
        { _id: { $in: targetIds } },
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

      // 2. Restore variants as ACTIVE
      await Variant.updateMany(
        { productId: { $in: targetIds } },
        {
          $set: {
            deletedAt: null,
            status: "ACTIVE",
          },
        },
        { session: dbSession },
      );

      // 3. Create Audit Logs
      const auditEntries = productsToRestore.map((p) => ({
        action: "PRODUCT_BULK_RESTORE" as const,
        actor: {
          id: adminId || new mongoose.Types.ObjectId(),
          name: session.user.name || "Admin",
          email: session.user.email || "admin@malliandco.com",
        },
        productId: p._id,
        productName: p.name,
      }));
      await AuditLog.insertMany(auditEntries, { session: dbSession });
    });

    try {
      revalidateTag("products");
      revalidatePath("/admin/products");
    } catch (revalErr) {
      console.warn("Revalidation warning:", revalErr);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully restored ${targetIds.length} product(s) as DRAFT.`,
      restoredCount: targetIds.length,
    });
  } catch (err) {
    console.error("Bulk restore failed:", err);
    return NextResponse.json(
      { error: "Failed to perform bulk restore" },
      { status: 500 },
    );
  } finally {
    await dbSession.endSession();
  }
}
