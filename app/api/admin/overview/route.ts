import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { Variant } from "@/models/Variant";
import { Brand } from "@/models/Brand";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();

  // Re-verify session and role in route handler (Rule 7)
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized: Authentication required" },
      { status: 401 },
    );
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Admin role required" },
      { status: 403 },
    );
  }

  await connectDB();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    revenueAgg,
    totalOrders,
    todayOrders,
    activeProducts,
    lowStockAlerts,
    activeBrandsCount,
  ] = await Promise.all([
    Order.aggregate([
      { $match: { paymentStatus: "PAID" } },
      { $group: { _id: null, totalPaise: { $sum: "$totals.totalPaise" } } },
    ]),
    Order.countDocuments({}),
    Order.countDocuments({ createdAt: { $gte: startOfToday } }),
    Product.countDocuments({ deletedAt: null, status: "ACTIVE" }),
    Variant.countDocuments({
      deletedAt: null,
      status: "ACTIVE",
      stock: { $lte: 5 },
    }),
    Brand.countDocuments({ isActive: true }),
  ]);

  const totalRevenuePaise = revenueAgg[0]?.totalPaise || 0;

  return NextResponse.json({
    status: "ok",
    data: {
      metrics: {
        totalRevenuePaise,
        totalOrders,
        todayOrders,
        activeProducts,
        lowStockAlerts,
        activeBrandsCount,
      },
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
      },
    },
  });
}
