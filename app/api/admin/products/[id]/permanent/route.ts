import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
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

  // 1. Guard: Product MUST be in Trash before it can be permanently deleted
  if (!product.deletedAt) {
    return NextResponse.json(
      { error: "Product must be moved to Trash before it can be permanently deleted" },
      { status: 400 },
    );
  }

  // 2. Guard: Must have ZERO historical order items referencing this product
  const associatedOrdersCount = await Order.countDocuments({
    "items.productId": productId,
  });

  if (associatedOrdersCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot permanently delete '${product.name}'. It is referenced by ${associatedOrdersCount} historical order(s). Customer invoices and order tracking require preserved snapshots. This product must remain in Trash.`,
        orderCount: associatedOrdersCount,
      },
      { status: 409 },
    );
  }

  // 3. Find all variants for this product
  const variants = await Variant.find({ productId });
  const variantIds = variants.map((v) => v._id);

  // Check active cart holds
  const activeCartCount = await Cart.countDocuments({
    "items.variantId": { $in: variantIds },
  });

  // Collect all images from product and variants
  const allImageUrls: string[] = [
    ...(product.images?.map((img: { url?: string } | string) =>
      typeof img === "string" ? img : img?.url || ""
    ) || []),
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
      // 4. Remove variant references from carts
      if (variantIds.length > 0) {
        await Cart.updateMany(
          { "items.variantId": { $in: variantIds } },
          { $pull: { items: { variantId: { $in: variantIds } } } },
          { session: dbSession },
        );
      }

      // 5. Delete variants
      await Variant.deleteMany({ productId }, { session: dbSession });

      // 6. Delete inventory movements
      await InventoryMovement.deleteMany({ productId }, { session: dbSession });

      // 7. Delete the product itself
      await Product.deleteOne({ _id: productId }, { session: dbSession });

      // 8. Create Audit Log
      await AuditLog.create(
        [
          {
            action: "PRODUCT_PERMANENT_DELETE",
            actor: {
              id: adminId || new mongoose.Types.ObjectId(),
              name: session.user.name || "Admin",
              email: session.user.email || "admin@malliandco.com",
            },
            productId,
            productName: product.name,
            reason: "Permanent deletion from Trash",
          },
        ],
        { session: dbSession },
      );
    });

    // 9. Storage Cleanup: delete images that are not referenced by ANY existing order snapshot
    const storageCleanup = await cleanupUnreferencedProductImages(allImageUrls);

    try {
      revalidateTag("products");
      revalidatePath("/admin/products");
    } catch (revalErr) {
      console.warn("Revalidation warning:", revalErr);
    }

    return NextResponse.json({
      success: true,
      message: `Product '${product.name}' was permanently deleted.`,
      storageCleanup,
      activeCartCleanedCount: activeCartCount,
    });
  } catch (err) {
    console.error("Failed to permanently delete product:", err);
    return NextResponse.json(
      { error: "Failed to permanently delete product" },
      { status: 500 },
    );
  } finally {
    await dbSession.endSession();
  }
}
