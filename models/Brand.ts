import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBrand extends Document {
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BrandSchema = new Schema<IBrand>(
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
    logoUrl: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

// Explicit compound & sorting indexes (Rule 4)
BrandSchema.index({ isActive: 1, createdAt: -1 });
BrandSchema.index({ createdAt: -1 });

export const Brand: Model<IBrand> =
  (mongoose?.models && mongoose.models.Brand) ||
  mongoose.model<IBrand>("Brand", BrandSchema);

export default Brand;
