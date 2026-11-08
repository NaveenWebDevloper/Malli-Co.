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
  name: z.string().min(2, "Full name is required").trim(),
  phone: z
    .string()
    .min(10, "Valid 10-digit phone number is required")
    .max(15)
    .trim(),
  email: z.string().email("Valid email address is required").trim().toLowerCase(),
  street: z.string().min(5, "Street address is required").trim(),
  landmark: z.string().optional(),
  city: z.string().min(2, "City is required").trim(),
  state: z.string().min(2, "State is required").trim(),
  postalCode: z
    .string()
    .regex(/^\d{6}$/, "Valid 6-digit Indian PIN code is required")
    .trim(),
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
  notes: z.string().max(500).optional(),
});

export type CheckoutPayload = z.infer<typeof CheckoutPayloadSchema>;
export type CheckoutAddress = z.infer<typeof CheckoutAddressSchema>;

