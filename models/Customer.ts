import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAddress {
  name: string;
  phone: string;
  street: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

export const AddressSchema = new Schema<IAddress>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    landmark: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, default: "IN", trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true },
);

export interface ICustomer extends Document {
  name: string;
  email: string;
  passwordHash?: string;
  phone?: string;
  role: "CUSTOMER" | "ADMIN";
  addresses: IAddress[];
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    passwordHash: {
      type: String,
      select: false, // Security: Never returned in queries unless explicitly requested via .select("+passwordHash")
    },
    phone: { type: String, trim: true },
    role: {
      type: String,
      enum: ["CUSTOMER", "ADMIN"],
      default: "CUSTOMER",
      index: true,
    },
    addresses: {
      type: [AddressSchema],
      default: [],
    },
  },
  { timestamps: true },
);

// Explicit compound & sorting indexes (Rule 4)
CustomerSchema.index({ role: 1, createdAt: -1 });
CustomerSchema.index({ createdAt: -1 });

export const Customer: Model<ICustomer> =
  (mongoose?.models && mongoose.models.Customer) ||
  mongoose.model<ICustomer>("Customer", CustomerSchema);

export default Customer;
