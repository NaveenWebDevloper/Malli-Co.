import Link from "next/link";
import {
  IconRevenue,
  IconOrders,
  IconProducts,
  IconAlert,
  IconInventory,
  IconSales,
} from "@/components/admin/AdminIcons";

export default function AdminDashboardPage() {
  const metrics = [
    {
      title: "Total Revenue",
      value: "₹1,24,500.00",
      rawPaise: "12450000 paise",
      change: "+14.2% from last month",
      isPositive: true,
      icon: IconRevenue,
    },
    {
      title: "Total Orders",
      value: "48",
      change: "+8 orders today",
      isPositive: true,
      icon: IconOrders,
    },
    {
      title: "Active Products",
      value: "26",
      change: "2 Brands • Men & Kids",
      isPositive: true,
      icon: IconProducts,
    },
    {
      title: "Low Stock Alerts",
      value: "3",
      change: "Variants below 5 units",
      isPositive: false,
      icon: IconAlert,
    },
  ];

  const recentOrders = [
    {
      id: "MC-20261103-0001",
      customer: "Vikram Malhotra",
      items: "2x Pure Linen Oxford Shirt",
      total: "₹4,998.00",
      status: "PAID",
      date: "Just now",
    },
    {
      id: "MC-20261103-0002",
      customer: "Ananya Sharma",
      items: "1x Pima Cotton Crewneck (Navy)",
      total: "₹1,299.00",
      status: "CONFIRMED",
      date: "25 mins ago",
    },
    {
      id: "MC-20261103-0003",
      customer: "Rahul Verma",
      items: "3x Kids Festive Kurtas",
      total: "₹5,397.00",
      status: "PROCESSING",
      date: "2 hours ago",
    },
    {
      id: "MC-20261102-0089",
      customer: "Karthik Reddy",
      items: "1x Pima Cotton Crewneck (Olive)",
      total: "₹1,299.00",
      status: "SHIPPED",
      date: "Yesterday",
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
          for Malli & Co.
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.title}
              className="relative overflow-hidden rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
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
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm lg:col-span-2 dark:border-neutral-800 dark:bg-neutral-900">
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
            <table className="w-full text-left text-xs">
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
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="transition hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50"
                  >
                    <td className="py-3 font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                      {order.id}
                    </td>
                    <td className="py-3 text-neutral-700 dark:text-neutral-300">
                      {order.customer}
                    </td>
                    <td className="py-3 text-neutral-600 dark:text-neutral-400">
                      {order.items}
                    </td>
                    <td className="py-3 font-semibold text-neutral-900 dark:text-neutral-100">
                      {order.total}
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 text-neutral-500 dark:text-neutral-400">
                      {order.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions & System Status (1 Column) */}
        <div className="space-y-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
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

          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
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
