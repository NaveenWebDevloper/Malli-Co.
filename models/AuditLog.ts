import mongoose, { Schema, Document, Model } from "mongoose";

export type AuditAction =
  | "PRODUCT_SOFT_DELETE"
  | "PRODUCT_BULK_SOFT_DELETE"
  | "PRODUCT_RESTORE"
  | "PRODUCT_BULK_RESTORE"
  | "PRODUCT_PERMANENT_DELETE"
  | "PRODUCT_BULK_PERMANENT"
  | "PRODUCT_AUTO_PURGE";

export interface ICleanedReferences {
  collectionsCount?: number;
  campaignsCount?: number;
  cartsCount?: number;
  openOrdersCount?: number;
}

export interface IAuditLog extends Document {
  action: AuditAction;
  actorId: string; // Admin Customer ObjectId string or "SYSTEM_CRON"
  actorEmail?: string;
  productId?: mongoose.Types.ObjectId;
  productName?: string;
  productSlug?: string;
  reason?: string | null;
  cleanedReferences?: ICleanedReferences;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    actorId: {
      type: String,
      required: true,
      index: true,
    },
    actorEmail: {
      type: String,
      trim: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      index: true,
    },
    productName: {
      type: String,
      trim: true,
    },
    productSlug: {
      type: String,
      trim: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },
    cleanedReferences: {
      collectionsCount: { type: Number, default: 0 },
      campaignsCount: { type: Number, default: 0 },
      cartsCount: { type: Number, default: 0 },
      openOrdersCount: { type: Number, default: 0 },
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Explicit schema indexes (Rule 4)
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ productId: 1, createdAt: -1 });

export const AuditLog: Model<IAuditLog> =
  (mongoose?.models && mongoose.models.AuditLog) ||
  mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLog;
