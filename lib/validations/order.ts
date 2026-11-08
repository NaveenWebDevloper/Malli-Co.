import { z } from "zod";

export const UpdateOrderStatusSchema = z.object({
  status: z.enum(
    [
      "PENDING",
      "PAID",
      "CONFIRMED",
      "PACKED",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
      "RETURNED",
    ],
    { message: "Invalid order status value" },
  ),
  note: z.string().max(500, "Note cannot exceed 500 characters").optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>;

