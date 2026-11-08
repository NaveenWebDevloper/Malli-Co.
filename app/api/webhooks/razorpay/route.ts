import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server.js";
import { z } from "zod";
import { connectDB } from "../../../../lib/db.ts";
import { Order } from "../../../../models/Order.ts";
import { WebhookEvent } from "../../../../models/WebhookEvent.ts";
import { confirmOrderPayment, updateOrderStatus } from "../../../../lib/orders.ts";

// Rule 6: Server-side validation of webhook payload with Zod
const RazorpayWebhookSchema = z.object({
  entity: z.string().optional(),
  account_id: z.string().optional(),
  event: z.string(),
  contains: z.array(z.string()).optional(),
  payload: z
    .object({
      payment: z
        .object({
          entity: z
            .object({
              id: z.string().optional(),
              order_id: z.string().optional().nullable(),
              amount: z.number().optional(),
              currency: z.string().optional(),
              status: z.string().optional(),
              error_description: z.string().optional().nullable(),
              notes: z.record(z.string(), z.unknown()).optional(),
            })
            .passthrough(),
        })
        .optional(),
      order: z
        .object({
          entity: z
            .object({
              id: z.string().optional(),
              amount: z.number().optional(),
              amount_paid: z.number().optional(),
              receipt: z.string().optional().nullable(),
              status: z.string().optional(),
              notes: z.record(z.string(), z.unknown()).optional(),
            })
            .passthrough(),
        })
        .optional(),
    })
    .passthrough(),
  created_at: z.number().optional(),
});

function extractEventId(
  req: NextRequest,
  body: Record<string, unknown>,
  eventType: string,
): string {
  const headerEventId = req.headers.get("x-razorpay-event-id");
  if (headerEventId) return headerEventId.trim();

  if (typeof body.event_id === "string" && body.event_id.trim()) {
    return body.event_id.trim();
  }
  if (typeof body.id === "string" && body.id.trim()) {
    return body.id.trim();
  }

  const payloadRecord = body.payload as Record<string, unknown> | undefined;
  const paymentObj = payloadRecord?.payment as Record<string, unknown> | undefined;
  const paymentEntity = paymentObj?.entity as Record<string, unknown> | undefined;
  const paymentId = typeof paymentEntity?.id === "string" ? paymentEntity.id : "";

  const orderObj = payloadRecord?.order as Record<string, unknown> | undefined;
  const orderEntity = orderObj?.entity as Record<string, unknown> | undefined;
  const orderId = typeof orderEntity?.id === "string" ? orderEntity.id : "";
  const timestamp = body.created_at || Date.now();

  return `${eventType}_${paymentId || orderId || "evt"}_${timestamp}`;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Signature Verification (Rule 1)
    const signature = req.headers.get("x-razorpay-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Missing x-razorpay-signature header" },
        { status: 400 },
      );
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("RAZORPAY_WEBHOOK_SECRET is not set in environment.");
      return NextResponse.json(
        { error: "Webhook configuration error" },
        { status: 500 },
      );
    }

    const rawBody = await req.text();
    if (!rawBody) {
      return NextResponse.json({ error: "Empty request body" }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const isSignatureValid =
      expectedSignature.length === signature.length &&
      crypto.timingSafeEqual(
        Buffer.from(expectedSignature, "utf-8"),
        Buffer.from(signature, "utf-8"),
      );

    if (!isSignatureValid) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 },
      );
    }

    // 2. Validate payload with Zod (Rule 6)
    let parsedJson: Record<string, unknown>;
    try {
      parsedJson = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Malformed JSON payload" }, { status: 400 });
    }

    const parseResult = RazorpayWebhookSchema.safeParse(parsedJson);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid webhook payload schema", issues: parseResult.error.format() },
        { status: 400 },
      );
    }

    const webhookData = parseResult.data;
    const eventType = webhookData.event;
    const eventId = extractEventId(req, parsedJson, eventType);

    await connectDB();

    // 3. Pre-check: Idempotent short-circuit
    const existingEvent = await WebhookEvent.findOne({ eventId });
    if (existingEvent) {
      return NextResponse.json(
        { status: "already_processed", eventId },
        { status: 200 },
      );
    }

    // Record WebhookEvent to ensure single processing
    try {
      await WebhookEvent.create({
        eventId,
        provider: "RAZORPAY",
        eventType,
        status: "PROCESSED",
        payload: parsedJson,
        processedAt: new Date(),
      });
    } catch (err: unknown) {
      const isDup =
        (typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err as { code: number }).code === 11000) ||
        (err instanceof Error && err.message.includes("E11000"));
      if (isDup) {
        return NextResponse.json(
          { status: "already_processed", eventId },
          { status: 200 },
        );
      }
      throw err;
    }

    // 4. Locate target Order identifiers
    const razorpayOrderId =
      webhookData.payload.order?.entity?.id ||
      webhookData.payload.payment?.entity?.order_id;
    const receipt = webhookData.payload.order?.entity?.receipt;
    const paymentId = webhookData.payload.payment?.entity?.id;
    const notesOrderId = (webhookData.payload.order?.entity?.notes?.orderId ||
      webhookData.payload.payment?.entity?.notes?.orderId) as string | undefined;

    // Handle Successful Payment
    if (eventType === "order.paid" || eventType === "payment.captured") {
      if (!paymentId) {
        return NextResponse.json(
          { error: "Missing paymentId in webhook payload" },
          { status: 400 },
        );
      }

      const result = await confirmOrderPayment({
        orderId: notesOrderId,
        orderNumber: receipt || undefined,
        razorpayOrderId: razorpayOrderId || undefined,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
        performedBy: "Razorpay Webhook",
        note: `Payment captured via webhook (${eventType}, txn: ${paymentId})`,
      });

      return NextResponse.json(
        {
          received: true,
          eventId,
          event: eventType,
          orderNumber: result.order.orderNumber,
          alreadyPaid: result.alreadyPaid,
        },
        { status: 200 },
      );
    }

    // Handle Failed Payment
    if (eventType === "payment.failed" || eventType === "order.failed") {
      const targetOrder = await Order.findOne({
        $or: [
          ...(razorpayOrderId ? [{ "paymentDetails.razorpayOrderId": razorpayOrderId }] : []),
          ...(receipt ? [{ orderNumber: receipt }] : []),
          ...(notesOrderId ? [{ _id: notesOrderId }] : []),
        ],
      });

      if (targetOrder && targetOrder.paymentStatus !== "PAID") {
        await updateOrderStatus({
          orderId: targetOrder._id,
          newStatus: "CANCELLED",
          note: `Payment failed via Razorpay webhook (${eventType})`,
          performedBy: "Razorpay Webhook",
        });
      }

      return NextResponse.json(
        { received: true, eventId, event: eventType },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { received: true, eventId, event: eventType },
      { status: 200 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Razorpay webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed", message },
      { status: 500 },
    );
  }
}
