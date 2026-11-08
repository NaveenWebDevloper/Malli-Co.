import { z } from "zod";

/**
 * Validates and normalizes URLs:
 * 1. An internal path starting with "/" (e.g., "/collections/winter", "/men")
 * 2. An internal relative shortcut (e.g. "men", "kids", "collections/autumn-winter26") normalized to "/..."
 * 3. An external HTTP/HTTPS URL (e.g. "https://wrogn.com/collections/autumn-winter26")
 * 4. A web domain without protocol (e.g. "wrogn.com/collections") normalized to "https://..."
 *
 * Rejects dangerous schemes ("javascript:...", "data:...", "vbscript:...").
 */
export const SafeUrlSchema = z
  .string()
  .trim()
  .min(1, "URL is required")
  .transform((val) => {
    // If user entered without leading slash and no protocol:
    if (!val.startsWith("/") && !val.startsWith("http://") && !val.startsWith("https://")) {
      // If it looks like a web domain (e.g. wrogn.com, www.example.com), prepend https://
      if (val.includes(".") && !val.startsWith("/")) {
        return `https://${val}`;
      }
      return `/${val}`;
    }
    return val;
  })
  .refine(
    (val) => {
      // Internal relative URL (must not be protocol-relative //)
      if (val.startsWith("/") && !val.startsWith("//")) {
        return true;
      }
      // Valid HTTP/HTTPS web address
      try {
        const parsed = new URL(val);
        return parsed.protocol === "https:" || parsed.protocol === "http:";
      } catch {
        return false;
      }
    },
    {
      message:
        "URL must be an internal path (starting with '/') or a valid web address ('http://' or 'https://').",
    },
  );

export const OptionalSafeUrlSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .or(z.literal(""))
  .transform((val) => {
    if (!val || val.trim() === "") return undefined;
    const trimmed = val.trim();
    if (!trimmed.startsWith("/") && !trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      if (trimmed.includes(".") && !trimmed.startsWith("/")) {
        return `https://${trimmed}`;
      }
      return `/${trimmed}`;
    }
    return trimmed;
  })
  .refine(
    (val) => {
      if (!val) return true;
      if (val.startsWith("/") && !val.startsWith("//")) {
        return true;
      }
      try {
        const parsed = new URL(val);
        return parsed.protocol === "https:" || parsed.protocol === "http:";
      } catch {
        return false;
      }
    },
    {
      message:
        "URL must be an internal path (starting with '/') or a valid web address ('http://' or 'https://').",
    },
  );

export const BannerImageSchema = z.object({
  url: z.string().trim().min(1, "Image URL is required"),
  publicId: z.string().trim().optional().nullable(),
  width: z.number().positive().optional().nullable(),
  height: z.number().positive().optional().nullable(),
  format: z.string().optional().nullable(),
});

export const HeroBannerSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(80, "Title must not exceed 80 characters"),
  subtitle: z
    .string()
    .trim()
    .max(160, "Subtitle must not exceed 160 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
  eyebrow: z
    .string()
    .trim()
    .max(30, "Eyebrow must not exceed 30 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
  ctaLabel: z
    .string()
    .trim()
    .min(1, "CTA label is required")
    .max(30, "CTA label must not exceed 30 characters"),
  ctaUrl: SafeUrlSchema,
  secondaryCtaLabel: z
    .string()
    .trim()
    .max(30, "Secondary CTA label must not exceed 30 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
  secondaryCtaUrl: OptionalSafeUrlSchema,
  imageDesktop: BannerImageSchema,
  imageMobile: BannerImageSchema.optional().nullable(),
  altText: z.string().trim().min(1, "Alt text is required for accessibility"),
  textPosition: z.enum(["left", "center", "right"]).default("left"),
  textTheme: z.enum(["light", "dark"]).default("light"),
  overlayOpacity: z.coerce
    .number()
    .min(0, "Overlay opacity cannot be negative")
    .max(60, "Overlay opacity cannot exceed 60%")
    .default(30),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
  startsAt: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .refine(
      (val) => {
        if (!val || val === "") return true;
        const d = new Date(val);
        return !isNaN(d.getTime());
      },
      { message: "Invalid date format for startsAt" },
    ),
  endsAt: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(""))
    .refine(
      (val) => {
        if (!val || val === "") return true;
        const d = new Date(val);
        return !isNaN(d.getTime());
      },
      { message: "Invalid date format for endsAt" },
    ),
});

export const HeroBannerUpdateSchema = HeroBannerSchema.partial();

export const HeroBannerReorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1, "Banner ID is required"),
      sortOrder: z.number().int(),
    }),
  ),
});
