import mongoose, { Schema, Document, Model } from "mongoose";

export interface IHeroSlide extends Document {
  src: string;
  alt: string;
  title: string;
  subtitle?: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HeroSlideSchema = new Schema<IHeroSlide>(
  {
    src: { type: String, required: true, trim: true },
    alt: { type: String, default: "", trim: true },
    title: { type: String, default: "", trim: true },
    subtitle: { type: String, default: "", trim: true },
    order: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
  },
);

// Explicit Indexes (Rule 4)
HeroSlideSchema.index({ order: 1, isActive: 1 });
HeroSlideSchema.index({ createdAt: -1 });

export const HeroSlide: Model<IHeroSlide> =
  (mongoose?.models && mongoose.models.HeroSlide) ||
  mongoose.model<IHeroSlide>("HeroSlide", HeroSlideSchema);

export default HeroSlide;

