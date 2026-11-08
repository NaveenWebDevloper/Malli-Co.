import { z } from "zod";

const ObjectIdRegex = /^[0-9a-fA-F]{24}$/;

export const CampaignDiscountSchema = z
  .object({
    kind: z.enum(["PERCENT", "FLAT"]),
    value: z.number().int("Discount value must be an integer"),
    maxDiscountAmount: z
      .number()
      .int("Max discount cap must be an integer in paise")
      .positive("Max discount cap must be positive")
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      if (data.kind === "PERCENT") {
        return data.value >= 1 && data.value <= 90;
      }
      return data.value > 0;
    },
    {
      message:
        "Percentage discount must be between 1 and 90; flat discount must be a positive integer in paise",
      path: ["value"],
    },
  );

export const CampaignScopeSchema = z.object({
  mode: z.enum(["ALL", "CATEGORIES", "BRANDS", "COLLECTIONS", "PRODUCTS"]),
  ids: z
    .array(
      z
        .string()
        .regex(ObjectIdRegex, "Each ID in scope must be a valid 24-character hexadecimal ObjectId"),
    )
    .default([]),
  gender: z.enum(["MEN", "KIDS"]).optional().nullable(),
  excludeProductIds: z
    .array(
      z
        .string()
        .regex(
          ObjectIdRegex,
          "Each excluded ID must be a valid 24-character hexadecimal ObjectId",
        ),
    )
    .default([]),
});

export const CampaignDisplaySchema = z.object({
  badgeLabel: z
    .string()
    .trim()
    .min(1, "Badge label cannot be empty")
    .max(20, "Badge label cannot exceed 20 characters"),
  bannerImage: z
    .object({
      url: z.string().trim().optional(),
      publicId: z.string().trim().optional(),
    })
    .optional(),
  themeColor: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Invalid hex color format")
    .default("#8C7A58"),
  showCountdown: z.boolean().default(false),
  landingEnabled: z.boolean().default(false),
});

export const CampaignCreateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Campaign name must be at least 2 characters")
      .max(80, "Campaign name cannot exceed 80 characters"),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(2, "Slug must be at least 2 characters")
      .max(80, "Slug cannot exceed 80 characters")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must be lowercase alphanumeric with hyphens only",
      ),
    type: z.enum([
      "FESTIVE",
      "SEASONAL",
      "FLASH",
      "CLEARANCE",
      "NEW_YEAR",
      "CUSTOM",
    ]),
    description: z.string().trim().max(500).optional().default(""),
    startsAt: z.coerce.date({
      message: "Start date is required",
    }),
    endsAt: z.coerce.date({
      message: "End date is required",
    }),
    active: z.boolean().default(true),
    priority: z
      .number()
      .int("Priority must be an integer")
      .default(0),
    discount: CampaignDiscountSchema,
    scope: CampaignScopeSchema,
    display: CampaignDisplaySchema,
  })
  .refine((data) => data.endsAt.getTime() > data.startsAt.getTime(), {
    message: "endsAt must be strictly after startsAt",
    path: ["endsAt"],
  });

export const CampaignUpdateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Campaign name must be at least 2 characters")
      .max(80, "Campaign name cannot exceed 80 characters")
      .optional(),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(2, "Slug must be at least 2 characters")
      .max(80, "Slug cannot exceed 80 characters")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must be lowercase alphanumeric with hyphens only",
      )
      .optional(),
    type: z
      .enum([
        "FESTIVE",
        "SEASONAL",
        "FLASH",
        "CLEARANCE",
        "NEW_YEAR",
        "CUSTOM",
      ])
      .optional(),
    description: z.string().trim().max(500).optional(),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
    active: z.boolean().optional(),
    priority: z.number().int().optional(),
    discount: CampaignDiscountSchema.optional(),
    scope: CampaignScopeSchema.optional(),
    display: CampaignDisplaySchema.optional(),
  })
  .refine(
    (data) => {
      if (data.startsAt && data.endsAt) {
        return data.endsAt.getTime() > data.startsAt.getTime();
      }
      return true;
    },
    {
      message: "endsAt must be strictly after startsAt",
      path: ["endsAt"],
    },
  );

export type CampaignCreateInput = z.infer<typeof CampaignCreateSchema>;
export type CampaignUpdateInput = z.infer<typeof CampaignUpdateSchema>;

