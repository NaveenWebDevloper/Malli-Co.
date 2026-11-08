import mongoose, { Schema, Document, Model } from "mongoose";
import { AddressSchema, type IAddress } from "./Customer.ts";

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "CONFIRMED"
  | "PACKED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURNED";

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export interface IOrderTimeline {
  status: OrderStatus;
  note?: string;
  performedBy?: string;
  timestamp: Date;
}

export const OrderTimelineSchema = new Schema<IOrderTimeline>(
  {
    status: { type: String, required: true },
    note: { type: String, trim: true },
    performedBy: { type: String, trim: true, default: "System" },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true },
);

export interface IOrderItem {
  variantId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  nameSnapshot: string;
  skuSnapshot: string;
  // Financial Snapshots strictly in integer paise (Rule 2)
  basePricePaise: number;
  compareAtPricePaise?: number;
  finalPricePaise: number;
  discountAmountPaise: number;
  campaignId?: string;
  campaignName?: string;
  priceSnapshotPaise: number; // Stored in integer paise (Rule 2)
  qty: number;
  optionsSnapshot?: Map<string, string>;
  imageSnapshot?: string;
}

export const OrderItemSchema = new Schema<IOrderItem>(
  {
    variantId: {
      type: Schema.Types.ObjectId,
      ref: "Variant",
      required: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    nameSnapshot: { type: String, required: true, trim: true },
    skuSnapshot: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    basePricePaise: {
      type: Number,
      required: true,
      default: function (this: IOrderItem) {
        return this.priceSnapshotPaise || 0;
      },
    },
    compareAtPricePaise: { type: Number },
    finalPricePaise: {
      type: Number,
      required: true,
      default: function (this: IOrderItem) {
        return this.priceSnapshotPaise || 0;
      },
    },
    discountAmountPaise: { type: Number, default: 0, min: 0 },
    campaignId: { type: String, trim: true },
    campaignName: { type: String, trim: true },
    priceSnapshotPaise: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
    optionsSnapshot: {
      type: Map,
      of: String,
      default: {},
    },
    imageSnapshot: { type: String, trim: true },
  },
  { _id: true },
);

export interface IOrderTotals {
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  taxPaise: number;
  totalPaise: number;
}

export const OrderTotalsSchema = new Schema<IOrderTotals>(
  {
    subtotalPaise: { type: Number, required: true, min: 0 },
    discountPaise: { type: Number, default: 0, min: 0 },
    shippingPaise: { type: Number, default: 0, min: 0 },
    taxPaise: { type: Number, default: 0, min: 0 },
    totalPaise: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

export interface IPaymentDetails {
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
}

export const PaymentDetailsSchema = new Schema<IPaymentDetails>(
  {
    razorpayOrderId: { type: String, trim: true },
    razorpayPaymentId: { type: String, trim: true },
    razorpaySignature: { type: String, trim: true },
  },
  { _id: false },
);

export interface IOrder extends Document {
  orderNumber: string;
  customerId: mongoose.Types.ObjectId;
  items: IOrderItem[];
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentDetails?: IPaymentDetails;
  totals: IOrderTotals;
  shippingAddress: IAddress;
  timeline: IOrderTimeline[];
  expiresAt?: Date;
  guestAccessTokenHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    items: {
      type: [OrderItemSchema],
      required: true,
      validate: [
        (items: IOrderItem[]) => items && items.length > 0,
        "Order must contain at least one line item",
      ],
    },
    status: {
      type: String,
      enum: [
        "PENDING",
        "PAID",
        "CONFIRMED",
        "PACKED",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
        "RETURNED",
      ],
      default: "PENDING",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "REFUNDED"],
      default: "PENDING",
      index: true,
    },
    paymentDetails: {
      type: PaymentDetailsSchema,
      default: () => ({}),
    },
    totals: {
      type: OrderTotalsSchema,
      required: true,
    },
    shippingAddress: {
      type: AddressSchema,
      required: true,
    },
    timeline: {
      type: [OrderTimelineSchema],
      default: [],
    },
    expiresAt: {
      type: Date,
    },
    guestAccessTokenHash: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

// Explicit schema indexes (Rule 4)
OrderSchema.index({ customerId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, paymentStatus: 1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, createdAt: -1 });
OrderSchema.index({ "paymentDetails.razorpayOrderId": 1 });
OrderSchema.index({ expiresAt: 1 });
OrderSchema.index({ createdAt: -1 });

export const Order: Model<IOrder> =
  (mongoose?.models && mongoose.models.Order) ||
  mongoose.model<IOrder>("Order", OrderSchema);

export default Order;
