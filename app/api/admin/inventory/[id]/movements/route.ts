import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "../../../../../../lib/db.ts";
import { InventoryMovement } from "../../../../../../models/InventoryMovement.ts";
import { Variant } from "../../../../../../models/Variant.ts";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Admin role required" },
      { status: 403 },
    );
  }

  const { id } = await context.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid variant ID" }, { status: 400 });
  }

  await connectDB();

  const variant = await Variant.findById(id).select("sku productId").lean();
  if (!variant) {
    return NextResponse.json({ error: "Variant not found" }, { status: 404 });
  }

  const movements = await InventoryMovement.find({
    variantId: new mongoose.Types.ObjectId(id),
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate("orderId", "orderNumber status paymentStatus")
    .lean();

  return NextResponse.json({
    variant: {
      _id: variant._id.toString(),
      sku: variant.sku,
    },
    movements: movements.map((m) => ({
      _id: m._id.toString(),
      sku: m.sku,
      change: m.change,
      previousStock: m.previousStock,
      newStock: m.newStock,
      reason: m.reason,
      note: m.note,
      order: m.orderId,
      createdAt: m.createdAt,
    })),
  });
}

