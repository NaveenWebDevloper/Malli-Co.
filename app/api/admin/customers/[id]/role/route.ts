import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { CustomerRoleUpdateSchema } from "@/lib/validations/customer";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/admin/customers/[id]/role:
 * Quickly toggle or update customer role between CUSTOMER and ADMIN.
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Admin role required" },
      { status: 403 },
    );
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: "Invalid customer ID format" },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Malformed JSON payload" },
      { status: 400 },
    );
  }

  const parseResult = CustomerRoleUpdateSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parseResult.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { role } = parseResult.data;

  // Prevent self-demotion
  if (session.user.id === id && role !== "ADMIN") {
    return NextResponse.json(
      { error: "Action prohibited: You cannot remove your own ADMIN role privileges." },
      { status: 400 },
    );
  }

  await connectDB();
  const customerId = new mongoose.Types.ObjectId(id);

  const customer = await Customer.findByIdAndUpdate(
    customerId,
    { $set: { role } },
    { new: true },
  );

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    message: `Role for '${customer.name}' updated to ${role}.`,
    customer: {
      _id: customer._id.toString(),
      name: customer.name,
      email: customer.email,
      role: customer.role,
    },
  });
}

