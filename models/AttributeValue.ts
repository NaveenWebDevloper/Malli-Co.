import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAttributeValue extends Document {
  attributeId: mongoose.Types.ObjectId;
  value: string; // e.g. "M", "Red"
  code: string; // e.g. "m", "red"
  hexColor?: string; // e.g. "#FF0000" for color attributes
  createdAt: Date;
  updatedAt: Date;
}

const AttributeValueSchema = new Schema<IAttributeValue>(
  {
    attributeId: {
      type: Schema.Types.ObjectId,
      ref: "Attribute",
      required: true,
      index: true,
    },
    value: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, lowercase: true },
    hexColor: { type: String, trim: true },
  },
  { timestamps: true },
);

AttributeValueSchema.index({ attributeId: 1, code: 1 }, { unique: true });

export const AttributeValue: Model<IAttributeValue> =
  (mongoose?.models && mongoose.models.AttributeValue) ||
  mongoose.model<IAttributeValue>("AttributeValue", AttributeValueSchema);

export default AttributeValue;
