"use client";

import React, { useState } from "react";
import Image from "next/image";

export interface DeleteModalProduct {
  _id: string;
  name: string;
  slug: string;
  image?: string;
}

interface ProductDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: DeleteModalProduct[];
  onConfirm: (reason: string) => Promise<void>;
  openOrdersWarning?: string | null;
}

export function ProductDeleteModal({
  isOpen,
  onClose,
  products,
  onConfirm,
  openOrdersWarning,
}: ProductDeleteModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || products.length === 0) return null;

  const isBulk = products.length > 1;
  const singleProduct = products[0];

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirm(reason);
      setReason("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move product to Trash");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        {/* Header */}
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
            <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950/60">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </div>
            <div>
              <h2 id="delete-modal-title" className="text-base font-bold text-neutral-900 dark:text-white">
                {isBulk ? `Move ${products.length} Products to Trash?` : "Move Product to Trash?"}
              </h2>
              <p className="text-xs text-neutral-500">
                Items can be restored anytime or auto-purged after 30 days.
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-xs">
          {/* Target preview */}
          {isBulk ? (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 dark:border-neutral-800 dark:bg-neutral-800/40">
              <span className="font-semibold text-neutral-800 dark:text-neutral-200 block mb-1.5">
                Selected {products.length} Products:
              </span>
              <ul className="space-y-1 text-neutral-600 dark:text-neutral-400">
                {products.slice(0, 5).map((p) => (
                  <li key={p._id} className="truncate">
                    • {p.name}
                  </li>
                ))}
                {products.length > 5 && (
                  <li className="font-medium text-neutral-400 italic">
                    ...and {products.length - 5} more
                  </li>
                )}
              </ul>
            </div>
          ) : (
            <div className="flex items-center gap-3.5 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/40">
              <div className="relative w-12 h-14 rounded-lg overflow-hidden bg-neutral-200 flex-shrink-0">
                {singleProduct.image ? (
                  <Image
                    src={singleProduct.image}
                    alt={singleProduct.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-400">
                    👕
                  </div>
                )}
              </div>
              <div className="truncate">
                <span className="font-bold text-neutral-900 dark:text-white block truncate">
                  {singleProduct.name}
                </span>
                <span className="text-[11px] text-neutral-500 block truncate">
                  Slug: {singleProduct.slug}
                </span>
              </div>
            </div>
          )}

          {/* Impact Explainer */}
          <div className="rounded-xl bg-amber-50 border border-amber-200/80 p-3 text-amber-900 dark:bg-amber-950/30 dark:border-amber-900/40 dark:text-amber-300">
            <span className="font-bold block mb-1">What will happen:</span>
            <ul className="space-y-1 list-disc list-inside text-[11px] leading-relaxed">
              <li>Hidden from storefront catalog, search, recommendations, and sitemap.</li>
              <li>Automatically removed from hanging rack, manual collections, and active sale campaigns.</li>
              <li>Customer carts will flag this item as unavailable.</li>
              <li>Past orders and invoices preserve full snapshots and remain intact.</li>
            </ul>
          </div>

          {/* Open Orders Warning */}
          {openOrdersWarning && (
            <div className="rounded-xl bg-orange-50 border border-orange-200 p-3 text-orange-900 dark:bg-orange-950/40 dark:border-orange-900 dark:text-orange-300">
              <span className="font-bold block">⚠️ Open Orders Notice:</span>
              <p className="text-[11px] mt-0.5">{openOrdersWarning}</p>
            </div>
          )}

          {/* Optional Reason Field */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Delete Reason (Optional, max 200 chars)
            </label>
            <input
              type="text"
              maxLength={200}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Discontinued style, seasonal rotation..."
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs text-neutral-900 focus:border-red-500 focus:ring-1 focus:ring-red-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-red-100 text-red-800 text-xs font-medium">
              {error}
            </div>
          )}
        </div>

        {/* Footer Actions */}
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
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition disabled:opacity-50"
          >
            {isSubmitting ? "Moving to Trash..." : isBulk ? `Move ${products.length} to Trash` : "Move to Trash"}
          </button>
        </div>
      </div>
    </div>
  );
}

