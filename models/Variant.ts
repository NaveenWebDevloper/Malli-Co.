import mongoose, { Schema, Document, Model } from "mongoose";

export interface IVariant extends Document {
  productId: mongoose.Types.ObjectId;
  sku: string;
  pricePaise: number; // Stored in integer paise (Rule 2)
  compareAtPricePaise?: number; // Optional compare-at price in paise
  stock: number; // Checked/updated atomically (Rule 3)
  reservedStock: number; // Reserved during checkout holds (15-min hold)
  lowStockThreshold: number; // Alert threshold for low inventory
  images: string[];
  options: Map<string, string>; // e.g. { Size: "M", Color: "Red" }
  isDefault: boolean;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: Date;
  updatedAt: Date;
}

const VariantSchema = new Schema<IVariant>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    pricePaise: {
      type: Number,
      required: true,
      min: 0,
    },
    compareAtPricePaise: {
      type: Number,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      index: true,
    },
    reservedStock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      index: true,
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },
    images: [{ type: String, trim: true }],
    options: {
      type: Map,
      of: String,
      default: {},
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "ARCHIVED"],
      default: "ACTIVE",
      index: true,
    },
  },
  { timestamps: true },
);

// Explicit schema indexes (Rule 4)
VariantSchema.index({ productId: 1, status: 1 });
VariantSchema.index({ productId: 1, isDefault: 1 });
VariantSchema.index({ createdAt: -1 });

export const Variant: Model<IVariant> =
  (mongoose?.models && mongoose.models.Variant) ||
  mongoose.model<IVariant>("Variant", VariantSchema);

export default Variant;
