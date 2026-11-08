import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBannerImage {
  url: string;
  publicId?: string;
  width?: number;
  height?: number;
}

export type BannerTextPosition = "left" | "center" | "right";
export type BannerTextTheme = "light" | "dark";

export interface IHeroBanner extends Document {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  ctaLabel: string;
  ctaUrl: string;
  secondaryCtaLabel?: string;
  secondaryCtaUrl?: string;
  imageDesktop: IBannerImage;
  imageMobile?: IBannerImage;
  altText: string;
  textPosition: BannerTextPosition;
  textTheme: BannerTextTheme;
  overlayOpacity: number; // 0 to 60 percent
  sortOrder: number;
  active: boolean;
  startsAt?: Date;
  endsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BannerImageSchema = new Schema<IBannerImage>(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, trim: true },
    width: { type: Number },
    height: { type: Number },
  },
  { _id: false },
);

const HeroBannerSchema = new Schema<IHeroBanner>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    eyebrow: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    ctaLabel: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    ctaUrl: {
      type: String,
      required: true,
      trim: true,
    },
    secondaryCtaLabel: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    secondaryCtaUrl: {
      type: String,
      trim: true,
    },
    imageDesktop: {
      type: BannerImageSchema,
      required: true,
    },
    imageMobile: {
      type: BannerImageSchema,
      required: false,
    },
    altText: {
      type: String,
      required: true,
      trim: true,
    },
    textPosition: {
      type: String,
      enum: ["left", "center", "right"],
      default: "left",
      required: true,
    },
    textTheme: {
      type: String,
      enum: ["light", "dark"],
      default: "light",
      required: true,
    },
    overlayOpacity: {
      type: Number,
      min: 0,
      max: 60,
      default: 30,
      required: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
      required: true,
    },
    startsAt: {
      type: Date,
      required: false,
    },
    endsAt: {
      type: Date,
      required: false,
    },
  },
  { timestamps: true },
);

// Explicit schema indexes (Rule 4)
HeroBannerSchema.index({ active: 1, sortOrder: 1 });
HeroBannerSchema.index({ startsAt: 1, endsAt: 1 });
HeroBannerSchema.index({ createdAt: -1 });

export const HeroBanner: Model<IHeroBanner> =
  (mongoose?.models && mongoose.models.HeroBanner) ||
  mongoose.model<IHeroBanner>("HeroBanner", HeroBannerSchema);

export default HeroBanner;

