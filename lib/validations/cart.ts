import { z } from "zod";

export const AddToCartSchema = z.object({
  variantId: z.string().min(1, "Variant ID is required"),
  quantity: z
    .number()
    .int("Quantity must be an integer")
    .min(1, "Quantity must be at least 1")
    .default(1),
});

export const UpdateCartItemSchema = z.object({
  variantId: z.string().min(1, "Variant ID is required"),
  quantity: z
    .number()
    .int("Quantity must be an integer")
    .min(0, "Quantity cannot be negative"),
});

export const RemoveFromCartSchema = z.object({
  variantId: z.string().min(1, "Variant ID is required"),
});

export const CheckoutAddressSchema = z.object({
  name: z.string().trim().min(2, "Full name is required"),
  phone: z
    .string()
    .trim()
    .transform((val) => val.replace(/[\s\-\(\)\.]/g, ""))
    .refine((val) => /^(?:\+?91)?[6-9]\d{9}$/.test(val), {
      message: "Please enter a valid 10-digit Indian mobile number",
    })
    .transform((val) => val.replace(/\D/g, "").slice(-10)),
  email: z.string().trim().toLowerCase().email("Valid email address is required"),
  street: z.string().trim().min(3, "Street address is required"),
  landmark: z.string().optional().default(""),
  city: z.string().trim().min(2, "City is required"),
  state: z.string().trim().min(2, "State is required"),
  postalCode: z
    .string()
    .trim()
    .transform((val) => val.replace(/\s+/g, ""))
    .refine((val) => /^\d{6}$/.test(val), {
      message: "Valid 6-digit Indian PIN code is required",
    }),
  country: z.string().default("IN"),
});

export const CheckoutPayloadSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1, "Cart must contain at least one item"),
  shippingAddress: CheckoutAddressSchema,
  saveAddress: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

export type CheckoutPayload = z.infer<typeof CheckoutPayloadSchema>;
export type CheckoutAddress = z.infer<typeof CheckoutAddressSchema>;

