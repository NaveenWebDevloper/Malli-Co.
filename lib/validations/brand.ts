import { z } from "zod";

export const BrandFormSchema = z.object({
  name: z
    .string()
    .min(2, "Brand name must be at least 2 characters")
    .max(100, "Brand name cannot exceed 100 characters")
    .trim(),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(100, "Slug cannot exceed 100 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must contain only lowercase alphanumeric characters and single hyphens",
    )
    .trim()
    .toLowerCase(),
  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional()
    .default(""),
  logoUrl: z
    .string()
    .max(500, "Logo URL cannot exceed 500 characters")
    .optional()
    .default(""),
  isActive: z.boolean().default(true),
});

export type BrandFormInput = z.infer<typeof BrandFormSchema>;

