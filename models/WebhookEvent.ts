import mongoose, { Schema, Document, Model } from "mongoose";

export type WebhookStatus = "PENDING" | "PROCESSED" | "FAILED";

export interface IWebhookEvent extends Document {
  eventId: string; // Unique external event ID from payment provider (e.g. Razorpay event ID)
  provider: "RAZORPAY";
  eventType: string; // e.g. "payment.captured", "order.paid"
  status: WebhookStatus;
  payload: Record<string, unknown>;
  errorMessage?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ["RAZORPAY"],
      default: "RAZORPAY",
      required: true,
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSED", "FAILED"],
      default: "PENDING",
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    errorMessage: { type: String, trim: true },
    processedAt: { type: Date },
  },
  { timestamps: true },
);

// Explicit schema indexes (Rule 4)
WebhookEventSchema.index({ status: 1, createdAt: -1 });
WebhookEventSchema.index({ createdAt: -1 });

export const WebhookEvent: Model<IWebhookEvent> =
  (mongoose?.models && mongoose.models.WebhookEvent) ||
  mongoose.model<IWebhookEvent>(
    "WebhookEvent",
    WebhookEventSchema,
    "webhookevents", // Explicit collection name
  );

export default WebhookEvent;
