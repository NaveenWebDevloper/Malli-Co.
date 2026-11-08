import { z } from "zod";

export const VariantFormSchema = z.object({
  _id: z.string().optional(),
  sku: z
    .string()
    .min(1, "SKU is required")
    .transform((val) => val.trim().toUpperCase()),
  price: z.number().min(0, "Price must be positive"), // in Rupees on input
  compareAtPrice: z.number().min(0).optional().nullable(),
  stock: z.number().int().min(0, "Stock cannot be negative").default(0),
  images: z
    .array(z.string().url("Must be valid URL").or(z.string()))
    .default([]),
  options: z.record(z.string(), z.string()).default({}),
  isDefault: z.boolean().default(false),
  status: z.enum(["ACTIVE", "ARCHIVED"]).default("ACTIVE"),
});

export const ProductAttributeSchema = z.object({
  attributeId: z.string().optional(),
  name: z.string().min(1, "Attribute name is required"),
  values: z.array(z.string().min(1)).min(1, "At least one value is required"),
});

export const ProductFormSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase alphanumeric with hyphens",
    ),
  description: z.string().min(5, "Description must be at least 5 characters"),
  brandId: z.string().min(1, "Brand selection is required"),
  categoryId: z.string().min(1, "Category selection is required"),
  gender: z.enum(["MEN", "KIDS"]),
  type: z.enum(["SIMPLE", "VARIABLE"]),
  basePrice: z.number().min(0, "Base price cannot be negative"), // in Rupees on input
  status: z.enum(["DRAFT", "ACTIVE"]).default("DRAFT"),
  images: z.array(z.string()).default([]),
  productAttributes: z.array(ProductAttributeSchema).default([]),
  variants: z
    .array(VariantFormSchema)
    .min(1, "At least one variant is required"),
});

export type ProductFormValues = z.infer<typeof ProductFormSchema>;
export type VariantFormValues = z.infer<typeof VariantFormSchema>;
