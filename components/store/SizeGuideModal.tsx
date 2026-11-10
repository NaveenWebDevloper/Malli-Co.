"use client";

import { useState, useEffect, useMemo } from "react";
import {
  MEN_SIZE_CATEGORIES,
  KIDS_SIZE_CATEGORIES,
  detectInitialCategory,
  type SizeGuideCategory,
  type MeasurementUnit,
} from "@/lib/size-guides";

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: {
    gender?: "MEN" | "KIDS";
    name?: string;
    category?: { name?: string; slug?: string };
  };
  selectedSize?: string;
  onSelectSize?: (size: string) => void;
}

export function SizeGuideModal({
  isOpen,
  onClose,
  product,
  selectedSize,
  onSelectSize,
}: SizeGuideModalProps) {
  // Determine initial gender and category from product context
  const initial = useMemo(() => {
    if (!product) return { gender: "MEN" as const, categoryId: "men-shirts" };
    return detectInitialCategory(product);
  }, [product]);

  const [activeGender, setActiveGender] = useState<"MEN" | "KIDS">(initial.gender);
  const [activeCategoryId, setActiveCategoryId] = useState<string>(initial.categoryId);
  const [unit, setUnit] = useState<MeasurementUnit>("in");

  // Keep synced if product changes
  useEffect(() => {
    setActiveGender(initial.gender);
    setActiveCategoryId(initial.categoryId);
  }, [initial]);

  // Handle ESC key and scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const categories = activeGender === "MEN" ? MEN_SIZE_CATEGORIES : KIDS_SIZE_CATEGORIES;

  // Ensure active category belongs to current gender
  const activeCategory: SizeGuideCategory =
    categories.find((c) => c.id === activeCategoryId) || categories[0];

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="size-guide-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex flex-col w-full max-w-4xl max-h-[92vh] bg-[#FCFBF8] rounded-2xl shadow-2xl border border-[#EAE3D4] overflow-hidden text-[#121212]">
        {/* Top Header */}
        <div className="flex items-start justify-between px-5 sm:px-8 py-5 border-b border-[#EAE3D4] bg-white">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F3EFE6] text-[#8C7A58] text-[10px] font-bold uppercase tracking-[0.2em]">
                <svg
                  className="w-3 h-3 text-[#8C7A58]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                  />
                </svg>
                Size Directory
              </span>
              {product?.name && (
                <span className="hidden sm:inline text-xs text-neutral-400 font-serif italic truncate max-w-xs">
                  • {product.name}
                </span>
              )}
            </div>
            <h2
              id="size-guide-title"
              className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-[#121212]"
            >
              Size &amp; Measurement Guide
            </h2>
            <p className="text-xs text-neutral-500">
              Find your perfect fit. All measurements represent standard body dimensions.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close size guide"
            className="p-2 rounded-full text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Toolbar: Gender Tabs, Category Pills & Units Toggle */}
        <div className="px-5 sm:px-8 py-3.5 bg-[#FAF7F2] border-b border-[#EAE3D4] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Gender Switcher */}
            <div className="inline-flex rounded-xl bg-white p-1 border border-[#EAE3D4] shadow-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveGender("MEN");
                  setActiveCategoryId("men-shirts");
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-serif font-bold uppercase tracking-wider transition-all ${
                  activeGender === "MEN"
                    ? "bg-[#121212] text-white shadow-xs"
                    : "text-neutral-600 hover:text-black"
                }`}
              >
                Men
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveGender("KIDS");
                  setActiveCategoryId("kids-bottoms");
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-serif font-bold uppercase tracking-wider transition-all ${
                  activeGender === "KIDS"
                    ? "bg-[#121212] text-white shadow-xs"
                    : "text-neutral-600 hover:text-black"
                }`}
              >
                Kids
              </button>
            </div>

            {/* Measurement Unit Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Unit:
              </span>
              <div className="inline-flex rounded-lg bg-white p-0.5 border border-[#EAE3D4]">
                <button
                  type="button"
                  onClick={() => setUnit("in")}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                    unit === "in"
                      ? "bg-[#8C7A58] text-white shadow-xs"
                      : "text-neutral-500 hover:text-black"
                  }`}
                >
                  Inches (in)
                </button>
                <button
                  type="button"
                  onClick={() => setUnit("cm")}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                    unit === "cm"
                      ? "bg-[#8C7A58] text-white shadow-xs"
                      : "text-neutral-500 hover:text-black"
                  }`}
                >
                  CM (cm)
                </button>
              </div>
            </div>
          </div>

          {/* Clothing Sub-categories */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {categories.map((cat) => {
              const isCatActive = cat.id === activeCategory.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
                    isCatActive
                      ? "bg-[#2D2821] text-[#FAF6F0] shadow-xs"
                      : "bg-white text-neutral-700 border border-[#EAE3D4] hover:border-black"
                  }`}
                >
                  {cat.title.replace("Men's ", "").replace("Kids' ", "")}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Main Content */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 space-y-6">
          {/* Active Category Header */}
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-2 border-b border-[#EAE3D4]/60">
            <div>
              <h3 className="text-lg font-serif font-bold text-[#121212]">
                {activeCategory.title}
              </h3>
              <p className="text-xs text-neutral-500">{activeCategory.subtitle}</p>
            </div>
            {selectedSize && (
              <div className="inline-flex items-center gap-1.5 text-xs text-[#8C7A58] bg-[#F9F6EE] px-3 py-1 rounded-full border border-[#E9DFCB]">
                <span>Currently Selected Size:</span>
                <strong className="font-bold text-[#121212]">{selectedSize}</strong>
              </div>
            )}
          </div>

          {/* Sizing Table */}
          <div className="overflow-x-auto rounded-xl border border-[#EAE3D4] bg-white shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#FAF7F2] border-b border-[#EAE3D4] text-[#121212]">
                  {activeCategory.columns.map((col) => (
                    <th
                      key={col.key}
                      className="px-4 py-3 font-serif font-bold uppercase tracking-wider text-[11px] whitespace-nowrap"
                    >
                      {col.label} {col.key !== "size" && `(${unit.toUpperCase()})`}
                    </th>
                  ))}
                  {onSelectSize && (
                    <th className="px-4 py-3 font-serif font-bold uppercase tracking-wider text-[11px] text-right">
                      Action
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE3D4]">
                {activeCategory.rows.map((row) => {
                  // Determine if this row matches current selected size
                  const isMatch = Boolean(
                    selectedSize &&
                      (row.size.toLowerCase() === selectedSize.toLowerCase() ||
                        row.aliases?.some(
                          (a) => a.toLowerCase() === selectedSize.toLowerCase(),
                        )),
                  );

                  return (
                    <tr
                      key={row.size}
                      className={`transition-colors ${
                        isMatch
                          ? "bg-[#F7F3E9] font-medium border-l-4 border-l-[#8C7A58]"
                          : "hover:bg-[#FCFBF8]"
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold ${
                              isMatch ? "text-[#8C7A58]" : "text-[#121212]"
                            }`}
                          >
                            {row.size}
                          </span>
                          {isMatch && (
                            <span className="px-2 py-0.5 rounded-full bg-[#8C7A58] text-white text-[9px] font-bold uppercase tracking-wider">
                              Your Size
                            </span>
                          )}
                        </div>
                      </td>

                      {activeCategory.columns
                        .filter((c) => c.key !== "size")
                        .map((col) => {
                          const val = row.measurements[col.key];
                          const displayVal = val ? val[unit] : "—";
                          return (
                            <td
                              key={col.key}
                              className="px-4 py-3 whitespace-nowrap font-sans text-neutral-700"
                            >
                              {displayVal}
                            </td>
                          );
                        })}

                      {onSelectSize && (
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {isMatch ? (
                            <span className="text-[11px] font-bold text-[#8C7A58]">
                              Selected ✓
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectSize(row.size);
                                onClose();
                              }}
                              className="px-2.5 py-1 rounded text-[11px] font-bold bg-[#121212] text-white hover:bg-neutral-800 transition-colors"
                            >
                              Select
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Fit Tips & Atelier Advice */}
          {activeCategory.fitTips.length > 0 && (
            <div className="rounded-xl bg-[#FAF7F2] p-4 border border-[#EAE3D4] space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-serif font-bold uppercase tracking-wider text-[#8C7A58]">
                <span>📏 Fit Tips &amp; Recommendations</span>
              </div>
              <ul className="text-xs text-neutral-600 space-y-1 list-disc list-inside">
                {activeCategory.fitTips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Visual "How to Measure" Grid */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-serif font-bold uppercase tracking-[0.16em] text-[#8C7A58]">
              How to Measure Accurately
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white border border-[#EAE3D4] space-y-1">
                <div className="font-bold text-[#121212] flex items-center gap-1.5">
                  <span className="text-[#8C7A58]">01.</span> Chest / Bust
                </div>
                <p className="text-neutral-500 text-[11px] leading-relaxed">
                  Pass the tape under armpits across the widest point of the chest. Keep tape horizontal and relaxed.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#EAE3D4] space-y-1">
                <div className="font-bold text-[#121212] flex items-center gap-1.5">
                  <span className="text-[#8C7A58]">02.</span> Waistline
                </div>
                <p className="text-neutral-500 text-[11px] leading-relaxed">
                  Measure around your natural waist where trousers comfortably rest. Keep one finger between tape and body.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#EAE3D4] space-y-1">
                <div className="font-bold text-[#121212] flex items-center gap-1.5">
                  <span className="text-[#8C7A58]">03.</span> Hips &amp; Inseam
                </div>
                <p className="text-neutral-500 text-[11px] leading-relaxed">
                  Measure fullest part of hips. For inseam, measure from the crotch point down to the ankle hem.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#EAE3D4] space-y-1">
                <div className="font-bold text-[#121212] flex items-center gap-1.5">
                  <span className="text-[#8C7A58]">04.</span> Kids Height / Age
                </div>
                <p className="text-neutral-500 text-[11px] leading-relaxed">
                  Stand child barefoot flat against a wall; measure straight from crown to floor. Size up for fast growers.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 sm:px-8 py-4 border-t border-[#EAE3D4] bg-white">
          <div className="text-xs text-neutral-500 text-center sm:text-left">
            Need bespoke advice? Reach our concierge at{" "}
            <a
              href="mailto:concierge@malliandco.com"
              className="font-bold text-[#8C7A58] underline hover:text-black"
            >
              concierge@malliandco.com
            </a>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#121212] text-white text-xs font-serif font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors shadow-sm"
          >
            Close &amp; Return to Product
          </button>
        </div>
      </div>
    </div>
  );
}

