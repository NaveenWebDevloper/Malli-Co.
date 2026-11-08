"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/currency";

interface Address {
  _id?: string;
  name: string;
  phone: string;
  street: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

interface CustomerOrder {
  _id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalPaise: number;
  itemCount: number;
  createdAt: string;
}

interface CustomerDetails {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: "CUSTOMER" | "ADMIN";
  addresses: Address[];
  createdAt: string;
  updatedAt: string;
  totalOrders: number;
  totalSpendPaise: number;
  orders: CustomerOrder[];
}

interface CustomerDetailDrawerProps {
  customerId: string | null;
  onClose: () => void;
  onRoleChanged?: () => void;
}

export function CustomerDetailDrawer({
  customerId,
  onClose,
  onRoleChanged,
}: CustomerDetailDrawerProps) {
  const [customer, setCustomer] = useState<CustomerDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const fetchCustomerDetails = useCallback(async () => {
    if (!customerId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to load customer details");
      }
      const data = await res.json();
      setCustomer(data.customer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching details");
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchCustomerDetails();
  }, [fetchCustomerDetails]);

  const handleToggleRole = async () => {
    if (!customer) return;
    const newRole = customer.role === "ADMIN" ? "CUSTOMER" : "ADMIN";
    const confirmMsg =
      newRole === "ADMIN"
        ? `Grant full administrative privileges to ${customer.name}?`
        : `Demote ${customer.name} from ADMIN to standard CUSTOMER?`;

    if (!window.confirm(confirmMsg)) return;

    setIsUpdatingRole(true);
    try {
      const res = await fetch(`/api/admin/customers/${customer._id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to update role");
      }
      setCustomer((prev) => (prev ? { ...prev, role: newRole } : null));
      onRoleChanged?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setIsUpdatingRole(false);
    }
  };

  if (!customerId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity">
      <div className="relative flex h-full w-full max-w-xl flex-col border-l border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-sm font-bold text-white uppercase dark:bg-neutral-100 dark:text-neutral-900">
              {customer?.name ? customer.name.slice(0, 2) : "👥"}
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                {customer?.name || "Customer Profile"}
              </h2>
              <span className="text-xs text-neutral-500">
                {customer?.email || "Loading..."}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {isLoading ? (
            <div className="py-20 text-center text-neutral-400">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-neutral-400 border-t-neutral-900 dark:border-neutral-600 dark:border-t-white" />
              <p className="mt-2 text-xs">Loading customer details...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
              ⚠️ {error}
            </div>
          ) : customer ? (
            <>
              {/* Profile Card & Role Switcher */}
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4 dark:border-neutral-800 dark:bg-neutral-800/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-600 dark:text-neutral-300">
                      Account Role:
                    </span>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        customer.role === "ADMIN"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300"
                          : "bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-200"
                      }`}
                    >
                      {customer.role}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isUpdatingRole}
                    onClick={handleToggleRole}
                    className="rounded-xl border border-neutral-300 bg-white px-3 py-1 text-[11px] font-semibold text-neutral-700 shadow-xs hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                  >
                    {isUpdatingRole
                      ? "Updating..."
                      : customer.role === "ADMIN"
                        ? "Demote to Customer"
                        : "Promote to Admin"}
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-neutral-600 dark:text-neutral-400">
                  <div>
                    <strong>Phone:</strong> {customer.phone || "Not provided"}
                  </div>
                  <div>
                    <strong>Member Since:</strong>{" "}
                    {new Date(customer.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>

              {/* Financial Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
                  <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                    Total Orders
                  </span>
                  <div className="mt-1 text-xl font-bold text-neutral-900 dark:text-neutral-100">
                    {customer.totalOrders}
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
                  <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                    Paid Lifetime Spend
                  </span>
                  <div className="mt-1 text-xl font-bold text-neutral-900 dark:text-neutral-100">
                    {formatCurrency(customer.totalSpendPaise)}
                  </div>
                </div>
              </div>

              {/* Saved Shipping Addresses */}
              <div>
                <h3 className="font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                  Saved Delivery Addresses ({customer.addresses.length})
                </h3>
                {customer.addresses.length === 0 ? (
                  <p className="text-neutral-400 text-xs italic">
                    No delivery addresses on record.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {customer.addresses.map((addr, idx) => (
                      <div
                        key={addr._id || idx}
                        className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-3 text-[11px] text-neutral-700 dark:border-neutral-800 dark:bg-neutral-800/30 dark:text-neutral-300"
                      >
                        <div className="flex items-center justify-between font-semibold text-neutral-900 dark:text-neutral-100">
                          <span>{addr.name}</span>
                          {addr.isDefault && (
                            <span className="rounded-md bg-neutral-200 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-neutral-600 dark:text-neutral-400">
                          {addr.street}
                          {addr.landmark ? `, ${addr.landmark}` : ""},{" "}
                          {addr.city}, {addr.state} - {addr.postalCode},{" "}
                          {addr.country}
                        </div>
                        <div className="mt-0.5 text-neutral-500">
                          📞 {addr.phone}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Orders History */}
              <div>
                <h3 className="font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                  Recent Orders History ({customer.orders.length})
                </h3>
                {customer.orders.length === 0 ? (
                  <p className="text-neutral-400 text-xs italic">
                    No orders placed yet.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <table className="w-full text-left text-[11px]">
                      <thead className="border-b border-neutral-200 bg-neutral-50 text-[10px] font-semibold uppercase text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/50">
                        <tr>
                          <th className="px-3 py-2">Order #</th>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                        {customer.orders.map((order) => (
                          <tr
                            key={order._id}
                            className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition"
                          >
                            <td className="px-3 py-2 font-mono font-semibold">
                              <Link
                                href={`/admin/orders/${order._id}`}
                                className="text-neutral-900 hover:underline dark:text-neutral-100"
                              >
                                {order.orderNumber}
                              </Link>
                            </td>
                            <td className="px-3 py-2 text-neutral-500">
                              {new Date(order.createdAt).toLocaleDateString(
                                "en-IN",
                                { day: "numeric", month: "short" },
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                  order.status === "DELIVERED"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    : order.status === "CONFIRMED"
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                      : order.status === "CANCELLED"
                                        ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                                        : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                }`}
                              >
                                {order.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-neutral-900 dark:text-neutral-100">
                              {formatCurrency(order.totalPaise)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

