import mongoose, { Schema, Document, Model } from "mongoose";

export type CollectionMode = "MANUAL" | "AUTO";
export type CollectionAutoRuleType = "BESTSELLERS" | "NEWEST" | "ON_SALE";

export interface ICollectionAutoRule {
  type: CollectionAutoRuleType;
  gender?: "MEN" | "KIDS";
  categoryId?: mongoose.Types.ObjectId;
  limit?: number;
}

export interface ICollection extends Document {
  name: string;
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  bannerImageUrl?: string;
  mode: CollectionMode;
  productIds: mongoose.Types.ObjectId[];
  autoRule?: ICollectionAutoRule;
  maxItems: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CollectionAutoRuleSchema = new Schema<ICollectionAutoRule>(
  {
    type: {
      type: String,
      enum: ["BESTSELLERS", "NEWEST", "ON_SALE"],
      required: true,
      default: "BESTSELLERS",
    },
    gender: {
      type: String,
      enum: ["MEN", "KIDS"],
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
    },
    limit: {
      type: Number,
      default: 10,
      min: 1,
      max: 50,
    },
  },
  { _id: false },
);

const CollectionSchema = new Schema<ICollection>(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true },
    description: { type: String, trim: true },
    bannerImageUrl: { type: String, trim: true },
    mode: {
      type: String,
      enum: ["MANUAL", "AUTO"],
      default: "MANUAL",
      required: true,
      index: true,
    },
    productIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    autoRule: {
      type: CollectionAutoRuleSchema,
      default: () => ({ type: "BESTSELLERS", limit: 10 }),
    },
    maxItems: {
      type: Number,
      default: 10,
      min: 2,
      max: 24,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

// Explicit compound & sorting indexes (Rule 4)
CollectionSchema.index({ active: 1, mode: 1 });
CollectionSchema.index({ createdAt: -1 });

export const Collection: Model<ICollection> =
  (mongoose?.models && mongoose.models.Collection) ||
  mongoose.model<ICollection>("Collection", CollectionSchema);

export default Collection;
