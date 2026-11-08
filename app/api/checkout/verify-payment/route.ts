import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server.js";
import { z } from "zod";
import { connectDB } from "../../../../lib/db.ts";
import { confirmOrderPayment } from "../../../../lib/orders.ts";

const VerifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1, "Missing razorpay_order_id"),
  razorpay_payment_id: z.string().min(1, "Missing razorpay_payment_id"),
  razorpay_signature: z.string().min(1, "Missing razorpay_signature"),
  orderNumber: z.string().optional(),
});

export async function POST(req: NextRequest) {
  await connectDB();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = VerifyPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    orderNumber,
  } = parsed.data;

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return NextResponse.json(
      { error: "Payment gateway secret is not configured" },
      { status: 500 },
    );
  }

  // Cryptographic Signature Verification
  const textToSign = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(textToSign)
    .digest("hex");

  const isSignatureValid =
    expectedSignature.length === razorpay_signature.length &&
    crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf-8"),
      Buffer.from(razorpay_signature, "utf-8"),
    );

  if (!isSignatureValid) {
    return NextResponse.json(
      { error: "Invalid payment signature verification failed" },
      { status: 400 },
    );
  }

  // Unified transactional payment confirmation (Rule 1 & Rule 3)
  try {
    const result = await confirmOrderPayment({
      razorpayOrderId: razorpay_order_id,
      orderNumber,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      performedBy: "Razorpay Checkout Verify",
      note: `Payment verified via client checkout handler (Txn: ${razorpay_payment_id})`,
    });

    return NextResponse.json({
      success: true,
      orderNumber: result.order.orderNumber,
      orderStatus: result.order.status,
      alreadyPaid: result.alreadyPaid,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Payment confirmation error";
    console.error("Payment confirmation failed:", err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
