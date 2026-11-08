"use client";

import { useState } from "react";

export interface VariantInventoryItem {
  _id: string;
  sku: string;
  stock: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  options: Record<string, string>;
  product?: {
    _id: string;
    name: string;
    slug: string;
    images?: string[];
  };
}

interface InventoryAdjustModalProps {
  variant: VariantInventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InventoryAdjustModal({
  variant,
  isOpen,
  onClose,
  onSuccess,
}: InventoryAdjustModalProps) {
  const [actionType, setActionType] = useState<"ADD" | "DEDUCT">("ADD");
  const [amount, setAmount] = useState<string>("1");
  const [reason, setReason] = useState<"RESTOCK" | "RETURN" | "ADJUST" | "SALE">("RESTOCK");
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !variant) return null;

  const parsedAmount = parseInt(amount, 10) || 0;
  const change = actionType === "ADD" ? parsedAmount : -parsedAmount;
  const projectedStock = variant.stock + change;
  const isInvalidDeduction = actionType === "DEDUCT" && parsedAmount > variant.stock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0) {
      setErrorMessage("Quantity must be greater than zero");
      return;
    }
    if (isInvalidDeduction) {
      setErrorMessage(`Cannot deduct ${parsedAmount} units. Current stock is ${variant.stock}`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/admin/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: variant._id,
          change,
          reason,
          note: note.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to adjust stock");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to adjust stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-start justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Adjust Stock Level
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              SKU: <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">{variant.sku}</span>
              {variant.product?.name ? ` • ${variant.product.name}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-lg p-1"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {errorMessage && (
            <div className="p-3 text-xs rounded-lg bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/40 dark:border-red-900 dark:text-red-400">
              {errorMessage}
            </div>
          )}

          {/* Current & Projected Stock */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-800 text-center">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-medium">Current Stock</span>
              <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{variant.stock}</p>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-medium">After Adjustment</span>
              <p
                className={`text-xl font-bold ${
                  projectedStock < 0
                    ? "text-red-600"
                    : projectedStock <= variant.lowStockThreshold
                    ? "text-amber-600"
                    : "text-emerald-600"
                }`}
              >
                {projectedStock < 0 ? "Invalid" : projectedStock}
              </p>
            </div>
          </div>

          {/* Action Type Toggle */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Adjustment Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setActionType("ADD");
                  if (reason === "SALE") setReason("RESTOCK");
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                  actionType === "ADD"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300"
                }`}
              >
                + Add / Restock
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionType("DEDUCT");
                  if (reason === "RESTOCK") setReason("ADJUST");
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                  actionType === "DEDUCT"
                    ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                    : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300"
                }`}
              >
                - Deduct / Reduce
              </button>
            </div>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              required
            />
          </div>

          {/* Required Reason Selector */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) =>
                setReason(e.target.value as "RESTOCK" | "RETURN" | "ADJUST" | "SALE")
              }
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              required
            >
              <option value="RESTOCK">RESTOCK (Supplier replenishment)</option>
              <option value="RETURN">RETURN (Customer return to stock)</option>
              <option value="ADJUST">ADJUST (Inventory audit / Damaged / Correction)</option>
              <option value="SALE">SALE (Direct manual sale / offline purchase)</option>
            </select>
          </div>

          {/* Note Input */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Audit Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Warehouse rack B inspection or purchase invoice #120"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-neutral-700 rounded-lg hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || parsedAmount <= 0 || isInvalidDeduction}
              className={`px-4 py-2 text-xs font-semibold rounded-lg text-white transition-opacity ${
                actionType === "ADD"
                  ? "bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900"
                  : "bg-rose-600 hover:bg-rose-700"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSubmitting ? "Updating..." : "Confirm Stock Change"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

