import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAttribute extends Document {
  name: string; // e.g. "Size", "Color"
  code: string; // e.g. "size", "color"
  createdAt: Date;
  updatedAt: Date;
}

const AttributeSchema = new Schema<IAttribute>(
  {
    name: { type: String, required: true, trim: true },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
  },
  { timestamps: true },
);

// Explicit sorting indexes (Rule 4)
AttributeSchema.index({ createdAt: -1 });

export const Attribute: Model<IAttribute> =
  (mongoose?.models && mongoose.models.Attribute) ||
  mongoose.model<IAttribute>("Attribute", AttributeSchema);

export default Attribute;
