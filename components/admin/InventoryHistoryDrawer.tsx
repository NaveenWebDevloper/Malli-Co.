"use client";

import { useEffect, useState } from "react";
import type { VariantInventoryItem } from "./InventoryAdjustModal";

interface MovementRecord {
  _id: string;
  sku: string;
  change: number;
  previousStock: number;
  newStock: number;
  reason: "SALE" | "RESTOCK" | "RETURN" | "ADJUST";
  note?: string;
  order?: {
    orderNumber?: string;
    status?: string;
    paymentStatus?: string;
  } | null;
  createdAt: string;
}

interface InventoryHistoryDrawerProps {
  variant: VariantInventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InventoryHistoryDrawer({
  variant,
  isOpen,
  onClose,
}: InventoryHistoryDrawerProps) {
  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !variant) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetch(`/api/admin/inventory/${variant._id}/movements`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load movement history");
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setMovements(data.movements || []);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Error fetching history");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, variant]);

  if (!isOpen || !variant) return null;

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case "RESTOCK":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
      case "RETURN":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800";
      case "ADJUST":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800";
      case "SALE":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800";
      default:
        return "bg-neutral-100 text-neutral-700 border-neutral-200";
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-sm">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Stock Movement History
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  {variant.sku}
                </span>
                <span className="text-xs text-neutral-400">•</span>
                <span className="text-xs text-neutral-500 truncate max-w-[200px]">
                  {variant.product?.name || "Product"}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-lg p-1"
            >
              ✕
            </button>
          </div>

          {/* Current Stock Snapshot */}
          <div className="px-6 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs">
            <span className="text-neutral-500 font-medium">Current Stock</span>
            <span className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
              {variant.stock} units
            </span>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-48 text-neutral-400 text-sm">
                <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin mb-2" />
                Loading ledger entries...
              </div>
            )}

            {error && (
              <div className="p-3 text-xs rounded-lg bg-red-50 text-red-600 border border-red-200">
                {error}
              </div>
            )}

            {!isLoading && !error && movements.length === 0 && (
              <div className="text-center py-12 text-sm text-neutral-400">
                No movements recorded for this SKU yet.
              </div>
            )}

            {!isLoading &&
              !error &&
              movements.map((m) => {
                const isPositive = m.change > 0;
                return (
                  <div
                    key={m._id}
                    className="p-3.5 rounded-xl border border-neutral-200/80 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-800/30 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2 py-0.5 rounded-md font-semibold text-[10px] tracking-wide border uppercase ${getReasonBadge(
                          m.reason,
                        )}`}
                      >
                        {m.reason}
                      </span>
                      <span
                        className={`font-mono font-bold text-sm ${
                          isPositive ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {isPositive ? `+${m.change}` : m.change}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-neutral-500">
                      <span>Stock transition:</span>
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">
                        {m.previousStock} → {m.newStock}
                      </span>
                    </div>

                    {m.order && m.order.orderNumber && (
                      <div className="flex items-center justify-between text-neutral-500">
                        <span>Order reference:</span>
                        <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                          #{m.order.orderNumber}
                        </span>
                      </div>
                    )}

                    {m.note && (
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-400 italic bg-white dark:bg-neutral-900 p-2 rounded-lg border border-neutral-200/60 dark:border-neutral-800">
                        &quot;{m.note}&quot;
                      </p>
                    )}

                    <div className="text-[10px] text-neutral-400 pt-1 text-right">
                      {new Date(m.createdAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

