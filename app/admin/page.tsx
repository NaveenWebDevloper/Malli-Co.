import Link from "next/link";
import { connectDB } from "@/lib/db";
import { Order, type IOrder } from "@/models/Order";
import { Product } from "@/models/Product";
import { Variant } from "@/models/Variant";
import { Brand } from "@/models/Brand";
import { formatCurrency } from "@/lib/currency";
import {
  IconRevenue,
  IconOrders,
  IconProducts,
  IconAlert,
  IconInventory,
  IconSales,
} from "@/components/admin/AdminIcons";

export const dynamic = "force-dynamic";

function formatRelativeTime(dateInput: Date | string): string {
  const date = new Date(dateInput);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "PAID":
    case "DELIVERED":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900/60";
    case "CONFIRMED":
      return "bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/60";
    case "PROCESSING":
    case "PACKED":
      return "bg-indigo-50 text-indigo-700 border border-indigo-200/60 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-900/60";
    case "SHIPPED":
      return "bg-purple-50 text-purple-700 border border-purple-200/60 dark:bg-purple-950/50 dark:text-purple-400 dark:border-purple-900/60";
    case "PENDING":
      return "bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900/60";
    case "CANCELLED":
    case "FAILED":
      return "bg-red-50 text-red-700 border border-red-200/60 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900/60";
    default:
      return "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";
  }
}

export default async function AdminDashboardPage() {
  await connectDB();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    revenueAgg,
    totalOrders,
    todayOrders,
    activeProducts,
    activeBrandsCount,
    lowStockAlerts,
    recentOrders,
  ] = await Promise.all([
    Order.aggregate([
      { $match: { paymentStatus: "PAID" } },
      { $group: { _id: null, totalPaise: { $sum: "$totals.totalPaise" } } },
    ]),
    Order.countDocuments({}),
    Order.countDocuments({ createdAt: { $gte: startOfToday } }),
    Product.countDocuments({ deletedAt: null, status: "ACTIVE" }),
    Brand.countDocuments({ isActive: true }),
    Variant.countDocuments({
      deletedAt: null,
      status: "ACTIVE",
      stock: { $lte: 5 },
    }),
    Order.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ]);

  const totalRevenuePaise = revenueAgg[0]?.totalPaise || 0;

  const metrics = [
    {
      title: "Total Revenue",
      value: formatCurrency(totalRevenuePaise),
      change: `${totalOrders} orders processed`,
      isPositive: true,
      icon: IconRevenue,
    },
    {
      title: "Total Orders",
      value: totalOrders.toString(),
      change:
        todayOrders > 0
          ? `+${todayOrders} order${todayOrders === 1 ? "" : "s"} today`
          : "0 orders today",
      isPositive: todayOrders > 0,
      icon: IconOrders,
    },
    {
      title: "Active Products",
      value: activeProducts.toString(),
      change: `${activeBrandsCount} Brands • Men & Kids`,
      isPositive: true,
      icon: IconProducts,
    },
    {
      title: "Low Stock Alerts",
      value: lowStockAlerts.toString(),
      change:
        lowStockAlerts > 0
          ? "Variants below 5 units"
          : "All variant stocks healthy",
      isPositive: lowStockAlerts === 0,
      icon: IconAlert,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Executive Dashboard
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Real-time operations, sales metrics, and catalog inventory overview
          for Malli &amp; Co.
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.title}
              className="relative overflow-hidden rounded-xl border border-neutral-200 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  {metric.title}
                </span>
                <span className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                  <Icon className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                  {metric.value}
                </div>
                <p
                  className={`mt-1 text-xs font-medium ${
                    metric.isPositive
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {metric.change}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions & Recent Orders Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Orders Card (2 Columns) */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-xs lg:col-span-2 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4 dark:border-neutral-800">
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Recent Orders
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Latest customer purchases processed via Razorpay
              </p>
            </div>
            <Link
              href="/admin/orders"
              className="text-xs font-semibold text-neutral-900 hover:underline dark:text-neutral-100"
            >
              View All Orders →
            </Link>
          </div>

          <div className="mt-4 overflow-x-auto">
            {recentOrders.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-500">
                <span className="text-2xl block mb-2">📦</span>
                <p className="font-semibold text-neutral-700 dark:text-neutral-300">
                  No orders placed yet
                </p>
                <p className="text-neutral-400 mt-1">
                  Customer purchases will appear here in real time as soon as orders are placed.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs min-w-[560px]">
                <thead>
                  <tr className="border-b border-neutral-100 text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                    <th className="pb-3 font-medium">Order Number</th>
                    <th className="pb-3 font-medium">Customer</th>
                    <th className="pb-3 font-medium">Items</th>
                    <th className="pb-3 font-medium">Total</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {recentOrders.map((order: unknown) => {
                    const o = order as IOrder & { _id: { toString(): string } };
                    const firstItem = o.items?.[0];
                    const itemsSummary =
                      o.items && o.items.length > 1
                        ? `${firstItem?.qty || 1}x ${firstItem?.nameSnapshot || "Item"} + ${o.items.length - 1} more`
                        : `${firstItem?.qty || 1}x ${firstItem?.nameSnapshot || "Item"}`;

                    const customerName =
                      o.shippingAddress?.name || "Customer";

                    return (
                      <tr
                        key={o._id.toString()}
                        className="transition hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50"
                      >
                        <td className="py-3 font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                          <Link
                            href={`/admin/orders/${o._id.toString()}`}
                            className="hover:underline hover:text-[#8C7A58]"
                          >
                            {o.orderNumber}
                          </Link>
                        </td>
                        <td className="py-3 text-neutral-700 dark:text-neutral-300">
                          {customerName}
                        </td>
                        <td className="py-3 text-neutral-600 dark:text-neutral-400 truncate max-w-[200px]" title={itemsSummary}>
                          {itemsSummary}
                        </td>
                        <td className="py-3 font-semibold text-neutral-900 dark:text-neutral-100">
                          {formatCurrency(o.totals?.totalPaise || 0)}
                        </td>
                        <td className="py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${getStatusBadgeClass(
                              o.status
                            )}`}
                          >
                            {o.status}
                          </span>
                        </td>
                        <td className="py-3 text-neutral-500 dark:text-neutral-400">
                          {formatRelativeTime(o.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Quick Actions & System Status (1 Column) */}
        <div className="space-y-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Quick Management
            </h2>
            <div className="mt-4 space-y-2.5">
              <Link
                href="/admin/products"
                className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 text-xs font-medium text-neutral-800 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                <span className="flex items-center gap-2.5">
                  <IconProducts className="w-4 h-4 text-neutral-500" />
                  <span>Add New Product</span>
                </span>
                <span className="text-neutral-400">→</span>
              </Link>
              <Link
                href="/admin/inventory"
                className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 text-xs font-medium text-neutral-800 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                <span className="flex items-center gap-2.5">
                  <IconInventory className="w-4 h-4 text-neutral-500" />
                  <span>Audit Inventory Movements</span>
                </span>
                <span className="text-neutral-400">→</span>
              </Link>
              <Link
                href="/admin/orders"
                className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 text-xs font-medium text-neutral-800 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                <span className="flex items-center gap-2.5">
                  <IconOrders className="w-4 h-4 text-neutral-500" />
                  <span>Review Pending Orders</span>
                </span>
                <span className="text-neutral-400">→</span>
              </Link>
              <Link
                href="/admin/categories"
                className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 text-xs font-medium text-neutral-800 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                <span className="flex items-center gap-2.5">
                  <IconSales className="w-4 h-4 text-neutral-500" />
                  <span>Men &amp; Kids Taxonomies</span>
                </span>
                <span className="text-neutral-400">→</span>
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              System Health
            </h2>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Database Connection</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  ● Connected
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Auth Session Provider</span>
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Auth.js (JWT)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Webhook Processing</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  ● Idempotent
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
