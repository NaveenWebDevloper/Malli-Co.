import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { revalidateTag, revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { Variant } from "@/models/Variant";
import { Order } from "@/models/Order";
import { Cart } from "@/models/Cart";
import { InventoryMovement } from "@/models/InventoryMovement";
import { AuditLog } from "@/models/AuditLog";
import { cleanupUnreferencedProductImages } from "@/lib/storage-cleanup";

const BulkPermanentSchema = z.object({
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

  const parseResult = BulkPermanentSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const { ids } = parseResult.data;
  const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));

  await connectDB();

  // Find products that are currently in trash
  const productsInTrash = await Product.find({
    _id: { $in: objectIds },
    deletedAt: { $ne: null },
  }).select("_id name images");

  if (productsInTrash.length === 0) {
    return NextResponse.json(
      { error: "No products in Trash match the provided IDs" },
      { status: 400 },
    );
  }

  const trashIds = productsInTrash.map((p) => p._id);

  // Check which products have associated historical orders
  const orders = await Order.find({
    "items.productId": { $in: trashIds },
  }).select("items.productId");

  const productIdsWithOrders = new Set<string>();
  for (const o of orders) {
    for (const item of o.items) {
      if (item.productId) {
        productIdsWithOrders.add(item.productId.toString());
      }
    }
  }

  // Partition eligible vs ineligible products
  const eligibleProducts = productsInTrash.filter(
    (p) => !productIdsWithOrders.has(p._id.toString())
  );
  const skippedProducts = productsInTrash.filter((p) =>
    productIdsWithOrders.has(p._id.toString())
  );

  if (eligibleProducts.length === 0) {
    return NextResponse.json(
      {
        error: "All selected products have historical order records and cannot be permanently deleted. They must remain preserved in Trash.",
        deletedCount: 0,
        skippedCount: skippedProducts.length,
        skippedNames: skippedProducts.map((p) => p.name),
      },
      { status: 409 },
    );
  }

  const eligibleIds = eligibleProducts.map((p) => p._id);

  // Gather variant IDs and images for eligible products
  const variants = await Variant.find({ productId: { $in: eligibleIds } });
  const variantIds = variants.map((v) => v._id);

  const allImageUrls: string[] = [
    ...eligibleProducts.flatMap((p) =>
      p.images?.map((img: { url?: string } | string) =>
        typeof img === "string" ? img : img?.url || ""
      ) || []
    ),
    ...variants.flatMap((v) =>
      v.images?.map((img: { url?: string } | string) =>
        typeof img === "string" ? img : img?.url || ""
      ) || []
    ),
  ].filter(Boolean);

  const adminId = session.user.id && mongoose.Types.ObjectId.isValid(session.user.id)
    ? new mongoose.Types.ObjectId(session.user.id)
    : undefined;

  const dbSession = await mongoose.startSession();
  try {
    await dbSession.withTransaction(async () => {
      // 1. Remove from carts
      if (variantIds.length > 0) {
        await Cart.updateMany(
          { "items.variantId": { $in: variantIds } },
          { $pull: { items: { variantId: { $in: variantIds } } } },
          { session: dbSession },
        );
      }

      // 2. Delete variants
      await Variant.deleteMany(
        { productId: { $in: eligibleIds } },
        { session: dbSession },
      );

      // 3. Delete inventory movements
      await InventoryMovement.deleteMany(
        { productId: { $in: eligibleIds } },
        { session: dbSession },
      );

      // 4. Delete products
      await Product.deleteMany(
        { _id: { $in: eligibleIds } },
        { session: dbSession },
      );

      // 5. Create audit logs
      const auditEntries = eligibleProducts.map((p) => ({
        action: "PRODUCT_BULK_PERMANENT" as const,
        actor: {
          id: adminId || new mongoose.Types.ObjectId(),
          name: session.user.name || "Admin",
          email: session.user.email || "admin@malliandco.com",
        },
        productId: p._id,
        productName: p.name,
        reason: "Permanent bulk deletion from Trash",
      }));
      await AuditLog.insertMany(auditEntries, { session: dbSession });
    });

    // 6. Asynchronous unreferenced storage cleanup (order snapshots preserved)
    const storageCleanup = await cleanupUnreferencedProductImages(allImageUrls);

    try {
      revalidateTag("products");
      revalidatePath("/admin/products");
    } catch (revalErr) {
      console.warn("Revalidation warning:", revalErr);
    }

    return NextResponse.json({
      success: true,
      message: `Permanently deleted ${eligibleProducts.length} product(s). ${skippedProducts.length} skipped due to historical orders.`,
      deletedCount: eligibleProducts.length,
      skippedCount: skippedProducts.length,
      skippedNames: skippedProducts.map((p) => p.name),
      storageCleanup,
    });
  } catch (err) {
    console.error("Bulk permanent delete failed:", err);
    return NextResponse.json(
      { error: "Failed to perform bulk permanent deletion" },
      { status: 500 },
    );
  } finally {
    await dbSession.endSession();
  }
}

