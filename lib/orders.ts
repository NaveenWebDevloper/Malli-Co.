import mongoose from "mongoose";
import { Order, type IOrder } from "../models/Order.ts";
import { Variant } from "../models/Variant.ts";
import { InventoryMovement } from "../models/InventoryMovement.ts";
import { sendOrderConfirmationEmail } from "./email.ts";
import {
  type OrderStatus,
  isValidStatusTransition,
  getAllowedNextStatuses,
  calculateItemRefundPaise,
} from "./order-transitions.ts";

export * from "./order-transitions.ts";
export { COMPANY_GST_INFO } from "./constants.ts";

export interface UpdateOrderStatusParams {
  orderId: string | mongoose.Types.ObjectId;
  newStatus: OrderStatus;
  note?: string;
  performedBy?: string;
}

export interface UpdateOrderStatusResult {
  order: IOrder;
  restocked: boolean;
  restockedCount: number;
}

/**
 * Updates an order status inside a Mongoose transaction.
 * Validates state transitions.
 * When status is CANCELLED or RETURNED:
 * - If order was PAID: Automatically restocks all line items atomically and writes to `inventorymovements` (Rule 3).
 * - If order was PENDING: Releases the temporary reservation hold on `reservedStock`.
 */
export async function updateOrderStatus(
  params: UpdateOrderStatusParams,
): Promise<UpdateOrderStatusResult> {
  const { orderId, newStatus, note, performedBy = "Admin" } = params;

  const session = await mongoose.startSession();
  try {
    let result!: UpdateOrderStatusResult;

    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);
      if (!order) {
        throw new Error(`Order not found for ID: ${orderId}`);
      }

      if (!isValidStatusTransition(order.status, newStatus)) {
        throw new Error(
          `Invalid status transition from '${order.status}' to '${newStatus}'. Allowed: [${getAllowedNextStatuses(
            order.status,
          ).join(", ")}]`,
        );
      }

      const shouldRestockPhysical =
        (newStatus === "CANCELLED" || newStatus === "RETURNED") &&
        order.paymentStatus === "PAID" &&
        order.status !== "CANCELLED" &&
        order.status !== "RETURNED";

      const shouldReleaseHold =
        (newStatus === "CANCELLED" || newStatus === "RETURNED") &&
        order.paymentStatus === "PENDING" &&
        order.status !== "CANCELLED";

      let restockedCount = 0;

      // 1. Physical restock for previously paid orders
      if (shouldRestockPhysical) {
        const movementReason = newStatus === "RETURNED" ? "RETURN" : "RESTOCK";

        for (const item of order.items) {
          const updatedVariant = await Variant.findOneAndUpdate(
            { _id: item.variantId },
            { $inc: { stock: item.qty } },
            { session, new: true },
          );

          if (updatedVariant) {
            const previousStock = updatedVariant.stock - item.qty;
            const newStock = updatedVariant.stock;

            await InventoryMovement.create(
              [
                {
                  variantId: updatedVariant._id,
                  productId: item.productId,
                  sku: item.skuSnapshot,
                  change: item.qty,
                  previousStock,
                  newStock,
                  reason: movementReason,
                  orderId: order._id,
                  note: `Order #${order.orderNumber} ${newStatus.toLowerCase()} auto-restock: +${item.qty} units`,
                },
              ],
              { session },
            );

            restockedCount += item.qty;
          }
        }
      }

      // 2. Release temporary reservation holds for cancelled unpaid orders
      if (shouldReleaseHold) {
        for (const item of order.items) {
          await Variant.updateOne(
            { _id: item.variantId },
            { $inc: { reservedStock: -item.qty } },
            { session },
          );
        }
      }

      let transitionNote = note;

      // Update payment status appropriately
      if (newStatus === "PAID" && order.paymentStatus !== "PAID") {
        order.paymentStatus = "PAID";
      } else if (
        (newStatus === "CANCELLED" && order.paymentStatus === "PAID") ||
        (newStatus === "RETURNED" && order.paymentStatus === "PAID")
      ) {
        order.paymentStatus = "REFUNDED";
        const refundTotalPaise = order.items.reduce(
          (acc, item) => acc + calculateItemRefundPaise(item, item.qty),
          0,
        );
        if (!transitionNote) {
          transitionNote = `Order ${newStatus.toLowerCase()} processed. Refund computed at paid price: ₹${(refundTotalPaise / 100).toFixed(2)}`;
        }
      } else if (newStatus === "CANCELLED" && order.paymentStatus === "PENDING") {
        order.paymentStatus = "FAILED";
      }

      // Append to timeline
      order.timeline.push({
        status: newStatus,
        note: transitionNote || `Status transitioned from ${order.status} to ${newStatus}`,
        performedBy,
        timestamp: new Date(),
      });

      // Update order status and clear expiration
      order.status = newStatus;
      order.expiresAt = undefined;
      await order.save({ session });

      result = {
        order,
        restocked: shouldRestockPhysical,
        restockedCount,
      };
    });

    return result;
  } finally {
    await session.endSession();
  }
}

export interface ConfirmOrderPaymentParams {
  orderId?: string | mongoose.Types.ObjectId;
  orderNumber?: string;
  razorpayOrderId?: string;
  razorpayPaymentId: string;
  razorpaySignature?: string;
  performedBy?: string;
  note?: string;
}

export interface ConfirmOrderPaymentResult {
  order: IOrder;
  alreadyPaid: boolean;
}

/**
 * Unified, idempotent payment confirmation executed inside a single Mongoose transaction.
 * Strictly used by BOTH the verify-payment route and the Razorpay webhook.
 * - Atomically deducts stock with $gte conditional update
 * - Decrements reservedStock from the temporary hold
 * - Writes InventoryMovement audit row (reason: SALE)
 * - Sets order.status = "PAID", paymentStatus = "PAID"
 * - Dispatches customer confirmation email after transaction commit
 */
export async function confirmOrderPayment(
  params: ConfirmOrderPaymentParams,
): Promise<ConfirmOrderPaymentResult> {
  const {
    orderId,
    orderNumber,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    performedBy = "Payment Gateway",
    note,
  } = params;

  const session = await mongoose.startSession();
  try {
    let resultOrder!: IOrder;
    let isAlreadyPaid = false;

    await session.withTransaction(async () => {
      // Find order by orderId, orderNumber, or razorpayOrderId
      const query: mongoose.FilterQuery<IOrder> = {};
      if (orderId && mongoose.Types.ObjectId.isValid(orderId.toString())) {
        query._id = new mongoose.Types.ObjectId(orderId.toString());
      } else if (orderNumber) {
        query.orderNumber = orderNumber;
      } else if (razorpayOrderId) {
        query["paymentDetails.razorpayOrderId"] = razorpayOrderId;
      } else {
        throw new Error("Must provide orderId, orderNumber, or razorpayOrderId");
      }

      const order = await Order.findOne(query).session(session);
      if (!order) {
        throw new Error(`Order not found for payment confirmation`);
      }

      // Idempotency check: if already PAID, return without double-decrementing stock
      if (order.paymentStatus === "PAID") {
        isAlreadyPaid = true;
        resultOrder = order;
        return;
      }

      // Atomically decrement variant stock with $gte guard (Rule 3)
      for (const item of order.items) {
        // Find variant and atomically decrement stock and reservedStock
        const updatedVariant = await Variant.findOneAndUpdate(
          {
            _id: item.variantId,
            stock: { $gte: item.qty },
          },
          {
            $inc: {
              stock: -item.qty,
              reservedStock: -item.qty,
            },
          },
          { session, new: true },
        );

        if (!updatedVariant) {
          throw new Error(
            `Insufficient physical stock to satisfy payment confirmation for SKU ${item.skuSnapshot}`,
          );
        }

        const previousStock = updatedVariant.stock + item.qty;
        const newStock = updatedVariant.stock;

        // Mandatory Audit Logging in the same transaction (Rule 3)
        await InventoryMovement.create(
          [
            {
              variantId: updatedVariant._id,
              productId: item.productId,
              sku: item.skuSnapshot,
              change: -item.qty,
              previousStock,
              newStock,
              reason: "SALE",
              orderId: order._id,
              note: `Payment captured: ${razorpayPaymentId} (order ${order.orderNumber})`,
            },
          ],
          { session },
        );
      }

      // Update Order Status to PAID
      order.status = "PAID";
      order.paymentStatus = "PAID";
      order.expiresAt = undefined; // Clear 15-minute hold timer
      order.paymentDetails = {
        ...order.paymentDetails,
        razorpayPaymentId,
        ...(razorpayOrderId ? { razorpayOrderId } : {}),
        ...(razorpaySignature ? { razorpaySignature } : {}),
      };

      order.timeline.push({
        status: "PAID",
        note: note || `Payment verified successfully (Txn: ${razorpayPaymentId})`,
        performedBy,
        timestamp: new Date(),
      });

      await order.save({ session });
      resultOrder = order;
    });

    // Send confirmation email after transaction successfully commits
    if (!isAlreadyPaid && resultOrder) {
      try {
        await sendOrderConfirmationEmail(resultOrder);
      } catch (emailErr) {
        console.warn("Failed to dispatch confirmation email:", emailErr);
      }
    }

    return {
      order: resultOrder,
      alreadyPaid: isAlreadyPaid,
    };
  } finally {
    await session.endSession();
  }
}

/**
 * Auto-cancels unpaid orders past their 15-minute expiration hold
 * and releases their held `reservedStock` back to the available pool.
 */
export async function releaseExpiredOrders(): Promise<{
  cancelledCount: number;
  orderNumbers: string[];
}> {
  const expiredOrders = await Order.find({
    status: "PENDING",
    paymentStatus: "PENDING",
    expiresAt: { $lt: new Date() },
  }).select("_id orderNumber");

  const orderNumbers: string[] = [];

  for (const exp of expiredOrders) {
    try {
      await updateOrderStatus({
        orderId: exp._id,
        newStatus: "CANCELLED",
        note: "Auto-cancelled: 15-minute checkout hold expired without payment confirmation",
        performedBy: "Auto-Release Cron",
      });
      orderNumbers.push(exp.orderNumber);
    } catch (err) {
      console.warn(`Failed to release expired order ${exp.orderNumber}:`, err);
    }
  }

  return {
    cancelledCount: orderNumbers.length,
    orderNumbers,
  };
}
