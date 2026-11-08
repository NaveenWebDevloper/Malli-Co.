import { z } from "zod";

export const RecommendationsQuerySchema = z.object({
  slug: z.string().optional(),
  productId: z.string().optional(),
  recentSlugs: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return [];
      return val
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
    }),
  limit: z.coerce.number().int().min(1).max(24).default(8),
});

export const BatchProductsQuerySchema = z.object({
  slugs: z
    .string()
    .min(1, "Slugs parameter is required")
    .transform((val) =>
      val
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    ),
  excludeSlug: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(24).default(8),
});

export type RecommendationsQueryInput = z.infer<typeof RecommendationsQuerySchema>;
export type BatchProductsQueryInput = z.infer<typeof BatchProductsQuerySchema>;

