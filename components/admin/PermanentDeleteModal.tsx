"use client";

import React, { useState } from "react";

export interface PermanentDeleteModalProduct {
  _id: string;
  name: string;
  orderCount?: number;
}

interface PermanentDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: PermanentDeleteModalProduct[];
  onConfirm: () => Promise<void>;
  isEmptyTrashAll?: boolean;
}

export function PermanentDeleteModal({
  isOpen,
  onClose,
  products,
  onConfirm,
  isEmptyTrashAll = false,
}: PermanentDeleteModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || products.length === 0) return null;

  const isBulk = products.length > 1 || isEmptyTrashAll;
  const singleProduct = products[0];
  const hasOrders = !isBulk && (singleProduct.orderCount || 0) > 0;

  // Expected confirmation phrase
  const expectedConfirmation = isBulk ? "DELETE" : singleProduct.name;
  const isMatch =
    confirmText.trim().toLowerCase() === expectedConfirmation.trim().toLowerCase() ||
    confirmText.trim() === "DELETE";

  const handleConfirm = async () => {
    if (hasOrders) return;
    if (!isMatch) {
      setError(`Please type '${expectedConfirmation}' or 'DELETE' to confirm.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirm();
      setConfirmText("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to permanently delete");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="perm-delete-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-red-200 bg-white shadow-2xl dark:border-red-950 dark:bg-neutral-900">
        {/* Header */}
        <div className="p-6 border-b border-red-100 bg-red-50/50 dark:border-red-950/60 dark:bg-red-950/20">
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
            <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-900/50 text-red-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div>
              <h2 id="perm-delete-title" className="text-base font-bold text-neutral-900 dark:text-white">
                {isEmptyTrashAll
                  ? "Empty Entire Trash?"
                  : isBulk
                  ? `Permanently Delete ${products.length} Products?`
                  : `Permanently Delete '${singleProduct.name}'?`}
              </h2>
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                This action is irreversible and permanently removes database records.
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          {hasOrders ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
              <div className="flex items-start gap-2.5">
                <span className="text-base">🚫</span>
                <div>
                  <span className="font-bold text-sm block">Permanent Deletion Blocked</span>
                  <p className="mt-1 leading-relaxed">
                    This product has <strong>{singleProduct.orderCount} historical order(s)</strong>.
                    E-commerce data integrity regulations require preserving past purchases, customer invoices,
                    and order snapshots.
                  </p>
                  <p className="mt-2 text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                    It will remain safely hidden in Trash and cannot be permanently deleted.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {isBulk ? (
                  <p>
                    {isEmptyTrashAll ? (
                      "All eligible items in Trash (with 0 orders) will be permanently purged. Items with past order history will be skipped to preserve accounting records."
                    ) : (
                      `All ${products.length} selected products with 0 historical orders will be purged from the database along with associated variants and unreferenced storage media.`
                    )}
                  </p>
                ) : (
                  <p>
                    Product &apos;<strong>{singleProduct.name}</strong>&apos; and its associated variants will be permanently
                    wiped from MongoDB. Unreferenced storage images will be removed.
                  </p>
                )}
              </div>

              {/* Confirmation Input Requirement */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">
                  Type <span className="font-mono text-red-600 bg-red-50 px-1 py-0.5 rounded border border-red-200">{isBulk ? "DELETE" : singleProduct.name}</span> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={isBulk ? "DELETE" : singleProduct.name}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs text-neutral-900 focus:border-red-600 focus:ring-1 focus:ring-red-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </div>
            </>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-100 text-red-800 text-xs font-medium">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex items-center justify-end gap-2 dark:border-neutral-800 dark:bg-neutral-800/40">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-200/60 rounded-lg transition dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || hasOrders || !isMatch}
            className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Purging..." : "Permanently Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
