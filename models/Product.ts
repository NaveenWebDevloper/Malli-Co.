import mongoose, { Schema, Document, Model } from "mongoose";

export type ProductGender = "MEN" | "KIDS";
export type ProductType = "SIMPLE" | "VARIABLE";
export type ProductStatus = "DRAFT" | "ACTIVE";
export interface IProductAttribute {
  attributeId: mongoose.Types.ObjectId;
  name: string; // e.g. "Size", "Color"
  values: string[]; // e.g. ["S", "M", "L", "XL"] or ["Navy Blue", "Olive Green"]
}

export const ProductAttributeSchema = new Schema<IProductAttribute>(
  {
    attributeId: {
      type: Schema.Types.ObjectId,
      ref: "Attribute",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    values: [{ type: String, required: true, trim: true }],
  },
  { _id: false },
);

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  brandId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  gender: ProductGender;
  type: ProductType;
  basePricePaise: number; // Stored in integer paise (Rule 2)
  status: ProductStatus;
  images: string[];
  productAttributes: IProductAttribute[];
  deletedAt: Date | null;
  deletedBy: mongoose.Types.ObjectId | null;
  deleteReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
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
    description: { type: String, required: true, trim: true },
    brandId: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    gender: {
      type: String,
      enum: ["MEN", "KIDS"],
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["SIMPLE", "VARIABLE"],
      required: true,
      default: "SIMPLE",
      index: true,
    },
    basePricePaise: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["DRAFT", "ACTIVE"],
      default: "DRAFT",
      index: true,
    },
    images: [{ type: String, trim: true }],
    productAttributes: {
      type: [ProductAttributeSchema],
      default: [],
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },
    deleteReason: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },
  },
  { timestamps: true },
);

// Explicit schema indexes (Rule 4)
ProductSchema.index({ deletedAt: 1, status: 1 });
ProductSchema.index({ deletedAt: 1, categoryId: 1 });
ProductSchema.index({ deletedAt: 1, brandId: 1 });
ProductSchema.index({ status: 1, gender: 1 });
ProductSchema.index({ categoryId: 1, status: 1 });
ProductSchema.index({ brandId: 1, status: 1 });
ProductSchema.index({ createdAt: -1 });

export const Product: Model<IProduct> =
  (mongoose?.models && mongoose.models.Product) ||
  mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
