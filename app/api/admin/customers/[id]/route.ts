import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { Order } from "@/models/Order";
import { CustomerFormSchema } from "@/lib/validations/customer";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/customers/[id]:
 * Retrieve customer details, addresses, and order history.
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
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

  await connectDB();
  const customerId = new mongoose.Types.ObjectId(id);

  const customer = await Customer.findById(customerId).lean();
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Retrieve customer's recent orders
  const orders = await Order.find({ customerId })
    .sort({ createdAt: -1 })
    .limit(20)
    .select("orderNumber status paymentStatus totals createdAt items")
    .lean();

  const totalSpendPaise = orders.reduce((sum, o) => {
    return o.paymentStatus === "PAID" ? sum + (o.totals?.totalPaise || 0) : sum;
  }, 0);

  return NextResponse.json({
    customer: {
      _id: customer._id.toString(),
      name: customer.name,
      email: customer.email,
      phone: customer.phone || "",
      role: customer.role,
      addresses: customer.addresses || [],
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      totalOrders: orders.length,
      totalSpendPaise,
      orders: orders.map((o) => ({
        _id: o._id.toString(),
        orderNumber: o.orderNumber,
        status: o.status,
        paymentStatus: o.paymentStatus,
        totalPaise: o.totals?.totalPaise || 0,
        itemCount: o.items?.length || 0,
        createdAt: o.createdAt,
      })),
    },
  });
}

/**
 * PUT /api/admin/customers/[id]:
 * Update customer details.
 */
export async function PUT(req: NextRequest, { params }: RouteContext) {
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

  await connectDB();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Malformed JSON payload" },
      { status: 400 },
    );
  }

  const parseResult = CustomerFormSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parseResult.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parseResult.data;
  const customerId = new mongoose.Types.ObjectId(id);

  // Email uniqueness (excluding this customer)
  const existingCustomer = await Customer.findOne({
    email: data.email,
    _id: { $ne: customerId },
  });
  if (existingCustomer) {
    return NextResponse.json(
      { error: `Email '${data.email}' is already taken by another account.` },
      { status: 409 },
    );
  }

  const updateFields: Record<string, unknown> = {
    name: data.name,
    email: data.email,
    phone: data.phone,
    role: data.role,
  };

  if (data.password && data.password.trim() !== "") {
    updateFields.passwordHash = await bcrypt.hash(data.password, 12);
  }

  try {
    const updated = await Customer.findByIdAndUpdate(
      customerId,
      { $set: updateFields },
      { new: true },
    );

    if (!updated) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Customer '${updated.name}' updated successfully.`,
      customer: {
        _id: updated._id.toString(),
        name: updated.name,
        email: updated.email,
        phone: updated.phone || "",
        role: updated.role,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error("Failed to update customer:", error);
    return NextResponse.json(
      { error: "Failed to update customer in database" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/customers/[id]:
 * Safely delete a customer with self-deletion and financial audit record guards.
 */
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
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

  // Guard 1: Cannot delete your own account
  if (session.user.id === id) {
    return NextResponse.json(
      { error: "Action prohibited: You cannot delete your own logged-in admin account." },
      { status: 400 },
    );
  }

  await connectDB();
  const customerId = new mongoose.Types.ObjectId(id);

  const customer = await Customer.findById(customerId);
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Guard 2: Cannot delete customer with order history
  const orderCount = await Order.countDocuments({ customerId });
  if (orderCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete customer '${customer.name}' because they have ${orderCount} associated order(s). Customer records with financial transactions must be preserved for accounting and tax records.`,
      },
      { status: 400 },
    );
  }

  try {
    await Customer.deleteOne({ _id: customerId });

    return NextResponse.json({
      success: true,
      message: `Customer account '${customer.name}' deleted successfully.`,
    });
  } catch (error) {
    console.error("Failed to delete customer:", error);
    return NextResponse.json(
      { error: "Failed to delete customer from database" },
      { status: 500 },
    );
  }
}

