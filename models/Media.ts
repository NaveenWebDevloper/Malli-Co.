import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMedia extends Document {
  filename: string;
  contentType: string;
  size: number;
  data: Buffer;
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema = new Schema<IMedia>(
  {
    filename: { type: String, required: true, trim: true },
    contentType: { type: String, required: true, trim: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
  },
  {
    timestamps: true,
  },
);

// Rule 4: Explicit Schema Indexes in Mongoose
MediaSchema.index({ createdAt: -1 });

export const Media: Model<IMedia> =
  mongoose.models.Media || mongoose.model<IMedia>("Media", MediaSchema);
