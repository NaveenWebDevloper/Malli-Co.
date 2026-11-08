"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatCurrency } from "@/lib/currency";
import { IconInvoice } from "@/components/admin/AdminIcons";
import {
  getAllowedNextStatuses,
  type OrderStatus,
} from "@/lib/order-transitions";

interface OrderDetail {
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
    variantId: string;
    productId: string;
    nameSnapshot: string;
    skuSnapshot: string;
    basePricePaise?: number;
    compareAtPricePaise?: number;
    finalPricePaise?: number;
    discountAmountPaise?: number;
    campaignId?: string;
    campaignName?: string;
    priceSnapshotPaise: number;
    qty: number;
    imageSnapshot?: string;
    optionsSnapshot?: Record<string, string>;
  }[];
  status: OrderStatus;
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  paymentDetails?: {
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
  };
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
    landmark?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  timeline?: {
    status: OrderStatus;
    note?: string;
    performedBy?: string;
    timestamp: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export function OrderDetailView({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transition form
  const [targetStatus, setTargetStatus] = useState<OrderStatus | "">("");
  const [transitionNote, setTransitionNote] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchOrderDetail = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Order not found");
      }
      const data = await res.json();
      setOrder(data.order);
      const allowed = getAllowedNextStatuses(data.order.status);
      setTargetStatus(allowed.length > 0 ? allowed[0] : "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading order");
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrderDetail();
  }, [fetchOrderDetail]);

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !targetStatus) return;

    setIsUpdating(true);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/admin/orders/${order._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          note: transitionNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update status");
      }

      setActionMessage({
        type: "success",
        text: `Order status transitioned to ${targetStatus}${
          data.restocked ? ` and restocked ${data.restockedCount} units to inventory.` : "."
        }`,
      });
      setTransitionNote("");
      fetchOrderDetail();
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to change order status",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-neutral-400">
        <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin mb-3" />
        <p className="text-sm">Loading order details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
        <p className="font-semibold">{error || "Order not found"}</p>
        <Link
          href="/admin/orders"
          className="mt-4 inline-block text-xs font-semibold underline"
        >
          ← Return to Orders
        </Link>
      </div>
    );
  }

  const allowedStatuses = getAllowedNextStatuses(order.status);
  const willRestock = targetStatus === "CANCELLED" || targetStatus === "RETURNED";
  const totalUnits = order.items.reduce((acc, it) => acc + it.qty, 0);

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "PENDING":
        return "bg-neutral-100 text-neutral-700 border-neutral-300";
      case "PAID":
      case "CONFIRMED":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "PACKED":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "SHIPPED":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "DELIVERED":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "CANCELLED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "RETURNED":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-neutral-100 text-neutral-700 border-neutral-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/orders"
              className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
            >
              ← Back to Orders
            </Link>
            <span className="text-neutral-300">/</span>
            <span className="font-mono text-xs font-bold text-neutral-400">
              #{order.orderNumber}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Order #{order.orderNumber}
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${getStatusBadge(
                order.status,
              )}`}
            >
              {order.status}
            </span>
            <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
              Payment: {order.paymentStatus}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Placed on{" "}
            {new Date(order.createdAt).toLocaleString("en-IN", {
              dateStyle: "full",
              timeStyle: "medium",
            })}
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/orders/${order._id}/invoice`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 shadow-sm transition-colors"
          >
            <IconInvoice className="w-4 h-4 text-neutral-500" />
            <span>Printable GST Invoice</span>
          </Link>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-medium border ${
            actionMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {/* Status Transition Control Panel */}
      <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
          Lifecycle & Status Transition (Rule 3 Invariant)
        </h3>

        {allowedStatuses.length === 0 ? (
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 text-xs text-neutral-500">
            This order has reached its terminal status (<strong className="text-neutral-800 dark:text-neutral-200">{order.status}</strong>). No further state transitions are permitted.
          </div>
        ) : (
          <form onSubmit={handleStatusChange} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Target Status
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as OrderStatus)}
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-900 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  required
                >
                  {allowedStatuses.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Transition Audit Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Courier airway bill tracking # or cancellation reason"
                  value={transitionNote}
                  onChange={(e) => setTransitionNote(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>
            </div>

            {/* Restock Warning Banner */}
            {willRestock && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300 flex items-start gap-2">
                <span>⚠️</span>
                <span>
                  <strong>Automatic Restock Notice:</strong> Transitioning this order to{" "}
                  <strong>{targetStatus}</strong> will automatically restock{" "}
                  <strong>{totalUnits} units</strong> back to variant inventory and insert{" "}
                  {order.items.length} audit entry(ies) in <code>inventorymovements</code> within a Mongoose transaction.
                </span>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isUpdating || !targetStatus}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 disabled:opacity-50"
              >
                {isUpdating ? "Applying Transition..." : `Update Status to ${targetStatus}`}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Order Items & Totals (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items Card */}
          <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="border-b border-neutral-200 bg-neutral-50/75 px-5 py-3.5 dark:border-neutral-800 dark:bg-neutral-800/50">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Order Line Items ({order.items.length})
              </h2>
            </div>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 p-4 text-xs">
                  <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800">
                    {item.imageSnapshot ? (
                      <Image
                        src={item.imageSnapshot}
                        alt={item.nameSnapshot}
                        width={56}
                        height={56}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-400">
                        IMG
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-neutral-800 dark:text-neutral-200 truncate text-sm">
                      {item.nameSnapshot}
                    </p>
                    <p className="font-mono text-[11px] text-neutral-500 mt-0.5">
                      SKU: {item.skuSnapshot}
                    </p>
                    {item.campaignName && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                        {item.campaignName}
                      </span>
                    )}
                    {item.optionsSnapshot &&
                      Object.keys(item.optionsSnapshot).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(item.optionsSnapshot).map(([k, val]) => (
                            <span
                              key={k}
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                            >
                              {k}: {val}
                            </span>
                          ))}
                        </div>
                      )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {formatCurrency((item.finalPricePaise ?? item.priceSnapshotPaise) * item.qty)}
                    </p>
                    <div className="text-[11px] text-neutral-400 mt-0.5 space-x-1">
                      {item.discountAmountPaise && item.discountAmountPaise > 0 ? (
                        <>
                          <span className="line-through text-neutral-400">
                            {formatCurrency(item.basePricePaise || item.priceSnapshotPaise)}
                          </span>
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(item.finalPricePaise || item.priceSnapshotPaise)}
                          </span>
                          <span>× {item.qty}</span>
                          <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            Saved {formatCurrency(item.discountAmountPaise * item.qty)}
                          </span>
                        </>
                      ) : (
                        <span>
                          {formatCurrency(item.finalPricePaise ?? item.priceSnapshotPaise)} × {item.qty}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals Breakdown */}
            <div className="border-t border-neutral-200 bg-neutral-50/50 p-5 dark:border-neutral-800 dark:bg-neutral-800/30 text-xs space-y-2">
              <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                <span>Items Subtotal</span>
                <span>{formatCurrency(order.totals.subtotalPaise)}</span>
              </div>
              {order.totals.discountPaise > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount Applied</span>
                  <span>-{formatCurrency(order.totals.discountPaise)}</span>
                </div>
              )}
              <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                <span>Shipping Charges</span>
                <span>
                  {order.totals.shippingPaise === 0
                    ? "FREE"
                    : formatCurrency(order.totals.shippingPaise)}
                </span>
              </div>
              <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                <span>GST Tax (Included/Calculated)</span>
                <span>{formatCurrency(order.totals.taxPaise)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-neutral-900 dark:text-neutral-100 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                <span>Total Amount Paid / Payable</span>
                <span>{formatCurrency(order.totals.totalPaise)}</span>
              </div>
            </div>
          </div>

          {/* Timeline / Audit Trail Card */}
          <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-4">
              Order Lifecycle Timeline
            </h2>

            {order.timeline && order.timeline.length > 0 ? (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200 dark:before:bg-neutral-800">
                {order.timeline.map((entry, idx) => (
                  <div key={idx} className="relative text-xs">
                    <span className="absolute -left-6 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-neutral-900 dark:border-neutral-900 dark:bg-neutral-100" />
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded font-semibold text-[10px] uppercase border ${getStatusBadge(
                          entry.status,
                        )}`}
                      >
                        {entry.status}
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        by {entry.performedBy || "System"} •{" "}
                        {new Date(entry.timestamp).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    {entry.note && (
                      <p className="mt-1 text-neutral-600 dark:text-neutral-400 italic">
                        &quot;{entry.note}&quot;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-400">
                Initial state recorded at order creation time.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Customer, Shipping, & Payment Cards */}
        <div className="space-y-6">
          {/* Customer Card */}
          <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 text-xs space-y-3">
            <h2 className="font-bold uppercase tracking-wider text-neutral-400 text-[10px]">
              Customer Information
            </h2>
            <div>
              <p className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
                {order.customerId?.name || order.shippingAddress?.name}
              </p>
              <p className="text-neutral-500 mt-0.5">
                {order.customerId?.email}
              </p>
              <p className="text-neutral-500 mt-0.5">
                {order.shippingAddress?.phone || order.customerId?.phone || "No phone provided"}
              </p>
            </div>
          </div>

          {/* Shipping Address Card */}
          <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 text-xs space-y-2">
            <h2 className="font-bold uppercase tracking-wider text-neutral-400 text-[10px]">
              Shipping Address
            </h2>
            <div className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
              <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                {order.shippingAddress?.name}
              </p>
              <p>{order.shippingAddress?.street}</p>
              {order.shippingAddress?.landmark && (
                <p className="text-neutral-500">Near: {order.shippingAddress.landmark}</p>
              )}
              <p>
                {order.shippingAddress?.city}, {order.shippingAddress?.state} -{" "}
                {order.shippingAddress?.postalCode}
              </p>
              <p className="text-neutral-500">{order.shippingAddress?.country || "India"}</p>
              <p className="pt-1 font-medium text-neutral-900 dark:text-neutral-100">
                Phone: {order.shippingAddress?.phone}
              </p>
            </div>
          </div>

          {/* Payment Details Card */}
          <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 text-xs space-y-2">
            <h2 className="font-bold uppercase tracking-wider text-neutral-400 text-[10px]">
              Payment Details
            </h2>
            <div className="space-y-1.5 text-neutral-600 dark:text-neutral-400">
              <div className="flex justify-between">
                <span>Method</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  Razorpay Payment Gateway
                </span>
              </div>
              <div className="flex justify-between">
                <span>Status</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  {order.paymentStatus}
                </span>
              </div>
              {order.paymentDetails?.razorpayPaymentId && (
                <div className="flex justify-between">
                  <span>Payment ID</span>
                  <span className="font-mono text-[11px] text-neutral-800 dark:text-neutral-200">
                    {order.paymentDetails.razorpayPaymentId}
                  </span>
                </div>
              )}
              {order.paymentDetails?.razorpayOrderId && (
                <div className="flex justify-between">
                  <span>Razorpay Order ID</span>
                  <span className="font-mono text-[11px] text-neutral-800 dark:text-neutral-200">
                    {order.paymentDetails.razorpayOrderId}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

