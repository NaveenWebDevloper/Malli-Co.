"use client";

import { useEffect, useState, useCallback } from "react";
import { formatCurrency } from "@/lib/currency";
import { CustomerDetailDrawer } from "./CustomerDetailDrawer";

export interface CustomerRow {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: "CUSTOMER" | "ADMIN";
  addressCount: number;
  totalOrders: number;
  totalSpendPaise: number;
  createdAt: string;
  updatedAt?: string;
}

export function CustomersManager() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState({ totalCustomers: 0, totalAdmins: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const limit = 15;

  // Modals & Drawer
  const [detailCustomerId, setDetailCustomerId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerRow | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "CUSTOMER" as "CUSTOMER" | "ADMIN",
    password: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (roleFilter !== "ALL") params.set("role", roleFilter);

      const res = await fetch(`/api/admin/customers?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to load customers");
      }
      const data = await res.json();
      setCustomers(data.customers || []);
      setTotalCount(data.pagination?.total || 0);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching customers");
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, roleFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const notifySuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const openAddModal = () => {
    setEditingCustomer(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: "CUSTOMER",
      password: "",
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (c: CustomerRow) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      email: c.email,
      phone: c.phone || "",
      role: c.role,
      password: "",
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      const url = editingCustomer
        ? `/api/admin/customers/${editingCustomer._id}`
        : "/api/admin/customers";
      const method = editingCustomer ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          ...(formData.password ? { password: formData.password } : {}),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to save customer");
      }

      notifySuccess(json.message || "Customer saved successfully");
      setIsModalOpen(false);
      await fetchCustomers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/customers/${deleteTarget._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to delete customer");
      }
      notifySuccess(json.message || "Customer deleted successfully");
      setDeleteTarget(null);
      await fetchCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete customer");
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300">
          ✓ {successMessage}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800 dark:border-red-800/40 dark:bg-red-950/40 dark:text-red-300 flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-900 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Customer Accounts & Roles
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Client directory, addresses, financial spend, and role privilege delegation.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 shadow-sm transition-all"
        >
          <span>＋ Add Customer Account</span>
        </button>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            Total Accounts
          </span>
          <div className="mt-1 text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {summary.totalCustomers + summary.totalAdmins}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            Customers
          </span>
          <div className="mt-1 text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {summary.totalCustomers}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            Admins
          </span>
          <div className="mt-1 text-xl font-bold text-purple-700 dark:text-purple-400">
            {summary.totalAdmins}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            Current Filter Total
          </span>
          <div className="mt-1 text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {totalCount}
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 bg-neutral-50 py-2 pl-9 pr-4 text-xs text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
          <span className="absolute left-3 top-2.5 text-xs text-neutral-400">
            🔍
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Role Filter Tabs */}
          <div className="inline-flex rounded-xl border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-800 dark:bg-neutral-800">
            {["ALL", "CUSTOMER", "ADMIN"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setRoleFilter(r);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1 text-[11px] font-semibold transition ${
                  roleFilter === r
                    ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-100"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                }`}
              >
                {r === "ALL" ? "All Roles" : r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 bg-neutral-50/75 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400">
              <tr>
                <th className="px-5 py-3.5">Customer Name</th>
                <th className="px-5 py-3.5">Email & Contact</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5 text-center">Orders</th>
                <th className="px-5 py-3.5 text-right">Lifetime Spend</th>
                <th className="px-5 py-3.5">Joined Date</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-neutral-400 border-t-neutral-900 dark:border-neutral-600 dark:border-t-white" />
                    <p className="mt-2 text-xs">Loading customer directory...</p>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500">
                    No customer accounts found matching your query.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr
                    key={c._id}
                    className="transition hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-bold text-white uppercase dark:bg-neutral-700 dark:text-neutral-100">
                          {c.name.slice(0, 2)}
                        </div>
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {c.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-neutral-800 dark:text-neutral-200">
                        {c.email}
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        {c.phone || "No phone on record"}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          c.role === "ADMIN"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300"
                            : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                        }`}
                      >
                        {c.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          c.totalOrders > 0
                            ? "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
                            : "bg-neutral-50 text-neutral-400 dark:bg-neutral-900/50"
                        }`}
                      >
                        {c.totalOrders}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-neutral-900 dark:text-neutral-100">
                      {formatCurrency(c.totalSpendPaise)}
                    </td>
                    <td className="px-5 py-3.5 text-neutral-500 text-[11px]">
                      {new Date(c.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDetailCustomerId(c._id)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(c)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(c)}
                          className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-3 dark:border-neutral-800">
            <span className="text-xs text-neutral-500">
              Page {page} of {totalPages} ({totalCount} total accounts)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg text-xs font-semibold border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded-lg text-xs font-semibold border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Customer Detail Drawer */}
      <CustomerDetailDrawer
        customerId={detailCustomerId}
        onClose={() => setDetailCustomerId(null)}
        onRoleChanged={fetchCustomers}
      />

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-800">
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {editingCustomer ? `Edit Customer: ${editingCustomer.name}` : "Create Customer Account"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300">
                    Role Privilege <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        role: e.target.value as "CUSTOMER" | "ADMIN",
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  >
                    <option value="CUSTOMER">CUSTOMER (Standard)</option>
                    <option value="ADMIN">ADMIN (Full Console Access)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300">
                  {editingCustomer ? "Change Password (Leave blank to keep current)" : "Initial Password"}
                </label>
                <input
                  type="password"
                  placeholder={editingCustomer ? "••••••••" : "Minimum 8 characters"}
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-900 shadow-sm"
                >
                  {isSaving ? "Saving..." : editingCustomer ? "Update Account" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="text-sm font-bold text-red-600 dark:text-red-400">
              Confirm Account Deletion
            </h3>
            <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Are you sure you want to delete the account for{" "}
              <strong className="text-neutral-900 dark:text-neutral-100">
                {deleteTarget.name}
              </strong>{" "}
              ({deleteTarget.email})?
            </p>

            {deleteTarget.totalOrders > 0 ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300">
                ⚠️ <strong>Financial Record Guard:</strong> This customer has{" "}
                <strong>{deleteTarget.totalOrders}</strong> order(s) on record. Customer
                accounts with purchase transactions cannot be deleted to maintain GST and tax
                audit compliance.
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-neutral-400">
                This action is permanent and will remove the login credentials and address book.
              </p>
            )}

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting || deleteTarget.totalOrders > 0}
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
