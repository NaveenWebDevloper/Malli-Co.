"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { DEFAULT_HERO_SLIDES, type HeroSlideItem } from "@/lib/constants";

export function HeroCarouselManager() {
  const [slides, setSlides] = useState<HeroSlideItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  const fetchSlides = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admin/hero");
      if (!res.ok) {
        throw new Error(`Failed to load slides: ${res.statusText}`);
      }
      const data = await res.json();
      if (data?.slides && Array.isArray(data.slides)) {
        setSlides(data.slides);
      } else {
        setSlides(DEFAULT_HERO_SLIDES);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error fetching hero slides";
      setStatusMessage({ type: "error", text: message });
      setSlides(DEFAULT_HERO_SLIDES);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSlides();
  }, []);

  const handleFieldChange = (
    index: number,
    field: keyof HeroSlideItem,
    value: string | number | boolean | undefined,
  ) => {
    setSlides((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setSlides((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= slides.length - 1) return;
    setSlides((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleDelete = (index: number) => {
    if (slides.length <= 1) {
      alert("At least one slide is required in the carousel.");
      return;
    }
    if (confirm("Are you sure you want to remove this slide?")) {
      setSlides((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleAddSlide = () => {
    const newSlide: HeroSlideItem = {
      src: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1200&q=80&auto=format&fit=max",
      alt: "New Haute Couture Garment",
      title: "New Sovereign Garment",
      subtitle: "Pure Silk & Handcrafted Linen",
      order: slides.length,
      isActive: true,
    };
    setSlides((prev) => [...prev, newSlide]);
  };

  const handleResetDefaults = () => {
    if (confirm("Reset carousel to Malli & Co. default luxury slides? Any unsaved edits will be lost.")) {
      setSlides(DEFAULT_HERO_SLIDES);
      setStatusMessage({
        type: "info",
        text: "Reset to default luxury slides. Click 'Save Carousel Changes' to persist to database.",
      });
    }
  };

  const handleFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingIdx(index);
    setStatusMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || "Upload failed");
      }

      const data = await res.json();
      if (data?.url) {
        handleFieldChange(index, "src", data.url);
        setStatusMessage({
          type: "success",
          text: `Image for slide #${index + 1} uploaded successfully!`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Image upload failed";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setUploadingIdx(null);
      // Reset input
      if (e.target) e.target.value = "";
    }
  };

  const handleSave = async () => {
    // Validation
    for (let i = 0; i < slides.length; i++) {
      if (!slides[i].src || !slides[i].src.trim()) {
        setStatusMessage({
          type: "error",
          text: `Slide #${i + 1} is missing an image URL.`,
        });
        return;
      }
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/admin/hero", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slides: slides.map((s, idx) => ({
            ...s,
            order: idx,
            isActive: s.isActive ?? true,
          })),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || "Failed to save hero carousel");
      }

      const data = await res.json();
      setStatusMessage({
        type: "success",
        text: data?.message || "Hero carousel updated successfully! The storefront is now showing the new slides.",
      });
      if (data?.slides) {
        setSlides(data.slides);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving carousel";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-neutral-200 bg-white p-12 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-400 border-t-neutral-900 dark:border-t-white" />
          <span>Loading Hero Carousel configurations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`rounded-xl border p-4 text-sm font-medium ${
            statusMessage.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
              : statusMessage.type === "error"
              ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
              : "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-300"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Control Actions Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            3D FlexCarousel Slides ({slides.length})
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Update imagery, titles, materials, and ordering rendered in the storefront 3D Hero.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
          >
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={handleAddSlide}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
          >
            + Add Slide
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-900 shadow-sm transition-all"
          >
            {isSaving ? "Saving..." : "Save Carousel Changes"}
          </button>
        </div>
      </div>

      {/* Slides List */}
      <div className="space-y-4">
        {slides.map((slide, index) => (
          <div
            key={index}
            className="relative flex flex-col md:flex-row gap-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
          >
            {/* Left: Thumbnail & Upload Actions */}
            <div className="flex flex-col items-center gap-3 md:w-56 shrink-0">
              <div className="relative aspect-[3/4] w-full max-w-[180px] overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800">
                {slide.src ? (
                  <Image
                    src={slide.src}
                    alt={slide.alt || slide.title || "Slide Image"}
                    fill
                    unoptimized
                    sizes="180px"
                    className="object-cover object-center"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      target.src = "/images/products/linen-oxford-front.jpg";
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                    No image
                  </div>
                )}
                <span className="absolute left-2 top-2 rounded bg-black/75 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">
                  #{index + 1}
                </span>
              </div>

              {/* Upload Button */}
              <input
                type="file"
                accept="image/*"
                ref={(el) => {
                  fileInputRefs.current[index] = el;
                }}
                onChange={(e) => handleFileUpload(index, e)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRefs.current[index]?.click()}
                disabled={uploadingIdx === index}
                className="w-full max-w-[180px] rounded-lg border border-dashed border-neutral-300 py-1.5 text-center text-xs font-medium text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                {uploadingIdx === index ? "Uploading..." : "Upload New Image"}
              </button>
            </div>

            {/* Middle: Details Inputs */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2 dark:border-neutral-800">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Slide Details
                </span>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    checked={slide.isActive !== false}
                    onChange={(e) => handleFieldChange(index, "isActive", e.target.checked)}
                    className="rounded text-neutral-900 focus:ring-neutral-900"
                  />
                  <span>Active in Storefront</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Image Source URL
                </label>
                <input
                  type="url"
                  value={slide.src}
                  onChange={(e) => handleFieldChange(index, "src", e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 focus:border-neutral-900 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Garment Title
                  </label>
                  <input
                    type="text"
                    value={slide.title}
                    onChange={(e) => handleFieldChange(index, "title", e.target.value)}
                    placeholder="e.g. The Heritage Blazer"
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 focus:border-neutral-900 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Fabric & Material Subtitle
                  </label>
                  <input
                    type="text"
                    value={slide.subtitle || ""}
                    onChange={(e) => handleFieldChange(index, "subtitle", e.target.value)}
                    placeholder="e.g. Italian Linen 340 GSM"
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 focus:border-neutral-900 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Alt / Accessibility Description
                </label>
                <input
                  type="text"
                  value={slide.alt || ""}
                  onChange={(e) => handleFieldChange(index, "alt", e.target.value)}
                  placeholder="e.g. Handcrafted Italian Linen Suit"
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 focus:border-neutral-900 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>
            </div>

            {/* Right: Order & Remove Actions */}
            <div className="flex flex-row md:flex-col justify-end md:justify-center items-center gap-2 border-t md:border-t-0 md:border-l border-neutral-100 pt-3 md:pt-0 md:pl-4 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                title="Move Slide Up"
                className="rounded-md border border-neutral-200 p-2 text-xs font-bold text-neutral-700 hover:bg-neutral-100 disabled:opacity-30 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => handleMoveDown(index)}
                disabled={index === slides.length - 1}
                title="Move Slide Down"
                className="rounded-md border border-neutral-200 p-2 text-xs font-bold text-neutral-700 hover:bg-neutral-100 disabled:opacity-30 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                ▼
              </button>
              <button
                type="button"
                onClick={() => handleDelete(index)}
                title="Delete Slide"
                className="rounded-md border border-rose-200 p-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/40"
              >
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HeroCarouselManager;
