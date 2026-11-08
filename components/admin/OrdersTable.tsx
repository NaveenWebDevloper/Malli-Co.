"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatCurrency } from "@/lib/currency";
import { IconSearch, IconInvoice } from "@/components/admin/AdminIcons";

export interface OrderListItem {
  _id: string;
  orderNumber: string;
  customerId: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  items: {
    _id: string;
    nameSnapshot: string;
    skuSnapshot: string;
    priceSnapshotPaise: number;
    qty: number;
    imageSnapshot?: string;
    optionsSnapshot?: Record<string, string>;
  }[];
  status: "PENDING" | "PAID" | "CONFIRMED" | "PACKED" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "RETURNED";
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  totals: {
    subtotalPaise: number;
    discountPaise: number;
    shippingPaise: number;
    taxPaise: number;
    totalPaise: number;
  };
  shippingAddress: {
    name: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
  };
  createdAt: string;
}

interface OrdersResponse {
  orders: OrderListItem[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: {
    pending: number;
    paid: number;
    packed: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    returned: number;
  };
}

export function OrdersTable() {
  const [data, setData] = useState<OrdersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [paymentStatus, setPaymentStatus] = useState("ALL");
  const [datePreset, setDatePreset] = useState("ALL");
  const [page, setPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (status !== "ALL") params.set("status", status);
      if (paymentStatus !== "ALL") params.set("paymentStatus", paymentStatus);
      if (datePreset !== "ALL") params.set("datePreset", datePreset);

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to load orders");
      }
      const json: OrdersResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching orders");
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, status, paymentStatus, datePreset]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const getStatusBadge = (orderStatus: string) => {
    switch (orderStatus) {
      case "PENDING":
        return "bg-neutral-100 text-neutral-700 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700";
      case "PAID":
      case "CONFIRMED":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800";
      case "PACKED":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800";
      case "SHIPPED":
        return "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800";
      case "DELIVERED":
        return "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
      case "CANCELLED":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900";
      case "RETURNED":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800";
      default:
        return "bg-neutral-100 text-neutral-700 border-neutral-200";
    }
  };

  const getPaymentStatusBadge = (pStatus: string) => {
    switch (pStatus) {
      case "PAID":
        return "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400";
      case "PENDING":
        return "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400";
      case "FAILED":
        return "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/30 dark:text-red-400";
      case "REFUNDED":
        return "text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400";
      default:
        return "text-neutral-600 bg-neutral-100";
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Summary Strip */}
      {data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <div className="p-3.5 rounded-xl border border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900 shadow-sm">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Pending</span>
            <p className="text-xl font-bold text-neutral-800 dark:text-neutral-100 mt-0.5">{data.summary.pending}</p>
          </div>
          <div className="p-3.5 rounded-xl border border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900 shadow-sm">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-500">Paid</span>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">{data.summary.paid}</p>
          </div>
          <div className="p-3.5 rounded-xl border border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900 shadow-sm">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500">Packed</span>
            <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{data.summary.packed}</p>
          </div>
          <div className="p-3.5 rounded-xl border border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900 shadow-sm">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-500">Shipped</span>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">{data.summary.shipped}</p>
          </div>
          <div className="p-3.5 rounded-xl border border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900 shadow-sm">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500">Delivered</span>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{data.summary.delivered}</p>
          </div>
          <div className="p-3.5 rounded-xl border border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900 shadow-sm">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-500">Cancelled</span>
            <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">{data.summary.cancelled}</p>
          </div>
          <div className="p-3.5 rounded-xl border border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900 shadow-sm">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-500">Returned</span>
            <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-0.5">{data.summary.returned}</p>
          </div>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by order #, customer name, phone, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 bg-white py-2 pl-9 pr-4 text-xs text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
            <span className="absolute left-3 top-2.5 text-neutral-400">
              <IconSearch className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* Filters Row */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Status Filter */}
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-800 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 font-medium"
            >
              <option value="ALL">All Order Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="PAID">PAID</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="PACKED">PACKED</option>
              <option value="SHIPPED">SHIPPED</option>
              <option value="DELIVERED">DELIVERED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="RETURNED">RETURNED</option>
            </select>

            {/* Payment Status Filter */}
            <select
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-800 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 font-medium"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="PAID">PAID</option>
              <option value="PENDING">PENDING</option>
              <option value="FAILED">FAILED</option>
              <option value="REFUNDED">REFUNDED</option>
            </select>

            {/* Date Preset Filter */}
            <select
              value={datePreset}
              onChange={(e) => {
                setDatePreset(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-800 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 font-medium"
            >
              <option value="ALL">All Dates</option>
              <option value="TODAY">Today</option>
              <option value="7D">Last 7 Days</option>
              <option value="30D">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 bg-neutral-50/75 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/50">
              <tr>
                <th className="px-5 py-3.5">Order #</th>
                <th className="px-4 py-3.5">Date & Time</th>
                <th className="px-4 py-3.5">Customer</th>
                <th className="px-4 py-3.5">Items</th>
                <th className="px-4 py-3.5">Total Amount</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Payment</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {isLoading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-400">
                    <div className="inline-block w-5 h-5 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin mb-2" />
                    <p>Loading orders ledger...</p>
                  </td>
                </tr>
              )}

              {error && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-red-500">
                    {error}
                  </td>
                </tr>
              )}

              {!isLoading && !error && data?.orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-400">
                    No orders found matching the filter criteria.
                  </td>
                </tr>
              )}

              {!isLoading &&
                !error &&
                data?.orders.map((order) => {
                  const itemCount = order.items.reduce((sum, item) => sum + item.qty, 0);

                  return (
                    <tr
                      key={order._id}
                      className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      {/* Order Number */}
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/orders/${order._id}`}
                          className="font-mono font-bold text-neutral-900 hover:underline dark:text-neutral-100"
                        >
                          #{order.orderNumber}
                        </Link>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-4 text-neutral-500 whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-4">
                        <div className="max-w-[180px]">
                          <p className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                            {order.shippingAddress?.name || order.customerId?.name || "Customer"}
                          </p>
                          <p className="text-[11px] text-neutral-400 truncate">
                            {order.shippingAddress?.phone || order.customerId?.phone || order.customerId?.email}
                          </p>
                        </div>
                      </td>

                      {/* Items */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2 overflow-hidden">
                            {order.items.slice(0, 3).map((it, idx) => (
                              <div
                                key={idx}
                                className="relative inline-block h-7 w-7 rounded-md border-2 border-white dark:border-neutral-900 bg-neutral-100 overflow-hidden"
                              >
                                {it.imageSnapshot ? (
                                  <Image
                                    src={it.imageSnapshot}
                                    alt={it.nameSnapshot}
                                    width={28}
                                    height={28}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-[9px] text-neutral-400">
                                    •
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          <span className="text-[11px] text-neutral-500 font-medium">
                            {itemCount} {itemCount === 1 ? "unit" : "units"}
                          </span>
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="px-4 py-4 font-semibold text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                        {formatCurrency(order.totals.totalPaise)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border uppercase ${getStatusBadge(
                            order.status,
                          )}`}
                        >
                          {order.status}
                        </span>
                      </td>

                      {/* Payment Status */}
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getPaymentStatusBadge(
                            order.paymentStatus,
                          )}`}
                        >
                          {order.paymentStatus}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/orders/${order._id}`}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 shadow-sm"
                          >
                            Details
                          </Link>
                          <Link
                            href={`/admin/orders/${order._id}/invoice`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-neutral-200 hover:bg-neutral-100 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
                            title="Print GST Invoice"
                          >
                            <IconInvoice className="w-3.5 h-3.5 text-neutral-500" />
                            <span>Invoice</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-3 text-xs text-neutral-500 dark:border-neutral-800">
            <div>
              Showing page <span className="font-semibold text-neutral-800 dark:text-neutral-200">{data.page}</span> of{" "}
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">{data.totalPages}</span> ({data.totalCount} total orders)
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 rounded-lg text-xs border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
                className="px-3 py-1 rounded-lg text-xs border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

