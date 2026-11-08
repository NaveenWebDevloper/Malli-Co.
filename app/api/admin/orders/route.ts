import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import { connectDB } from "../../../../lib/db.ts";
import { Order, type IOrder, type OrderStatus, type PaymentStatus } from "../../../../models/Order.ts";
import { Customer } from "../../../../models/Customer.ts";

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
  const status = searchParams.get("status")?.trim();
  const paymentStatus = searchParams.get("paymentStatus")?.trim();
  const datePreset = searchParams.get("datePreset")?.trim();
  const startDateStr = searchParams.get("startDate")?.trim();
  const endDateStr = searchParams.get("endDate")?.trim();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "15", 10)),
  );
  const skip = (page - 1) * limit;

  const query: mongoose.FilterQuery<IOrder> = {};

  // Status Filter
  if (status && status !== "ALL") {
    query.status = status as OrderStatus;
  }

  // Payment Status Filter
  if (paymentStatus && paymentStatus !== "ALL") {
    query.paymentStatus = paymentStatus as PaymentStatus;
  }

  // Date Filter
  if (datePreset) {
    const now = new Date();
    if (datePreset === "TODAY") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      query.createdAt = { $gte: startOfDay };
    } else if (datePreset === "7D") {
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      query.createdAt = { $gte: past7 };
    } else if (datePreset === "30D") {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      query.createdAt = { $gte: past30 };
    }
  } else if (startDateStr || endDateStr) {
    const dateQuery: { $gte?: Date; $lte?: Date } = {};
    if (startDateStr) {
      dateQuery.$gte = new Date(startDateStr);
    }
    if (endDateStr) {
      const end = new Date(endDateStr);
      end.setHours(23, 59, 59, 999);
      dateQuery.$lte = end;
    }
    query.createdAt = dateQuery;
  }

  // Search Filter: Order number, or search customer name/phone/email
  if (search) {
    const matchingCustomers = await Customer.find({
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ],
    })
      .select("_id")
      .lean();

    const customerIds = matchingCustomers.map((c) => c._id);

    query.$or = [
      { orderNumber: { $regex: search, $options: "i" } },
      { "shippingAddress.name": { $regex: search, $options: "i" } },
      { "shippingAddress.phone": { $regex: search, $options: "i" } },
      { customerId: { $in: customerIds } },
    ];
  }

  const [orders, totalCount, statusCounts] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("customerId", "name email phone")
      .lean(),
    Order.countDocuments(query),
    Promise.all([
      Order.countDocuments({ status: "PENDING" }),
      Order.countDocuments({ status: "PAID" }),
      Order.countDocuments({ status: "PACKED" }),
      Order.countDocuments({ status: "SHIPPED" }),
      Order.countDocuments({ status: "DELIVERED" }),
      Order.countDocuments({ status: "CANCELLED" }),
      Order.countDocuments({ status: "RETURNED" }),
    ]),
  ]);

  const [pending, paid, packed, shipped, delivered, cancelled, returned] = statusCounts;

  return NextResponse.json({
    orders,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit) || 1,
    summary: {
      pending,
      paid,
      packed,
      shipped,
      delivered,
      cancelled,
      returned,
    },
  });
}

