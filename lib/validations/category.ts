import { z } from "zod";

export const CategoryGenderEnum = z.enum(["MEN", "KIDS", "UNISEX"], {
  message: "Gender must be MEN, KIDS, or UNISEX",
});

const imagePathOrUrlSchema = z
  .string()
  .trim()
  .refine(
    (val) => !val || val === "" || val.startsWith("/") || /^https?:\/\//i.test(val),
    { message: "Must be a valid URL or path (e.g., https://... or /uploads/...)" },
  );

export const CategoryTrendingSchema = z.object({
  enabled: z.boolean().default(false),
  sortOrder: z.number().int("Sort order must be an integer").min(0).default(0),
  tileImage: z
    .object({
      url: imagePathOrUrlSchema.optional().nullable().or(z.literal("")),
      publicId: z.string().trim().optional(),
    })
    .optional()
    .nullable(),
  tileLabel: z.string().trim().max(60, "Tile label cannot exceed 60 characters").optional().nullable(),
  badge: z.string().trim().max(30, "Badge cannot exceed 30 characters").optional().nullable(),
});

export const CategoryFormSchema = z.object({
  name: z
    .string()
    .min(2, "Category name must be at least 2 characters")
    .max(100, "Category name cannot exceed 100 characters")
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
  imageUrl: imagePathOrUrlSchema
    .optional()
    .nullable()
    .or(z.literal("")),
  gender: CategoryGenderEnum,
  parentId: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val && val.trim() !== "" ? val.trim() : null)),
  isActive: z.boolean().default(true),
  trending: CategoryTrendingSchema.optional(),
});

export const TrendingReorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Category ID"),
      sortOrder: z.number().int("Sort order must be an integer").min(0),
      enabled: z.boolean().optional(),
    }),
  ),
});

export type CategoryFormInput = z.infer<typeof CategoryFormSchema>;
export type CategoryTrendingInput = z.infer<typeof CategoryTrendingSchema>;
export type TrendingReorderInput = z.infer<typeof TrendingReorderSchema>;
