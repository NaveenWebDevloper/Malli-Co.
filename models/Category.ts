import mongoose, { Schema, Document, Model } from "mongoose";

export type GenderType = "MEN" | "KIDS" | "UNISEX";

export interface ICategoryTrending {
  enabled: boolean;
  sortOrder: number;
  tileImage?: {
    url: string;
    publicId?: string;
  };
  tileLabel?: string; // Optional override for category name
  badge?: string; // Optional badge e.g. "Up to 40% off"
}

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  gender: GenderType;
  parentId?: mongoose.Types.ObjectId | null;
  isActive: boolean;
  trending: ICategoryTrending;
  createdAt: Date;
  updatedAt: Date;
}

export const CategoryTrendingSchema = new Schema<ICategoryTrending>(
  {
    enabled: { type: Boolean, default: false, index: true },
    sortOrder: { type: Number, default: 0, index: true },
    tileImage: {
      url: { type: String, trim: true },
      publicId: { type: String, trim: true },
    },
    tileLabel: { type: String, trim: true },
    badge: { type: String, trim: true },
  },
  { _id: false },
);

const CategorySchema = new Schema<ICategory>(
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
    description: { type: String, trim: true },
    imageUrl: { type: String, trim: true },
    gender: {
      type: String,
      enum: ["MEN", "KIDS", "UNISEX"],
      required: true,
      index: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    trending: {
      type: CategoryTrendingSchema,
      default: () => ({ enabled: false, sortOrder: 0 }),
    },
  },
  { timestamps: true },
);

// Explicit compound & sorting indexes (Rule 4)
CategorySchema.index({ "trending.enabled": 1, "trending.sortOrder": 1 });
CategorySchema.index({ gender: 1, isActive: 1 });
CategorySchema.index({ createdAt: -1 });

export const Category: Model<ICategory> =
  (mongoose?.models && mongoose.models.Category) ||
  mongoose.model<ICategory>("Category", CategorySchema);

export default Category;
