"use client";

import React from "react";

interface ProductBulkBarProps {
  selectedCount: number;
  view: "active" | "draft" | "trash";
  onDeselectAll: () => void;
  onMoveToTrash: () => void;
  onRestore: () => void;
  onPermanentDelete: () => void;
  isProcessing?: boolean;
}

export function ProductBulkBar({
  selectedCount,
  view,
  onDeselectAll,
  onMoveToTrash,
  onRestore,
  onPermanentDelete,
  isProcessing = false,
}: ProductBulkBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      role="region"
      aria-label="Bulk actions toolbar"
      className="fixed bottom-6 inset-x-0 z-40 mx-auto w-[92%] max-w-2xl animate-in slide-in-from-bottom-5 duration-200"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-[#121212] px-5 py-3.5 text-white shadow-2xl backdrop-blur-md dark:border-neutral-700 dark:bg-black/90">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#8C7A58] text-xs font-bold text-white">
            {selectedCount}
          </span>
          <span className="text-xs font-semibold tracking-wide">
            {selectedCount} {selectedCount === 1 ? "product" : "products"} selected
          </span>
          <button
            type="button"
            onClick={onDeselectAll}
            className="text-[11px] text-neutral-400 hover:text-white underline underline-offset-2 ml-1 cursor-pointer"
          >
            Deselect
          </button>
        </div>

        <div className="flex items-center gap-2">
          {view === "trash" ? (
            <>
              <button
                type="button"
                onClick={onRestore}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
              >
                <span>↺</span>
                <span>Restore ({selectedCount})</span>
              </button>
              <button
                type="button"
                onClick={onPermanentDelete}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:opacity-50 cursor-pointer"
              >
                <span>✕</span>
                <span>Purge Permanently</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onMoveToTrash}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:opacity-50 cursor-pointer"
            >
              <span>🗑️</span>
              <span>Move to Trash ({selectedCount})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

