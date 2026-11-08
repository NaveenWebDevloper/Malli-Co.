"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  InventoryAdjustModal,
  type VariantInventoryItem,
} from "./InventoryAdjustModal";
import { InventoryHistoryDrawer } from "./InventoryHistoryDrawer";
import { InventoryThresholdModal } from "./InventoryThresholdModal";

interface InventoryResponse {
  variants: (VariantInventoryItem & {
    pricePaise: number;
    compareAtPricePaise?: number;
    status: string;
  })[];
  totalCount: number;
  lowStockCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function InventoryTable() {
  const [data, setData] = useState<InventoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);

  // Modals & Drawers state
  const [adjustTarget, setAdjustTarget] = useState<VariantInventoryItem | null>(null);
  const [historyTarget, setHistoryTarget] = useState<VariantInventoryItem | null>(null);
  const [thresholdTarget, setThresholdTarget] = useState<VariantInventoryItem | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (lowStockOnly) params.set("lowStock", "true");

      const res = await fetch(`/api/admin/inventory?${params.toString()}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load inventory");
      }
      const json: InventoryResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching inventory");
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, lowStockOnly]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (lowStockOnly) params.set("lowStock", "true");
    window.location.href = `/api/admin/inventory/export?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3 max-w-md">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search by SKU or product name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 bg-white py-2 pl-9 pr-4 text-xs text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            />
            <span className="absolute left-3 top-2.5 text-xs text-neutral-400">
              🔍
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Low Stock Filter Button */}
          <button
            type="button"
            onClick={() => {
              setLowStockOnly((prev) => !prev);
              setPage(1);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all ${
              lowStockOnly
                ? "bg-amber-600 text-white hover:bg-amber-700"
                : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
            }`}
          >
            <span>⚠️ Low Stock Only</span>
            {data && data.lowStockCount > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  lowStockOnly
                    ? "bg-white text-amber-700"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400"
                }`}
              >
                {data.lowStockCount}
              </span>
            )}
          </button>

          {/* CSV Export Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 shadow-sm transition-all"
          >
            <span>📥 Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 bg-neutral-50/75 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/50">
              <tr>
                <th className="px-5 py-3.5">SKU</th>
                <th className="px-4 py-3.5">Product</th>
                <th className="px-4 py-3.5">Options</th>
                <th className="px-4 py-3.5">Current Stock</th>
                <th className="px-4 py-3.5">Threshold</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    <div className="inline-block w-5 h-5 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin mb-2" />
                    <p>Loading inventory catalogue...</p>
                  </td>
                </tr>
              )}

              {error && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-red-500">
                    {error}
                  </td>
                </tr>
              )}

              {!isLoading && !error && data?.variants.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    No SKU variants found matching the criteria.
                  </td>
                </tr>
              )}

              {!isLoading &&
                !error &&
                data?.variants.map((variant) => {
                  const isOutOfStock = variant.stock === 0;
                  const isLow = variant.stock <= variant.lowStockThreshold;

                  return (
                    <tr
                      key={variant._id}
                      className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      {/* SKU */}
                      <td className="px-5 py-4 font-mono font-bold text-neutral-900 dark:text-neutral-100">
                        {variant.sku}
                      </td>

                      {/* Product Name & Thumbnail */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {variant.product?.images?.[0] ? (
                            <Image
                              src={variant.product.images[0]}
                              alt={variant.product.name}
                              width={36}
                              height={36}
                              className="h-9 w-9 rounded-lg object-cover border border-neutral-200 dark:border-neutral-700"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-lg bg-neutral-100 flex items-center justify-center text-[10px] text-neutral-400 dark:bg-neutral-800">
                              IMG
                            </div>
                          )}
                          <div className="max-w-[220px]">
                            {variant.product?._id ? (
                              <Link
                                href={`/admin/products/${variant.product._id}/edit`}
                                className="font-semibold text-neutral-800 hover:underline dark:text-neutral-200 line-clamp-1"
                              >
                                {variant.product.name}
                              </Link>
                            ) : (
                              <span className="font-semibold text-neutral-800 dark:text-neutral-200 line-clamp-1">
                                {variant.product?.name || "Product"}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Options */}
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {variant.options &&
                          Object.keys(variant.options).length > 0 ? (
                            Object.entries(variant.options).map(([k, val]) => (
                              <span
                                key={k}
                                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700"
                              >
                                {k}: {val}
                              </span>
                            ))
                          ) : (
                            <span className="text-neutral-400 text-[11px] italic">
                              Standard
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Stock Badge */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isOutOfStock
                                ? "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900"
                                : isLow
                                ? "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900"
                                : "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900"
                            }`}
                          >
                            {variant.stock} units
                          </span>
                          {isOutOfStock ? (
                            <span className="text-[10px] text-red-600 font-semibold uppercase">
                              Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="text-[10px] text-amber-600 font-semibold uppercase">
                              Low
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Low-Stock Threshold */}
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => setThresholdTarget(variant)}
                          className="group inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 transition-colors"
                          title="Click to change threshold"
                        >
                          <span className="font-mono text-xs font-semibold">
                            ≤ {variant.lowStockThreshold ?? 5}
                          </span>
                          <span className="opacity-0 group-hover:opacity-100 text-[11px] text-neutral-400">
                            ✏️
                          </span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setAdjustTarget(variant)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 shadow-sm transition-all"
                          >
                            Adjust Stock
                          </button>
                          <button
                            type="button"
                            onClick={() => setHistoryTarget(variant)}
                            className="px-2 py-1.5 rounded-lg text-xs font-medium border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                            title="View stock movement history"
                          >
                            📜 History
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-3 text-xs text-neutral-500 dark:border-neutral-800">
            <div>
              Showing page <span className="font-semibold text-neutral-800 dark:text-neutral-200">{data.page}</span> of{" "}
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">{data.totalPages}</span> ({data.totalCount} total variants)
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

      {/* Modals & Drawers */}
      <InventoryAdjustModal
        isOpen={!!adjustTarget}
        variant={adjustTarget}
        onClose={() => setAdjustTarget(null)}
        onSuccess={() => {
          fetchInventory();
        }}
      />

      <InventoryThresholdModal
        isOpen={!!thresholdTarget}
        variant={thresholdTarget}
        onClose={() => setThresholdTarget(null)}
        onSuccess={() => {
          fetchInventory();
        }}
      />

      <InventoryHistoryDrawer
        isOpen={!!historyTarget}
        variant={historyTarget}
        onClose={() => setHistoryTarget(null)}
      />
    </div>
  );
}

