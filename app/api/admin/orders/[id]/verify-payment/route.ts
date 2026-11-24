import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { confirmOrderPayment, updateOrderStatus } from "@/lib/orders";
import { Order } from "@/models/Order";

export const dynamic = "force-dynamic";

const VerifyPaymentPayloadSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  note: z.string().trim().max(300).optional(),
});

export async function POST(
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
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  await connectDB();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = VerifyPaymentPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { action, note } = parsed.data;
  const adminName = session.user.name || session.user.email || "Admin";

  try {
    if (action === "APPROVE") {
      // 1. Unified atomic confirmation inside Mongoose transaction (Rule 3)
      const result = await confirmOrderPayment({
        orderId: id,
        paymentMethod: "MANUAL_UPI",
        performedBy: adminName,
        note: note ? `Manual UPI Approved: ${note}` : undefined,
      });

      return NextResponse.json({
        success: true,
        message: "Payment successfully approved and stock deducted.",
        order: result.order,
        alreadyPaid: result.alreadyPaid,
      });
    } else {
      // 2. Reject payment: Cancel order & release temporary stock reservation (Rule 3)
      const rejectionReason = note || "Invalid transaction reference / payment not received";
      const result = await updateOrderStatus({
        orderId: id,
        newStatus: "CANCELLED",
        note: `Manual payment rejected: ${rejectionReason}`,
        performedBy: adminName,
      });

      // Record rejection note in paymentDetails
      await Order.updateOne(
        { _id: id },
        {
          $set: {
            "paymentDetails.rejectionReason": rejectionReason,
            "paymentDetails.verifiedBy": adminName,
            "paymentDetails.verifiedAt": new Date(),
          },
        },
      );

      return NextResponse.json({
        success: true,
        message: "Order cancelled and stock reservation released.",
        order: result.order,
        restocked: result.restocked,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to process payment verification";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

