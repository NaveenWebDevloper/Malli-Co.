import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISetting extends Document {
  key: string;
  value: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SettingSchema = new Schema<ISetting>(
  {
    key: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
  },
  {
    timestamps: true,
  },
);

// Explicit Unique Index (Rule 4)
SettingSchema.index({ key: 1 }, { unique: true });

export const Setting: Model<ISetting> =
  (mongoose?.models && mongoose.models.Setting) ||
  mongoose.model<ISetting>("Setting", SettingSchema);

export default Setting;
