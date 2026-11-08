import { z } from "zod";

const ObjectIdRegex = /^[0-9a-fA-F]{24}$/;

export const CollectionAutoRuleSchema = z.object({
  type: z.enum(["BESTSELLERS", "NEWEST", "ON_SALE"]),
  gender: z.enum(["MEN", "KIDS"]).optional().nullable(),
  categoryId: z
    .string()
    .regex(ObjectIdRegex, "Category ID must be a valid ObjectId")
    .optional()
    .nullable(),
  limit: z.number().int().min(1).max(50).optional().default(10),
});

export const CollectionBaseSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Slug must be at least 2 characters")
    .max(80)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must contain only lowercase alphanumeric characters and single hyphens",
    ),
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(100),
  subtitle: z.string().trim().max(200).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  bannerImageUrl: z.string().trim().url("Invalid banner image URL").optional().nullable().or(z.literal("")),
  mode: z.enum(["MANUAL", "AUTO"]).default("MANUAL"),
  productIds: z
    .array(z.string().regex(ObjectIdRegex, "Invalid product ID"))
    .default([]),
  autoRule: CollectionAutoRuleSchema.optional().nullable(),
  maxItems: z.number().int().min(2).max(24).default(10),
  active: z.boolean().default(true),
});

export const CollectionCreateSchema = CollectionBaseSchema.refine(
  (data) => {
    if (data.mode === "AUTO") {
      return !!data.autoRule;
    }
    return true;
  },
  {
    message: "autoRule is required when collection mode is AUTO",
    path: ["autoRule"],
  },
);

export const CollectionUpdateSchema = CollectionBaseSchema.partial();

export type CollectionCreateInput = z.infer<typeof CollectionCreateSchema>;
export type CollectionUpdateInput = z.infer<typeof CollectionUpdateSchema>;
