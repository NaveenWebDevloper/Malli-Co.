import { z } from "zod";

export const AdjustStockSchema = z.object({
  variantId: z.string().min(1, "Variant ID is required"),
  change: z
    .number()
    .int("Change must be an integer")
    .refine((val) => val !== 0, "Change must not be zero"),
  reason: z.enum(["RESTOCK", "RETURN", "ADJUST", "SALE"], {
    message: "Reason must be one of: RESTOCK, RETURN, ADJUST, SALE",
  }),
  note: z.string().max(500, "Note must be under 500 characters").optional(),
});

export type AdjustStockInput = z.infer<typeof AdjustStockSchema>;

export const UpdateThresholdSchema = z.object({
  variantId: z.string().min(1, "Variant ID is required"),
  lowStockThreshold: z
    .number()
    .int("Threshold must be an integer")
    .min(0, "Threshold must be 0 or greater"),
});

export type UpdateThresholdInput = z.infer<typeof UpdateThresholdSchema>;
