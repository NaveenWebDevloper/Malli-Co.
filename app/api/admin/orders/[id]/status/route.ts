import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "../../../../../../lib/db.ts";
import { updateOrderStatus } from "../../../../../../lib/orders.ts";
import { UpdateOrderStatusSchema } from "../../../../../../lib/validations/order.ts";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Admin role required" },
      { status: 403 },
    );
  }

  const { id } = await context.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  await connectDB();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = UpdateOrderStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { status: newStatus, note } = parsed.data;
  const performedBy = session.user.name || session.user.email || "Admin";

  try {
    const result = await updateOrderStatus({
      orderId: id,
      newStatus,
      note,
      performedBy,
    });

    return NextResponse.json({
      success: true,
      order: result.order,
      restocked: result.restocked,
      restockedCount: result.restockedCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update order status";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

