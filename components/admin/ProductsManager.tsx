"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatCurrency } from "@/lib/currency";
import { ProductDeleteModal } from "./ProductDeleteModal";
import { PermanentDeleteModal } from "./PermanentDeleteModal";
import { ProductBulkBar } from "./ProductBulkBar";

export interface AdminProductItem {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  gender: "MEN" | "KIDS";
  type: "SIMPLE" | "VARIABLE";
  basePricePaise: number;
  status: "ACTIVE" | "DRAFT";
  deletedAt?: string | null;
  deleteReason?: string | null;
  images?: string[];
  brandId?: { _id: string; name: string; slug: string } | null;
  categoryId?: { _id: string; name: string; slug: string; gender?: string } | null;
  totalStock: number;
  skuCount: number;
  sampleSku?: string;
  orderCount?: number;
  canPermanentlyDelete?: boolean;
  daysUntilPurge?: number | null;
}

export interface ProductManagerCounts {
  active: number;
  draft: number;
  trash: number;
}

interface ProductsManagerProps {
  initialProducts: AdminProductItem[];
  initialCounts: ProductManagerCounts;
  brands: { _id: string; name: string; slug: string }[];
  categories: { _id: string; name: string; slug: string; gender?: string }[];
  initialPagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export function ProductsManager({
  initialProducts,
  initialCounts,
  brands,
  categories,
  initialPagination,
}: ProductsManagerProps) {
  const [view, setView] = useState<"active" | "draft" | "trash">("active");
  const [products, setProducts] = useState<AdminProductItem[]>(initialProducts);
  const [counts, setCounts] = useState<ProductManagerCounts>(initialCounts);
  const [pagination, setPagination] = useState(initialPagination);
  const [isLoading, setIsLoading] = useState(false);

  // Filter state
  const [search, setSearch] = useState("");
  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals state
  const [softDeleteTarget, setSoftDeleteTarget] = useState<AdminProductItem[] | null>(null);
  const [permDeleteTarget, setPermDeleteTarget] = useState<AdminProductItem[] | null>(null);
  const [isEmptyTrashAll, setIsEmptyTrashAll] = useState(false);

  // Undo Toast state
  const [undoToast, setUndoToast] = useState<{
    id: string;
    productName: string;
    expiresAt: number;
  } | null>(null);

  // Fetch products whenever view, page, search, or filters change
  const fetchProducts = useCallback(
    async (targetView = view, targetPage = 1) => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams({
          view: targetView,
          page: String(targetPage),
          limit: "10",
        });
        if (search) params.set("search", search);
        if (brandId) params.set("brandId", brandId);
        if (categoryId) params.set("categoryId", categoryId);

        const res = await fetch(`/api/admin/products?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load products");
        const data = await res.json();

        setProducts(data.products || []);
        if (data.counts) setCounts(data.counts);
        if (data.pagination) setPagination(data.pagination);
        setSelectedIds(new Set());
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [view, search, brandId, categoryId]
  );

  // Handle Tab Switch
  const handleTabChange = (newView: "active" | "draft" | "trash") => {
    setView(newView);
    setSelectedIds(new Set());
    fetchProducts(newView, 1);
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p._id)));
    }
  };

  // 1. Soft Delete Single or Bulk
  const handleConfirmSoftDelete = async (reason: string) => {
    if (!softDeleteTarget || softDeleteTarget.length === 0) return;

    if (softDeleteTarget.length === 1) {
      const p = softDeleteTarget[0];
      const res = await fetch(`/api/admin/products/${p._id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to move product to Trash");
      }

      // Trigger 10-second Undo toast
      setUndoToast({
        id: p._id,
        productName: p.name,
        expiresAt: Date.now() + 10000,
      });
    } else {
      // Bulk soft delete
      const res = await fetch("/api/admin/products/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: softDeleteTarget.map((p) => p._id),
          reason,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to move products to Trash");
      }
    }

    setSoftDeleteTarget(null);
    fetchProducts(view, pagination.page);
  };

  // 2. Undo Soft Delete
  const handleUndo = async () => {
    if (!undoToast) return;
    try {
      const res = await fetch(`/api/admin/products/${undoToast.id}/restore`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to restore product");
        return;
      }
      setUndoToast(null);
      fetchProducts(view, pagination.page);
    } catch (err) {
      console.error("Undo error:", err);
    }
  };

  // 3. Restore Single
  const handleRestoreSingle = async (p: AdminProductItem) => {
    try {
      const res = await fetch(`/api/admin/products/${p._id}/restore`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to restore product");
        return;
      }
      fetchProducts(view, pagination.page);
    } catch (err) {
      console.error("Restore error:", err);
    }
  };

  // 4. Restore Bulk
  const handleRestoreBulk = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      const res = await fetch("/api/admin/products/bulk-restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to restore products");
        return;
      }
      fetchProducts(view, pagination.page);
    } catch (err) {
      console.error("Bulk restore error:", err);
    }
  };

  // 5. Permanent Delete Single or Bulk
  const handleConfirmPermanentDelete = async () => {
    if (!permDeleteTarget || permDeleteTarget.length === 0) return;

    if (permDeleteTarget.length === 1 && !isEmptyTrashAll) {
      const p = permDeleteTarget[0];
      const res = await fetch(`/api/admin/products/${p._id}/permanent`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to permanently delete product");
      }
    } else {
      // Bulk or Empty Trash
      const ids = isEmptyTrashAll
        ? products.map((p) => p._id)
        : permDeleteTarget.map((p) => p._id);

      const res = await fetch("/api/admin/products/bulk-permanent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to permanently delete items");
      }
      if (data.skippedCount > 0) {
        alert(
          `Permanently deleted ${data.deletedCount} items. ${data.skippedCount} items were skipped because they have historical order records.`
        );
      }
    }

    setPermDeleteTarget(null);
    setIsEmptyTrashAll(false);
    fetchProducts(view, 1);
  };

  // Countdown timer for undo toast
  useEffect(() => {
    if (!undoToast) return;
    const interval = setInterval(() => {
      if (Date.now() >= undoToast.expiresAt) {
        setUndoToast(null);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [undoToast]);

  const selectedProducts = products.filter((p) => selectedIds.has(p._id));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Products & Inventory
          </h1>
          <p className="text-xs text-neutral-500">
            Manage product lifecycle, variants, soft-delete Trash, and catalog visibility.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {view === "trash" && counts.trash > 0 && (
            <button
              type="button"
              onClick={() => {
                setPermDeleteTarget(products);
                setIsEmptyTrashAll(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 shadow-xs transition hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400 cursor-pointer"
            >
              <span>🗑️</span>
              <span>Empty Trash</span>
            </button>
          )}

          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            <span>➕ Add Product</span>
          </Link>
        </div>
      </div>

      {/* Tabs / Segmented Control */}
      <div className="flex items-center gap-1.5 border-b border-neutral-200 dark:border-neutral-800 pb-px overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => handleTabChange("active")}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer whitespace-nowrap ${
            view === "active"
              ? "border-[#121212] text-[#121212] dark:border-white dark:text-white"
              : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
          }`}
        >
          <span>Active</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              view === "active"
                ? "bg-neutral-900 text-white dark:bg-white dark:text-black"
                : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
            }`}
          >
            {counts.active}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("draft")}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer whitespace-nowrap ${
            view === "draft"
              ? "border-[#121212] text-[#121212] dark:border-white dark:text-white"
              : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
          }`}
        >
          <span>Drafts</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              view === "draft"
                ? "bg-neutral-900 text-white dark:bg-white dark:text-black"
                : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
            }`}
          >
            {counts.draft}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("trash")}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer whitespace-nowrap ${
            view === "trash"
              ? "border-red-600 text-red-600 dark:border-red-400 dark:text-red-400"
              : "border-transparent text-neutral-500 hover:text-red-600 dark:hover:text-red-400"
          }`}
        >
          <span>🗑️ Trash</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              view === "trash"
                ? "bg-red-600 text-white dark:bg-red-500 dark:text-white"
                : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
            }`}
          >
            {counts.trash}
          </span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-xs sm:grid-cols-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="sm:col-span-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchProducts(view, 1)}
            placeholder="Search by product name, slug, description..."
            className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 shadow-2xs focus:border-black focus:ring-1 focus:ring-black dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>

        <div>
          <select
            value={brandId}
            onChange={(e) => {
              setBrandId(e.target.value);
            }}
            className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          >
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
            }}
            className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} {c.gender ? `(${c.gender})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fetchProducts(view, 1)}
            className="flex-1 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-black dark:bg-neutral-700 dark:hover:bg-neutral-600 cursor-pointer"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setBrandId("");
              setCategoryId("");
              fetchProducts(view, 1);
            }}
            className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 cursor-pointer"
            title="Reset Filters"
          >
            ↺
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500 uppercase tracking-wider dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-400">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={products.length > 0 && selectedIds.size === products.length}
                    onChange={toggleSelectAll}
                    aria-label="Select all products"
                    className="rounded border-neutral-300 text-black focus:ring-black cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4 font-semibold">Product</th>
                <th className="py-3 px-4 font-semibold">Classification</th>
                <th className="py-3 px-4 font-semibold">Base Price</th>
                {view === "trash" ? (
                  <>
                    <th className="py-3 px-4 font-semibold">Deleted Info</th>
                    <th className="py-3 px-4 font-semibold">Orders Guard</th>
                  </>
                ) : (
                  <>
                    <th className="py-3 px-4 font-semibold">Stock Status</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                  </>
                )}
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-neutral-400">
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-sm text-neutral-500">
                    {view === "trash" ? (
                      <div className="space-y-1">
                        <span className="text-2xl block">🗑️</span>
                        <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                          Trash is Empty
                        </span>
                        <p className="text-xs text-neutral-400">
                          No soft-deleted products currently in trash.
                        </p>
                      </div>
                    ) : (
                      "No products found matching your search filters."
                    )}
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isChecked = selectedIds.has(p._id);
                  const firstImg = p.images?.[0] || "/images/placeholder.jpg";
                  const brandName = p.brandId?.name || "—";
                  const categoryName = p.categoryId?.name || "—";

                  let stockBadgeClass =
                    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400";
                  let stockText = `In Stock (${p.totalStock})`;
                  if (p.totalStock === 0) {
                    stockBadgeClass =
                      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400";
                    stockText = "Out of Stock (0)";
                  } else if (p.totalStock <= 5) {
                    stockBadgeClass =
                      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400";
                    stockText = `Low Stock (${p.totalStock})`;
                  }

                  return (
                    <tr
                      key={p._id}
                      className={`transition ${
                        isChecked
                          ? "bg-amber-50/50 dark:bg-amber-950/20"
                          : "hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40"
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(p._id)}
                          aria-label={`Select product ${p.name}`}
                          className="rounded border-neutral-300 text-black focus:ring-black cursor-pointer"
                        />
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-10 flex-shrink-0 overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700">
                            <Image
                              src={firstImg}
                              alt={p.name}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          </div>
                          <div className="truncate max-w-[220px]">
                            <span className="font-semibold text-neutral-900 dark:text-neutral-100 block truncate">
                              {p.name}
                            </span>
                            <span className="text-[11px] text-neutral-400 block truncate">
                              {p.sampleSku || p.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-medium text-neutral-700 dark:text-neutral-300 block">
                          {brandName}
                        </span>
                        <span className="text-[11px] text-neutral-400 block">
                          {categoryName} • {p.gender}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-neutral-900 dark:text-neutral-100">
                        {formatCurrency(p.basePricePaise)}
                      </td>

                      {view === "trash" ? (
                        <>
                          <td className="py-3.5 px-4">
                            <span className="text-neutral-700 dark:text-neutral-300 block font-medium">
                              Deleted: {p.deletedAt ? new Date(p.deletedAt).toLocaleDateString() : "—"}
                            </span>
                            <span className="text-[11px] text-amber-600 dark:text-amber-400 block">
                              Purges in {p.daysUntilPurge ?? 30} days
                            </span>
                            {p.deleteReason && (
                              <span className="text-[10px] text-neutral-400 italic block truncate max-w-[150px]">
                                &ldquo;{p.deleteReason}&rdquo;
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {p.orderCount && p.orderCount > 0 ? (
                              <span
                                title={`${p.orderCount} historical order(s) reference this product. Cannot be permanently purged.`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 cursor-help"
                              >
                                🔒 {p.orderCount} Orders (Protected)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                0 Orders (Eligible)
                              </span>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${stockBadgeClass}`}
                            >
                              <span>●</span>
                              <span>{stockText}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                p.status === "ACTIVE"
                                  ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300"
                                  : "bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300"
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                        </>
                      )}

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {view === "trash" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleRestoreSingle(p)}
                                className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 cursor-pointer"
                              >
                                Restore
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPermDeleteTarget([p]);
                                  setIsEmptyTrashAll(false);
                                }}
                                disabled={!p.canPermanentlyDelete}
                                title={
                                  !p.canPermanentlyDelete
                                    ? `Cannot permanently delete: product is referenced by ${p.orderCount} historical order(s).`
                                    : "Permanently delete"
                                }
                                className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-md border border-red-200 transition disabled:opacity-40 disabled:cursor-not-allowed dark:border-red-900/50 dark:hover:bg-red-950/40 cursor-pointer"
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <>
                              <Link
                                href={`/admin/products/${p._id}/edit`}
                                className="inline-flex items-center rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-800 shadow-2xs hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                              >
                                Edit
                              </Link>
                              <button
                                type="button"
                                onClick={() => setSoftDeleteTarget([p])}
                                className="inline-flex items-center rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-semibold text-red-600 shadow-2xs hover:bg-red-50 dark:border-red-900 dark:bg-neutral-800 dark:text-red-400 dark:hover:bg-red-950/40 cursor-pointer"
                                title="Move to Trash"
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-800/40">
            <span className="text-xs text-neutral-500">
              Showing page{" "}
              <strong className="font-semibold text-neutral-900 dark:text-neutral-100">
                {pagination.page}
              </strong>{" "}
              of {pagination.totalPages}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => fetchProducts(view, pagination.page - 1)}
                className="rounded border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchProducts(view, pagination.page + 1)}
                className="rounded border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bulk Bar */}
      <ProductBulkBar
        selectedCount={selectedIds.size}
        view={view}
        onDeselectAll={() => setSelectedIds(new Set())}
        onMoveToTrash={() => setSoftDeleteTarget(selectedProducts)}
        onRestore={handleRestoreBulk}
        onPermanentDelete={() => {
          setPermDeleteTarget(selectedProducts);
          setIsEmptyTrashAll(false);
        }}
      />

      {/* Soft Delete Modal */}
      {softDeleteTarget && (
        <ProductDeleteModal
          isOpen={Boolean(softDeleteTarget)}
          onClose={() => setSoftDeleteTarget(null)}
          products={softDeleteTarget.map((p) => ({
            _id: p._id,
            name: p.name,
            slug: p.slug,
            image: p.images?.[0],
          }))}
          onConfirm={handleConfirmSoftDelete}
        />
      )}

      {/* Permanent Delete Modal */}
      {permDeleteTarget && (
        <PermanentDeleteModal
          isOpen={Boolean(permDeleteTarget)}
          onClose={() => {
            setPermDeleteTarget(null);
            setIsEmptyTrashAll(false);
          }}
          products={permDeleteTarget.map((p) => ({
            _id: p._id,
            name: p.name,
            orderCount: p.orderCount,
          }))}
          onConfirm={handleConfirmPermanentDelete}
          isEmptyTrashAll={isEmptyTrashAll}
        />
      )}

      {/* 10-Second Undo Toast */}
      {undoToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 right-6 z-50 flex items-center gap-3 rounded-xl border border-neutral-800 bg-[#121212] px-4 py-3 text-white shadow-2xl animate-in slide-in-from-bottom-3"
        >
          <span className="text-xs">
            Moved &apos;<strong>{undoToast.productName}</strong>&apos; to Trash.
          </span>
          <button
            type="button"
            onClick={handleUndo}
            className="rounded-md bg-amber-400 px-2.5 py-1 text-xs font-bold text-black hover:bg-amber-300 transition cursor-pointer"
          >
            Undo (10s)
          </button>
        </div>
      )}
    </div>
  );
}

