import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICartItem {
  variantId: mongoose.Types.ObjectId;
  quantity: number;
  addedAt: Date;
  priceAtAdditionPaise?: number;
  campaignIdAtAddition?: string;
  campaignNameAtAddition?: string;
}

export const CartItemSchema = new Schema<ICartItem>(
  {
    variantId: {
      type: Schema.Types.ObjectId,
      ref: "Variant",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
    priceAtAdditionPaise: {
      type: Number,
    },
    campaignIdAtAddition: {
      type: String,
    },
    campaignNameAtAddition: {
      type: String,
    },
  },
  { _id: false },
);

export interface ICart extends Document {
  cartToken: string;
  userId?: mongoose.Types.ObjectId | null;
  items: ICartItem[];
  createdAt: Date;
  updatedAt: Date;
}

const CartSchema = new Schema<ICart>(
  {
    cartToken: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
      index: true,
    },
    items: {
      type: [CartItemSchema],
      default: [],
    },
  },
  { timestamps: true },
);

// Explicit schema indexes (Rule 4)
CartSchema.index({ updatedAt: -1 });

export const Cart: Model<ICart> =
  (mongoose?.models && mongoose.models.Cart) ||
  mongoose.model<ICart>("Cart", CartSchema);

export default Cart;

