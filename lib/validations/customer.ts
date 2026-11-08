import { z } from "zod";

export const CustomerRoleEnum = z.enum(["CUSTOMER", "ADMIN"], {
  message: "Role must be either CUSTOMER or ADMIN",
});

export const CustomerFormSchema = z.object({
  name: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters")
    .trim(),
  email: z
    .string()
    .email("A valid email address is required")
    .max(150, "Email cannot exceed 150 characters")
    .trim()
    .toLowerCase(),
  phone: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || /^[0-9+\-\s()]{10,15}$/.test(val),
      "Phone number must be between 10 and 15 digits",
    ),
  role: CustomerRoleEnum.default("CUSTOMER"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100)
    .optional()
    .or(z.literal("")),
});

export const CustomerRoleUpdateSchema = z.object({
  role: CustomerRoleEnum,
});

export type CustomerFormInput = z.infer<typeof CustomerFormSchema>;
export type CustomerRoleUpdateInput = z.infer<typeof CustomerRoleUpdateSchema>;
