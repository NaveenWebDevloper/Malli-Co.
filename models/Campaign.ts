import mongoose, { Schema, Document, Model } from "mongoose";

export type CampaignType =
  | "FESTIVE"
  | "SEASONAL"
  | "FLASH"
  | "CLEARANCE"
  | "NEW_YEAR"
  | "CUSTOM";

export type DiscountKind = "PERCENT" | "FLAT";
export type ScopeMode =
  | "ALL"
  | "CATEGORIES"
  | "BRANDS"
  | "COLLECTIONS"
  | "PRODUCTS";

export interface ICampaignDiscount {
  kind: DiscountKind;
  value: number; // PERCENT: 1-90; FLAT: integer paise
  maxDiscountAmount?: number; // Optional cap in integer paise
}

export interface ICampaignScope {
  mode: ScopeMode;
  ids: mongoose.Types.ObjectId[];
  gender?: "MEN" | "KIDS";
  excludeProductIds: mongoose.Types.ObjectId[];
}

export interface ICampaignDisplay {
  badgeLabel: string; // e.g. "DIWALI SALE" (max 20 chars)
  bannerImage?: {
    url: string;
    publicId?: string;
  };
  themeColor?: string; // hex/tailwind color
  showCountdown: boolean;
  landingEnabled: boolean;
}

export interface ICampaign extends Document {
  name: string;
  slug: string;
  type: CampaignType;
  description?: string;
  startsAt: Date;
  endsAt: Date;
  active: boolean; // Manual kill switch
  priority: number; // Higher number wins
  discount: ICampaignDiscount;
  scope: ICampaignScope;
  display: ICampaignDisplay;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignDiscountSchema = new Schema<ICampaignDiscount>(
  {
    kind: {
      type: String,
      enum: ["PERCENT", "FLAT"],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 1,
    },
    maxDiscountAmount: {
      type: Number,
      min: 0,
      default: undefined,
    },
  },
  { _id: false },
);

const CampaignScopeSchema = new Schema<ICampaignScope>(
  {
    mode: {
      type: String,
      enum: ["ALL", "CATEGORIES", "BRANDS", "COLLECTIONS", "PRODUCTS"],
      required: true,
      default: "ALL",
    },
    ids: [
      {
        type: Schema.Types.ObjectId,
        refPath: "scope.mode",
      },
    ],
    gender: {
      type: String,
      enum: ["MEN", "KIDS"],
      default: undefined,
    },
    excludeProductIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
  },
  { _id: false },
);

const CampaignDisplaySchema = new Schema<ICampaignDisplay>(
  {
    badgeLabel: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },
    bannerImage: {
      url: { type: String, trim: true },
      publicId: { type: String, trim: true },
    },
    themeColor: { type: String, trim: true, default: "#8C7A58" },
    showCountdown: { type: Boolean, default: false },
    landingEnabled: { type: Boolean, default: false },
  },
  { _id: false },
);

const CampaignSchema = new Schema<ICampaign>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "FESTIVE",
        "SEASONAL",
        "FLASH",
        "CLEARANCE",
        "NEW_YEAR",
        "CUSTOM",
      ],
      required: true,
      default: "CUSTOM",
    },
    description: {
      type: String,
      trim: true,
    },
    startsAt: {
      type: Date,
      required: true,
    },
    endsAt: {
      type: Date,
      required: true,
      validate: {
        validator: function (this: ICampaign, value: Date) {
          return value > this.startsAt;
        },
        message: "endsAt must be strictly after startsAt",
      },
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    priority: {
      type: Number,
      default: 0,
      index: true,
    },
    discount: {
      type: CampaignDiscountSchema,
      required: true,
    },
    scope: {
      type: CampaignScopeSchema,
      required: true,
      default: () => ({
        mode: "ALL",
        ids: [],
        excludeProductIds: [],
      }),
    },
    display: {
      type: CampaignDisplaySchema,
      required: true,
    },
  },
  { timestamps: true },
);

// Explicit Mongoose compound & query indexes (Rule 4)
CampaignSchema.index({ active: 1, startsAt: 1, endsAt: 1 });
CampaignSchema.index({ priority: -1 });
CampaignSchema.index({ "scope.mode": 1, "scope.ids": 1 });
CampaignSchema.index({ createdAt: -1 });

export const Campaign: Model<ICampaign> =
  (mongoose?.models && mongoose.models.Campaign) ||
  mongoose.model<ICampaign>("Campaign", CampaignSchema);

export default Campaign;

