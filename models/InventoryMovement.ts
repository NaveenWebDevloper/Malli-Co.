import mongoose, { Schema, Document, Model } from "mongoose";

export type InventoryMovementReason = "SALE" | "RESTOCK" | "RETURN" | "ADJUST";

export interface IInventoryMovement extends Document {
  variantId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  sku: string;
  change: number; // Negative for reduction, positive for restock/return
  previousStock: number;
  newStock: number;
  reason: InventoryMovementReason;
  orderId?: mongoose.Types.ObjectId | null;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryMovementSchema = new Schema<IInventoryMovement>(
  {
    variantId: {
      type: Schema.Types.ObjectId,
      ref: "Variant",
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    change: {
      type: Number,
      required: true,
    },
    previousStock: {
      type: Number,
      required: true,
      min: 0,
    },
    newStock: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      enum: ["SALE", "RESTOCK", "RETURN", "ADJUST"],
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },
    note: { type: String, trim: true },
  },
  { timestamps: true },
);

// Explicit schema indexes (Rule 4)
InventoryMovementSchema.index({ variantId: 1, createdAt: -1 });
InventoryMovementSchema.index({ productId: 1, createdAt: -1 });
InventoryMovementSchema.index({ sku: 1, createdAt: -1 });
InventoryMovementSchema.index({ reason: 1, createdAt: -1 });
InventoryMovementSchema.index({ createdAt: -1 });

export const InventoryMovement: Model<IInventoryMovement> =
  (mongoose?.models && mongoose.models.InventoryMovement) ||
  mongoose.model<IInventoryMovement>(
    "InventoryMovement",
    InventoryMovementSchema,
    "inventorymovements", // Explicit collection name per Rule 3
  );

export default InventoryMovement;
