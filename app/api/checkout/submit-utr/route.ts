import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";

export const dynamic = "force-dynamic";

const SubmitUtrSchema = z.object({
  orderNumber: z.string().trim().min(3, "Order number is required"),
  utrNumber: z
    .string()
    .trim()
    .min(6, "UTR / Transaction ID must be at least 6 characters")
    .max(50, "UTR / Transaction ID is too long")
    .regex(/^[A-Za-z0-9\-_]+$/, "UTR / Transaction ID must be alphanumeric"),
  receiptImage: z.string().trim().optional(),
});

export async function POST(req: NextRequest) {
  await connectDB();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = SubmitUtrSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { orderNumber, utrNumber, receiptImage } = parsed.data;
  const cleanUtr = utrNumber.toUpperCase();

  try {
    const order = await Order.findOne({ orderNumber });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status === "CANCELLED") {
      return NextResponse.json(
        { error: "This order has already been cancelled and cannot accept payment submissions." },
        { status: 400 },
      );
    }

    if (order.paymentStatus === "PAID") {
      return NextResponse.json({
        success: true,
        alreadyPaid: true,
        message: "This order has already been verified and marked as PAID.",
        orderNumber: order.orderNumber,
      });
    }

    // Update payment details with submitted UTR
    order.paymentDetails = {
      ...order.paymentDetails,
      method: "MANUAL_UPI",
      upiTransactionId: cleanUtr,
      upiSubmittedAt: new Date(),
      ...(receiptImage ? { upiReceiptImage: receiptImage } : {}),
    };

    // Give admin 48 hours to verify the submitted UTR before any hold expiry
    order.expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // Record timeline entry
    order.timeline.push({
      status: "PENDING",
      note: `Customer submitted UPI payment reference / UTR: ${cleanUtr}`,
      performedBy: "Customer",
      timestamp: new Date(),
    });

    await order.save();

    return NextResponse.json({
      success: true,
      message: "Payment reference submitted successfully. Our concierge will verify your payment shortly.",
      orderNumber: order.orderNumber,
      utrNumber: cleanUtr,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to record payment reference";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

