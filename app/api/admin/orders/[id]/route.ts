import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "../../../../../lib/db.ts";
import { Order } from "../../../../../models/Order.ts";
import { Customer } from "../../../../../models/Customer.ts";

export async function GET(
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

  // Ensure Customer model is registered
  if (!mongoose.models.Customer) {
    void Customer;
  }

  const order = await Order.findById(id)
    .populate("customerId", "name email phone role addresses")
    .lean();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ order });
}

