import mongoose from "mongoose";
import { Variant, type IVariant } from "../models/Variant.ts";
import {
  InventoryMovement,
  type InventoryMovementReason,
} from "../models/InventoryMovement.ts";

export class InsufficientStockError extends Error {
  public readonly variantId: string;
  public readonly requested: number;
  public readonly available?: number;

  constructor(
    message: string,
    variantId: string,
    requested: number,
    available?: number,
  ) {
    super(message);
    this.name = "InsufficientStockError";
    this.variantId = variantId;
    this.requested = requested;
    this.available = available;
    Object.setPrototypeOf(this, InsufficientStockError.prototype);
  }
}

export interface DeductStockParams {
  variantId: string | mongoose.Types.ObjectId;
  quantity: number;
  orderId?: string | mongoose.Types.ObjectId | null;
  reason?: InventoryMovementReason;
  note?: string;
}

export interface DeductStockResult {
  variant: IVariant;
  previousStock: number;
  newStock: number;
}

/**
 * Atomically deducts inventory stock using an atomic conditional update ($gte guard)
 * inside a Mongoose transaction (session.withTransaction), and logs the movement
 * to the `inventorymovements` collection in the exact same transaction.
 *
 * Complies with Rule 3:
 * - Never read-then-write
 * - Atomic findOneAndUpdate with $gte and $inc
 * - Transactional guarantee
 * - Mandatory audit logging
 */
export async function deductStock(
  params: DeductStockParams,
  externalSession?: mongoose.ClientSession,
): Promise<DeductStockResult> {
  const { variantId, quantity, orderId = null, reason = "SALE", note } = params;

  if (quantity <= 0) {
    throw new Error(
      `Quantity to deduct must be greater than zero. Received: ${quantity}`,
    );
  }

  const runWithSession = async (
    session: mongoose.ClientSession,
  ): Promise<DeductStockResult> => {
    // 1. Atomic conditional update with $gte stock guard (No read-then-write!)
    const updatedVariant = await Variant.findOneAndUpdate(
      {
        _id: variantId,
        stock: { $gte: quantity },
      },
      {
        $inc: { stock: -quantity },
      },
      {
        session,
        new: true,
      },
    );

    // If update returned null, the stock was insufficient to satisfy the $gte condition
    if (!updatedVariant) {
      // Check current stock solely for detailed error reporting
      const current = await Variant.findById(variantId)
        .session(session)
        .select("stock");
      throw new InsufficientStockError(
        `Insufficient stock for SKU/Variant ${variantId}. Requested: ${quantity}, Available: ${current?.stock ?? 0}`,
        variantId.toString(),
        quantity,
        current?.stock,
      );
    }

    const previousStock = updatedVariant.stock + quantity;
    const newStock = updatedVariant.stock;

    // 2. Mandatory Audit Logging in the SAME transaction
    await InventoryMovement.create(
      [
        {
          variantId: updatedVariant._id,
          productId: updatedVariant.productId,
          sku: updatedVariant.sku,
          change: -quantity,
          previousStock,
          newStock,
          reason,
          orderId: orderId
            ? new mongoose.Types.ObjectId(orderId.toString())
            : null,
          note:
            note || `Deducted ${quantity} unit(s) via ${reason.toLowerCase()}`,
        },
      ],
      { session },
    );

    return {
      variant: updatedVariant,
      previousStock,
      newStock,
    };
  };

  // If an external session was passed (e.g. from a broader checkout transaction), participate in it
  if (externalSession) {
    return runWithSession(externalSession);
  }

  // Otherwise, initiate a new dedicated Mongoose session and transaction
  const session = await mongoose.startSession();
  try {
    let result!: DeductStockResult;
    await session.withTransaction(async () => {
      result = await runWithSession(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

export interface OrderItemStockRequest {
  variantId: string | mongoose.Types.ObjectId;
  quantity: number;
}

/**
 * Atomically deducts stock for an entire array of order line items.
 * If any single variant fails the $gte check, the entire transaction is rolled back,
 * ensuring no partial deductions or phantom inventory losses occur.
 */
export async function deductOrderStock(
  params: {
    items: OrderItemStockRequest[];
    orderId: string | mongoose.Types.ObjectId;
    reason?: InventoryMovementReason;
    note?: string;
  },
  externalSession?: mongoose.ClientSession,
): Promise<DeductStockResult[]> {
  const { items, orderId, reason = "SALE", note } = params;

  if (!items || items.length === 0) {
    return [];
  }

  const runWithSession = async (session: mongoose.ClientSession) => {
    const results: DeductStockResult[] = [];
    for (const item of items) {
      const itemResult = await deductStock(
        {
          variantId: item.variantId,
          quantity: item.quantity,
          orderId,
          reason,
          note: note || `Order line item deduction (${item.variantId})`,
        },
        session,
      );
      results.push(itemResult);
    }
    return results;
  };

  if (externalSession) {
    return runWithSession(externalSession);
  }

  const session = await mongoose.startSession();
  try {
    let results!: DeductStockResult[];
    await session.withTransaction(async () => {
      results = await runWithSession(session);
    });
    return results;
  } finally {
    await session.endSession();
  }
}

/**
 * Atomically restocks inventory inside a transaction and logs the movement.
 */
export async function restockInventory(params: {
  variantId: string | mongoose.Types.ObjectId;
  quantity: number;
  orderId?: string | mongoose.Types.ObjectId | null;
  reason?: "RESTOCK" | "RETURN" | "ADJUST";
  note?: string;
}): Promise<DeductStockResult> {
  const {
    variantId,
    quantity,
    orderId = null,
    reason = "RESTOCK",
    note,
  } = params;

  if (quantity <= 0) {
    throw new Error(
      `Quantity to restock must be greater than zero. Received: ${quantity}`,
    );
  }

  const session = await mongoose.startSession();
  try {
    let result!: DeductStockResult;
    await session.withTransaction(async () => {
      const updatedVariant = await Variant.findOneAndUpdate(
        { _id: variantId },
        { $inc: { stock: quantity } },
        { session, new: true },
      );

      if (!updatedVariant) {
        throw new Error(`Variant not found for ID: ${variantId}`);
      }

      const previousStock = updatedVariant.stock - quantity;
      const newStock = updatedVariant.stock;

      await InventoryMovement.create(
        [
          {
            variantId: updatedVariant._id,
            productId: updatedVariant.productId,
            sku: updatedVariant.sku,
            change: quantity,
            previousStock,
            newStock,
            reason,
            orderId: orderId
              ? new mongoose.Types.ObjectId(orderId.toString())
              : null,
            note:
              note ||
              `Restocked ${quantity} unit(s) via ${reason.toLowerCase()}`,
          },
        ],
        { session },
      );

      result = {
        variant: updatedVariant,
        previousStock,
        newStock,
      };
    });
    return result;
  } finally {
    await session.endSession();
  }
}

export interface AdjustStockParams {
  variantId: string | mongoose.Types.ObjectId;
  change: number;
  reason: InventoryMovementReason;
  note?: string;
  orderId?: string | mongoose.Types.ObjectId | null;
}

export interface AdjustStockResult {
  variant: IVariant;
  previousStock: number;
  newStock: number;
}

/**
 * Atomically adjusts stock (increment or decrement) inside a Mongoose transaction.
 * Prevents negative stock via $gte guard on reductions and logs an InventoryMovement document.
 * Strictly adheres to Rule 3.
 */
export async function adjustStock(
  params: AdjustStockParams,
  externalSession?: mongoose.ClientSession,
): Promise<AdjustStockResult> {
  const { variantId, change, reason, note, orderId = null } = params;

  if (change === 0) {
    throw new Error("Stock change cannot be zero");
  }

  const runWithSession = async (
    session: mongoose.ClientSession,
  ): Promise<AdjustStockResult> => {
    let updatedVariant: IVariant | null = null;
    let previousStock = 0;
    let newStock = 0;

    if (change < 0) {
      const deduction = Math.abs(change);
      updatedVariant = await Variant.findOneAndUpdate(
        {
          _id: variantId,
          stock: { $gte: deduction },
        },
        {
          $inc: { stock: -deduction },
        },
        { session, new: true },
      );

      if (!updatedVariant) {
        const current = await Variant.findById(variantId)
          .session(session)
          .select("stock");
        if (!current) {
          throw new Error(`Variant not found for ID: ${variantId}`);
        }
        throw new InsufficientStockError(
          `Cannot reduce stock by ${deduction}. Current stock is ${current.stock}`,
          variantId.toString(),
          deduction,
          current.stock,
        );
      }

      previousStock = updatedVariant.stock + deduction;
      newStock = updatedVariant.stock;
    } else {
      updatedVariant = await Variant.findOneAndUpdate(
        { _id: variantId },
        { $inc: { stock: change } },
        { session, new: true },
      );

      if (!updatedVariant) {
        throw new Error(`Variant not found for ID: ${variantId}`);
      }

      previousStock = updatedVariant.stock - change;
      newStock = updatedVariant.stock;
    }

    // Log the movement in the exact same transaction (Rule 3)
    await InventoryMovement.create(
      [
        {
          variantId: updatedVariant._id,
          productId: updatedVariant.productId,
          sku: updatedVariant.sku,
          change,
          previousStock,
          newStock,
          reason,
          orderId: orderId
            ? new mongoose.Types.ObjectId(orderId.toString())
            : null,
          note:
            note ||
            `Adjusted stock by ${change > 0 ? `+${change}` : change} via ${reason}`,
        },
      ],
      { session },
    );

    return {
      variant: updatedVariant,
      previousStock,
      newStock,
    };
  };

  if (externalSession) {
    return runWithSession(externalSession);
  }

  const session = await mongoose.startSession();
  try {
    let result!: AdjustStockResult;
    await session.withTransaction(async () => {
      result = await runWithSession(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}
