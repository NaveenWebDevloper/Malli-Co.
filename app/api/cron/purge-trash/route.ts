import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { Variant } from "@/models/Variant";
import { Order } from "@/models/Order";
import { Cart } from "@/models/Cart";
import { InventoryMovement } from "@/models/InventoryMovement";
import { AuditLog } from "@/models/AuditLog";
import { cleanupUnreferencedProductImages } from "@/lib/storage-cleanup";

const MAX_PURGE_PER_RUN = 25; // Process in small batches with hard maximum
const RETENTION_DAYS = 30;

export async function GET(req: NextRequest) {
  // Verify Cron Secret header
  const authHeader = req.headers.get("authorization");
  const cronSecretHeader = req.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  const isAuthorized =
    Boolean(expectedSecret) &&
    (authHeader === `Bearer ${expectedSecret}` ||
      cronSecretHeader === expectedSecret);

  // In production, reject unauthenticated cron calls
  if (process.env.NODE_ENV === "production" && !isAuthorized) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid cron secret" },
      { status: 401 },
    );
  }

  await connectDB();

  const cutoffDate = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  // Find Trash items older than 30 days
  const expiredProducts = await Product.find({
    deletedAt: { $ne: null, $lte: cutoffDate },
  })
    .limit(MAX_PURGE_PER_RUN)
    .select("_id name images")
    .lean();

  if (expiredProducts.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No expired products in Trash eligible for auto-purge.",
      purgedCount: 0,
      skippedCount: 0,
    });
  }

  const expiredIds = expiredProducts.map((p) => p._id);

  // Check historical order references
  const orders = await Order.find({
    "items.productId": { $in: expiredIds },
  }).select("items.productId");

  const productIdsWithOrders = new Set<string>();
  for (const o of orders) {
    for (const item of o.items) {
      if (item.productId) {
        productIdsWithOrders.add(item.productId.toString());
      }
    }
  }

  // Only permanently purge products that have ZERO historical orders
  const eligibleProducts = expiredProducts.filter(
    (p) => !productIdsWithOrders.has(p._id.toString()),
  );
  const skippedProducts = expiredProducts.filter((p) =>
    productIdsWithOrders.has(p._id.toString()),
  );

  let purgedCount = 0;

  if (eligibleProducts.length > 0) {
    const eligibleIds = eligibleProducts.map((p) => p._id);
    const variants = await Variant.find({ productId: { $in: eligibleIds } });
    const variantIds = variants.map((v) => v._id);

    const allImageUrls: string[] = [
      ...eligibleProducts.flatMap((p) =>
        p.images?.map((img: { url?: string } | string) =>
          typeof img === "string" ? img : img?.url || "",
        ) || [],
      ),
      ...variants.flatMap((v) =>
        v.images?.map((img: { url?: string } | string) =>
          typeof img === "string" ? img : img?.url || "",
        ) || [],
      ),
    ].filter(Boolean);

    const dbSession = await mongoose.startSession();
    try {
      await dbSession.withTransaction(async () => {
        // Clear cart holds
        if (variantIds.length > 0) {
          await Cart.updateMany(
            { "items.variantId": { $in: variantIds } },
            { $pull: { items: { variantId: { $in: variantIds } } } },
            { session: dbSession },
          );
        }

        // Delete variants
        await Variant.deleteMany(
          { productId: { $in: eligibleIds } },
          { session: dbSession },
        );

        // Delete inventory movements
        await InventoryMovement.deleteMany(
          { productId: { $in: eligibleIds } },
          { session: dbSession },
        );

        // Delete products
        await Product.deleteMany(
          { _id: { $in: eligibleIds } },
          { session: dbSession },
        );

        // Record audit log
        const auditEntries = eligibleProducts.map((p) => ({
          action: "PRODUCT_AUTO_PURGE" as const,
          actor: {
            id: new mongoose.Types.ObjectId(),
            name: "System Cron (Auto-Purge)",
            email: "cron@malliandco.com",
          },
          productId: p._id,
          productName: p.name,
          reason: `Auto-purged after exceeding ${RETENTION_DAYS} days in Trash`,
        }));
        await AuditLog.insertMany(auditEntries, { session: dbSession });
      });

      purgedCount = eligibleProducts.length;

      // Clean unreferenced storage images
      await cleanupUnreferencedProductImages(allImageUrls);
    } catch (err) {
      console.error("Auto-purge cron transaction error:", err);
      return NextResponse.json(
        { error: "Auto-purge database transaction failed" },
        { status: 500 },
      );
    } finally {
      await dbSession.endSession();
    }
  }

  return NextResponse.json({
    success: true,
    message: `Auto-purge completed: ${purgedCount} permanently deleted, ${skippedProducts.length} preserved due to historical orders.`,
    purgedCount,
    skippedCount: skippedProducts.length,
    skippedProductNames: skippedProducts.map((p) => p.name),
  });
}

