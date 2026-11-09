import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { revalidateTag, revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { Variant } from "@/models/Variant";
import { Order } from "@/models/Order";
import { Collection } from "@/models/Collection";
import { Campaign } from "@/models/Campaign";
import { AuditLog } from "@/models/AuditLog";

const BulkDeleteSchema = z.object({
  ids: z
    .array(z.string().refine((id) => mongoose.Types.ObjectId.isValid(id), "Invalid ObjectId"))
    .min(1, "At least one product ID is required")
    .max(100, "Cannot process more than 100 products per bulk operation"),
  reason: z.string().max(200).optional(),
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

  const parseResult = BulkDeleteSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const { ids, reason } = parseResult.data;
  const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));

  await connectDB();

  // Find products that are not yet in trash
  const productsToSoftDelete = await Product.find({
    _id: { $in: objectIds },
    deletedAt: null,
  }).select("_id name slug");

  if (productsToSoftDelete.length === 0) {
    return NextResponse.json(
      { error: "No active products found matching the provided IDs to delete" },
      { status: 400 },
    );
  }

  const validTargetIds = productsToSoftDelete.map((p) => p._id);
  const now = new Date();
  const adminId = session.user.id && mongoose.Types.ObjectId.isValid(session.user.id)
    ? new mongoose.Types.ObjectId(session.user.id)
    : undefined;

  let cleanedCollections = 0;
  let cleanedCampaigns = 0;

  const dbSession = await mongoose.startSession();
  try {
    await dbSession.withTransaction(async () => {
      // 1. Mark products as soft-deleted
      await Product.updateMany(
        { _id: { $in: validTargetIds } },
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

      // 2. Archive variants
      await Variant.updateMany(
        { productId: { $in: validTargetIds } },
        {
          $set: {
            deletedAt: now,
            status: "ARCHIVED",
          },
        },
        { session: dbSession },
      );

      // 3. Remove from collections
      const colRes = await Collection.updateMany(
        { productIds: { $in: validTargetIds } },
        { $pull: { productIds: { $in: validTargetIds } } },
        { session: dbSession },
      );
      cleanedCollections = colRes.modifiedCount || 0;

      // 4. Remove from campaigns
      const campRes = await Campaign.updateMany(
        {
          $or: [
            { "scope.ids": { $in: validTargetIds } },
            { "scope.excludeProductIds": { $in: validTargetIds } },
          ],
        },
        {
          $pull: {
            "scope.ids": { $in: validTargetIds },
            "scope.excludeProductIds": { $in: validTargetIds },
          },
        },
        { session: dbSession },
      );
      cleanedCampaigns = campRes.modifiedCount || 0;

      // 5. Create audit logs
      const auditEntries = productsToSoftDelete.map((p) => ({
        action: "PRODUCT_BULK_DELETE" as const,
        actor: {
          id: adminId || new mongoose.Types.ObjectId(),
          name: session.user.name || "Admin",
          email: session.user.email || "admin@malliandco.com",
        },
        productId: p._id,
        productName: p.name,
        reason: reason || undefined,
        cleanedReferences: {
          collections: cleanedCollections,
          campaigns: cleanedCampaigns,
        },
      }));
      await AuditLog.insertMany(auditEntries, { session: dbSession });
    });

    // Check open orders for any of these products
    const openOrdersCount = await Order.countDocuments({
      "items.productId": { $in: validTargetIds },
      status: { $in: ["PENDING", "PROCESSING", "CONFIRMED", "SHIPPED"] },
    });

    try {
      revalidateTag("products");
      revalidateTag("collections");
      revalidatePath("/admin/products");
    } catch (revalErr) {
      console.warn("Revalidation warning:", revalErr);
    }

    return NextResponse.json({
      success: true,
      message: `Moved ${validTargetIds.length} product(s) to Trash.`,
      deletedCount: validTargetIds.length,
      openOrdersWarning:
        openOrdersCount > 0
          ? `Warning: ${openOrdersCount} open order(s) contain items from the deleted products.`
          : null,
      openOrdersCount,
      cleanedReferences: {
        collections: cleanedCollections,
        campaigns: cleanedCampaigns,
      },
    });
  } catch (err) {
    console.error("Bulk delete failed:", err);
    return NextResponse.json(
      { error: "Failed to perform bulk delete" },
      { status: 500 },
    );
  } finally {
    await dbSession.endSession();
  }
}
