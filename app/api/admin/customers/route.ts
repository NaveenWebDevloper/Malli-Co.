import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Customer, type ICustomer } from "@/models/Customer";
import { Order } from "@/models/Order";
import { CustomerFormSchema } from "@/lib/validations/customer";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/customers:
 * List customers with order statistics (total orders, total spend in paise),
 * search, role filtering, and pagination.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Admin role required" },
      { status: 403 },
    );
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const role = searchParams.get("role")?.trim();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "15", 10)),
  );
  const skip = (page - 1) * limit;

  const query: mongoose.FilterQuery<ICustomer> = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }

  if (role && (role === "CUSTOMER" || role === "ADMIN")) {
    query.role = role;
  }

  try {
    const [customers, totalCount] = await Promise.all([
      Customer.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Customer.countDocuments(query),
    ]);

    // Aggregate orders statistics per customer
    const customerIds = customers.map((c) => c._id);
    const orderStats = await Order.aggregate([
      { $match: { customerId: { $in: customerIds } } },
      {
        $group: {
          _id: "$customerId",
          totalOrders: { $sum: 1 },
          totalSpendPaise: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "PAID"] }, "$totals.totalPaise", 0],
            },
          },
        },
      },
    ]);

    const statsMap = new Map<string, { totalOrders: number; totalSpendPaise: number }>();
    for (const stat of orderStats) {
      statsMap.set(stat._id.toString(), {
        totalOrders: stat.totalOrders,
        totalSpendPaise: stat.totalSpendPaise,
      });
    }

    const formattedCustomers = customers.map((c) => {
      const stats = statsMap.get(c._id.toString()) || {
        totalOrders: 0,
        totalSpendPaise: 0,
      };
      return {
        _id: c._id.toString(),
        name: c.name,
        email: c.email,
        phone: c.phone || "",
        role: c.role,
        addressCount: c.addresses?.length || 0,
        totalOrders: stats.totalOrders,
        totalSpendPaise: stats.totalSpendPaise,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });

    // Summary counts
    const [totalCustomersCount, totalAdminsCount] = await Promise.all([
      Customer.countDocuments({ role: "CUSTOMER" }),
      Customer.countDocuments({ role: "ADMIN" }),
    ]);

    return NextResponse.json({
      customers: formattedCustomers,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
      summary: {
        totalCustomers: totalCustomersCount,
        totalAdmins: totalAdminsCount,
      },
    });
  } catch (error) {
    console.error("Failed to fetch admin customers:", error);
    return NextResponse.json(
      { error: "Failed to retrieve customers from database" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/customers:
 * Create a new customer or admin user account.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Admin role required" },
      { status: 403 },
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

  // Email uniqueness check
  const existingCustomer = await Customer.findOne({ email: data.email });
  if (existingCustomer) {
    return NextResponse.json(
      { error: `User with email '${data.email}' already exists.` },
      { status: 409 },
    );
  }

  let passwordHash: string | undefined = undefined;
  if (data.password && data.password.trim() !== "") {
    passwordHash = await bcrypt.hash(data.password, 12);
  }

  try {
    const newCustomer = await Customer.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      passwordHash,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Customer account '${newCustomer.name}' created successfully.`,
        customer: {
          _id: newCustomer._id.toString(),
          name: newCustomer.name,
          email: newCustomer.email,
          phone: newCustomer.phone || "",
          role: newCustomer.role,
          createdAt: newCustomer.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create customer:", error);
    return NextResponse.json(
      { error: "Failed to create customer in database" },
      { status: 500 },
    );
  }
}

