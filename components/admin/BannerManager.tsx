"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";

export interface BannerImage {
  url: string;
  publicId?: string;
  width?: number;
  height?: number;
}

export type BannerTextPosition = "left" | "center" | "right";
export type BannerTextTheme = "light" | "dark";

export interface HeroBannerItem {
  id: string;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  ctaLabel: string;
  ctaUrl: string;
  secondaryCtaLabel?: string;
  secondaryCtaUrl?: string;
  imageDesktop: BannerImage;
  imageMobile?: BannerImage;
  altText: string;
  textPosition: BannerTextPosition;
  textTheme: BannerTextTheme;
  overlayOpacity: number;
  sortOrder: number;
  active: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  scheduleStatus: "Live" | "Scheduled" | "Expired" | "Hidden";
}

interface BannerFormData {
  title: string;
  subtitle: string;
  eyebrow: string;
  ctaLabel: string;
  ctaUrl: string;
  secondaryCtaLabel: string;
  secondaryCtaUrl: string;
  imageDesktop: BannerImage;
  imageMobile?: BannerImage;
  altText: string;
  textPosition: BannerTextPosition;
  textTheme: BannerTextTheme;
  overlayOpacity: number;
  active: boolean;
  startsAt: string;
  endsAt: string;
}

const DEFAULT_FORM_DATA: BannerFormData = {
  title: "",
  subtitle: "",
  eyebrow: "",
  ctaLabel: "EXPLORE COLLECTION",
  ctaUrl: "/men",
  secondaryCtaLabel: "",
  secondaryCtaUrl: "",
  imageDesktop: {
    url: "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=2400&auto=format&fit=crop",
    width: 2400,
    height: 1350,
  },
  imageMobile: undefined,
  altText: "",
  textPosition: "left",
  textTheme: "light",
  overlayOpacity: 35,
  active: true,
  startsAt: "",
  endsAt: "",
};

export function BannerManager() {
  const [banners, setBanners] = useState<HeroBannerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [formData, setFormData] = useState<BannerFormData>(DEFAULT_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmBanner, setDeleteConfirmBanner] = useState<HeroBannerItem | null>(null);

  // Uploading state
  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const desktopInputRef = useRef<HTMLInputElement | null>(null);
  const mobileInputRef = useRef<HTMLInputElement | null>(null);

  // Preview Mode in drawer
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "mobile">("desktop");

  // Drag and drop state
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  // Toast state
  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const fetchBanners = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/banners");
      if (!res.ok) {
        throw new Error("Failed to load hero banners");
      }
      const data = await res.json();
      if (data.banners) {
        setBanners(data.banners);
      }
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to fetch banners from database.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const openCreateDrawer = () => {
    if (banners.length >= 8) {
      showToast("error", "Maximum limit of 8 banners reached. Please delete or edit an existing banner.");
      return;
    }
    setEditingBannerId(null);
    setFormData(DEFAULT_FORM_DATA);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (banner: HeroBannerItem) => {
    setEditingBannerId(banner.id);
    setFormData({
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      eyebrow: banner.eyebrow || "",
      ctaLabel: banner.ctaLabel || "",
      ctaUrl: banner.ctaUrl || "",
      secondaryCtaLabel: banner.secondaryCtaLabel || "",
      secondaryCtaUrl: banner.secondaryCtaUrl || "",
      imageDesktop: {
        url: banner.imageDesktop?.url || "",
        ...(banner.imageDesktop?.publicId ? { publicId: banner.imageDesktop.publicId } : {}),
        ...(banner.imageDesktop?.width ? { width: banner.imageDesktop.width } : {}),
        ...(banner.imageDesktop?.height ? { height: banner.imageDesktop.height } : {}),
      },
      imageMobile: banner.imageMobile?.url
        ? {
            url: banner.imageMobile.url,
            ...(banner.imageMobile.publicId ? { publicId: banner.imageMobile.publicId } : {}),
            ...(banner.imageMobile.width ? { width: banner.imageMobile.width } : {}),
            ...(banner.imageMobile.height ? { height: banner.imageMobile.height } : {}),
          }
        : undefined,
      altText: banner.altText || "",
      textPosition: banner.textPosition || "left",
      textTheme: banner.textTheme || "light",
      overlayOpacity: banner.overlayOpacity ?? 35,
      active: banner.active ?? true,
      startsAt: banner.startsAt ? new Date(banner.startsAt).toISOString().slice(0, 16) : "",
      endsAt: banner.endsAt ? new Date(banner.endsAt).toISOString().slice(0, 16) : "",
    });
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingBannerId(null);
  };

  // Toggle active status directly from list view
  const handleToggleActive = async (banner: HeroBannerItem) => {
    const newActive = !banner.active;
    // Optimistic update
    setBanners((prev) =>
      prev.map((b) =>
        b.id === banner.id
          ? {
              ...b,
              active: newActive,
              scheduleStatus: newActive ? (b.startsAt && new Date(b.startsAt) > new Date() ? "Scheduled" : "Live") : "Hidden",
            }
          : b,
      ),
    );

    try {
      const res = await fetch(`/api/admin/banners/${banner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: newActive }),
      });
      if (!res.ok) throw new Error();
      showToast("success", `Banner ${newActive ? "activated" : "hidden"}`);
    } catch {
      showToast("error", "Failed to update banner status");
      fetchBanners(); // revert
    }
  };

  // Drag and drop reordering
  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetIdx: number) => {
    if (draggedIdx === null || draggedIdx === targetIdx) return;

    const updated = [...banners];
    const [moved] = updated.splice(draggedIdx, 1);
    updated.splice(targetIdx, 0, moved);

    // Re-index sortOrder
    const reindexed = updated.map((b, idx) => ({ ...b, sortOrder: idx }));
    setBanners(reindexed);
    setDraggedIdx(null);

    // Persist to API
    saveReorder(reindexed);
  };

  const handleMoveStep = (idx: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= banners.length) return;

    const updated = [...banners];
    const [moved] = updated.splice(idx, 1);
    updated.splice(targetIdx, 0, moved);

    const reindexed = updated.map((b, i) => ({ ...b, sortOrder: i }));
    setBanners(reindexed);
    saveReorder(reindexed);
  };

  const saveReorder = async (items: HeroBannerItem[]) => {
    try {
      const payload = {
        items: items.map((b) => ({ id: b.id, sortOrder: b.sortOrder })),
      };
      const res = await fetch("/api/admin/banners/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      showToast("success", "Banner order saved and cache revalidated");
    } catch {
      showToast("error", "Failed to persist banner order");
      fetchBanners();
    }
  };

  // Upload handler
  const handleFileUpload = async (file: File, type: "desktop" | "mobile") => {
    const isDesktop = type === "desktop";
    if (isDesktop) setUploadingDesktop(true);
    else setUploadingMobile(true);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", type);

      const res = await fetch("/api/admin/banners/upload", {
        method: "POST",
        body: form,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      if (isDesktop) {
        setFormData((prev) => ({
          ...prev,
          imageDesktop: {
            url: data.url,
            publicId: data.publicId,
            width: data.width,
            height: data.height,
          },
        }));
        showToast("success", "Desktop image uploaded (min 1600px verified)");
      } else {
        setFormData((prev) => ({
          ...prev,
          imageMobile: {
            url: data.url,
            publicId: data.publicId,
            width: data.width,
            height: data.height,
          },
        }));
        showToast("success", "Mobile image uploaded (min 800px verified)");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Image upload failed";
      showToast("error", msg);
    } finally {
      if (isDesktop) setUploadingDesktop(false);
      else setUploadingMobile(false);
    }
  };

  // Form submit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast("error", "Title is required");
      return;
    }
    if (!formData.altText.trim()) {
      showToast("error", "Alt text is required for accessibility");
      return;
    }
    if (!formData.imageDesktop.url) {
      showToast("error", "Desktop image is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim(),
        eyebrow: formData.eyebrow.trim(),
        ctaLabel: formData.ctaLabel.trim(),
        ctaUrl: formData.ctaUrl.trim(),
        secondaryCtaLabel: formData.secondaryCtaLabel.trim(),
        secondaryCtaUrl: formData.secondaryCtaUrl.trim(),
        imageDesktop: {
          url: formData.imageDesktop.url,
          ...(formData.imageDesktop.publicId ? { publicId: formData.imageDesktop.publicId } : {}),
          ...(formData.imageDesktop.width ? { width: formData.imageDesktop.width } : {}),
          ...(formData.imageDesktop.height ? { height: formData.imageDesktop.height } : {}),
        },
        imageMobile: formData.imageMobile?.url
          ? {
              url: formData.imageMobile.url,
              ...(formData.imageMobile.publicId ? { publicId: formData.imageMobile.publicId } : {}),
              ...(formData.imageMobile.width ? { width: formData.imageMobile.width } : {}),
              ...(formData.imageMobile.height ? { height: formData.imageMobile.height } : {}),
            }
          : null,
        altText: formData.altText.trim(),
        textPosition: formData.textPosition,
        textTheme: formData.textTheme,
        overlayOpacity: Number(formData.overlayOpacity),
        active: formData.active,
        startsAt: formData.startsAt ? new Date(formData.startsAt).toISOString() : null,
        endsAt: formData.endsAt ? new Date(formData.endsAt).toISOString() : null,
      };

      const url = editingBannerId
        ? `/api/admin/banners/${editingBannerId}`
        : "/api/admin/banners";
      const method = editingBannerId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) {
        let errorMsg = resData.error || "Failed to save banner";
        if (resData.details) {
          const detailEntries = Object.entries(resData.details).map(
            ([field, errors]) => `${field}: ${(errors as string[]).join(", ")}`,
          );
          if (detailEntries.length > 0) {
            errorMsg = detailEntries.join(" | ");
          }
        }
        throw new Error(errorMsg);
      }

      showToast("success", editingBannerId ? "Banner updated successfully" : "Banner created successfully");
      closeDrawer();
      fetchBanners();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error saving banner";
      showToast("error", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete handler
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmBanner) return;
    try {
      const res = await fetch(`/api/admin/banners/${deleteConfirmBanner.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      showToast("success", "Banner deleted successfully");
      setBanners((prev) => prev.filter((b) => b.id !== deleteConfirmBanner.id));
      setDeleteConfirmBanner(null);
    } catch {
      showToast("error", "Failed to delete banner");
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold tracking-wide border transition-all animate-in slide-in-from-bottom-2 ${
            toast.type === "success"
              ? "bg-emerald-950 text-emerald-100 border-emerald-800"
              : toast.type === "error"
              ? "bg-red-950 text-red-100 border-red-800"
              : "bg-neutral-900 text-white border-neutral-700"
          }`}
        >
          <span>{toast.type === "success" ? "✓" : toast.type === "error" ? "⚠️" : "ℹ️"}</span>
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-neutral-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Page Header with Action & Capacity Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
            <Link href="/admin" className="hover:underline">
              Admin
            </Link>
            <span>/</span>
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
              Banners
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Homepage Hero Banners
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Manage the premier editorial banner carousel placed as the top visual section on the homepage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Capacity Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-neutral-200 bg-white text-xs font-medium text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
            <span
              className={`w-2 h-2 rounded-full ${
                banners.length >= 8
                  ? "bg-amber-500"
                  : banners.length > 0
                  ? "bg-emerald-500"
                  : "bg-neutral-400"
              }`}
            />
            <span>
              {banners.length} of 8 Slots Used
            </span>
          </div>

          <button
            type="button"
            onClick={openCreateDrawer}
            disabled={banners.length >= 8}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-900 shadow-sm transition-all"
          >
            <span>+ Add Banner</span>
          </button>
        </div>
      </div>

      {/* BANNER LIST VIEW */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-28 rounded-xl bg-neutral-200 dark:bg-neutral-800 animate-pulse"
            />
          ))}
        </div>
      ) : banners.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-3">
          <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto text-xl">
            🖼️
          </div>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
            No hero banners configured
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
            Create high-impact editorial slides with desktop and mobile imagery, callouts, and scheduling.
          </p>
          <button
            onClick={openCreateDrawer}
            className="inline-flex px-4 py-2 rounded-lg bg-black text-white text-xs font-semibold hover:bg-neutral-800 dark:bg-white dark:text-black"
          >
            Create First Banner
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 flex items-center justify-between px-2">
            <span>Drag or use arrows to reorder • Storefront mirrors this exact sequence</span>
            <span>Max 8 banners</span>
          </div>

          <div className="space-y-2.5">
            {banners.map((banner, idx) => (
              <div
                key={banner.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(idx)}
                className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border transition-all ${
                  draggedIdx === idx
                    ? "opacity-40 border-dashed border-neutral-400 bg-neutral-100 dark:bg-neutral-800"
                    : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 shadow-sm"
                }`}
              >
                {/* Left: Drag Handle, Order, & Thumbnails */}
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  {/* Drag Handle */}
                  <div
                    title="Drag to reorder"
                    className="cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M7 4a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm0 6a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm0 6a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm9-12a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm0 6a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm0 6a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                    </svg>
                  </div>

                  {/* Up / Down buttons */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveStep(idx, "up")}
                      className="text-[10px] text-neutral-400 hover:text-black dark:hover:text-white disabled:opacity-20"
                      title="Move Up"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={idx === banners.length - 1}
                      onClick={() => handleMoveStep(idx, "down")}
                      className="text-[10px] text-neutral-400 hover:text-black dark:hover:text-white disabled:opacity-20"
                      title="Move Down"
                    >
                      ▼
                    </button>
                  </div>

                  <span className="font-mono text-xs font-bold text-neutral-400 w-5">
                    #{idx + 1}
                  </span>

                  {/* Thumbnail */}
                  <div className="relative w-20 sm:w-28 h-14 sm:h-16 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex-shrink-0 border border-neutral-200 dark:border-neutral-700">
                    {banner.imageDesktop?.url ? (
                      <Image
                        src={banner.imageDesktop.url}
                        alt={banner.altText || banner.title}
                        fill
                        className="object-cover"
                        sizes="120px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400">
                        No image
                      </div>
                    )}
                    {banner.imageMobile?.url && (
                      <span
                        title="Mobile image configured"
                        className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/70 text-[9px] font-mono text-white"
                      >
                        📱
                      </span>
                    )}
                  </div>

                  {/* Titles & Meta */}
                  <div className="min-w-0 space-y-0.5">
                    {banner.eyebrow && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block truncate">
                        {banner.eyebrow}
                      </span>
                    )}
                    <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
                      {banner.title}
                    </h4>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate max-w-md hidden sm:block">
                      {banner.subtitle || "No subtitle"} • CTA: {banner.ctaLabel} ({banner.ctaUrl})
                    </p>
                  </div>
                </div>

                {/* Right: Status Badges, Toggle & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-neutral-800 flex-shrink-0">
                  {/* Schedule Badge */}
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      banner.scheduleStatus === "Live"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : banner.scheduleStatus === "Scheduled"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                        : banner.scheduleStatus === "Expired"
                        ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                        : "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20"
                    }`}
                  >
                    {banner.scheduleStatus}
                  </span>

                  {/* Active Toggle */}
                  <label className="flex items-center cursor-pointer" title="Toggle active status">
                    <input
                      type="checkbox"
                      checked={banner.active}
                      onChange={() => handleToggleActive(banner)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4.5 bg-neutral-300 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:border-neutral-600 peer-checked:bg-black dark:peer-checked:bg-white dark:peer-checked:after:bg-black relative" />
                  </label>

                  {/* Edit Button */}
                  <button
                    onClick={() => openEditDrawer(banner)}
                    className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-200"
                    title="Edit banner"
                  >
                    ✏️ Edit
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => setDeleteConfirmBanner(banner)}
                    className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs text-red-600 dark:text-red-400"
                    title="Delete banner"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE / EDIT DRAWER (Workbench with Real-Time Live Preview) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-5xl bg-white dark:bg-neutral-900 h-full overflow-y-auto shadow-2xl flex flex-col border-l border-neutral-200 dark:border-neutral-800 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-neutral-900/95 backdrop-blur z-20">
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  {editingBannerId ? "Edit Hero Banner" : "Create New Hero Banner"}
                </h2>
                <p className="text-xs text-neutral-500">
                  Configure visual assets, editorial typography, overlay darkness, and scheduling.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="bannerForm"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-900 shadow-sm"
                >
                  {isSubmitting ? "Saving..." : editingBannerId ? "Save Changes" : "Publish Banner"}
                </button>
              </div>
            </div>

            {/* Drawer Content: Split into Form (Left) and Live Preview (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 divide-y lg:divide-y-0 lg:divide-x divide-neutral-200 dark:divide-neutral-800">
              {/* Form Controls (7 cols) */}
              <form
                id="bannerForm"
                onSubmit={handleSubmitForm}
                className="lg:col-span-7 p-6 space-y-6"
              >
                {/* 1. Image Assets Section */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    1. Visual Assets (Desktop &amp; Mobile)
                  </h3>

                  {/* Desktop Upload Zone */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                        Desktop Image <span className="text-red-500">*</span>
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        Min 1600px width • 16:9 ratio recommended • Max 3 MB
                      </span>
                    </div>

                    <div
                      onClick={() => desktopInputRef.current?.click()}
                      className="group relative border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl p-4 text-center hover:border-black dark:hover:border-white transition-colors cursor-pointer bg-neutral-50 dark:bg-neutral-800/40"
                    >
                      <input
                        type="file"
                        ref={desktopInputRef}
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, "desktop");
                        }}
                      />

                      {uploadingDesktop ? (
                        <div className="py-6 flex flex-col items-center justify-center gap-2 text-xs text-neutral-500">
                          <div className="w-5 h-5 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
                          <span>Uploading &amp; verifying desktop dimensions...</span>
                        </div>
                      ) : formData.imageDesktop?.url ? (
                        <div className="relative h-32 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
                          <Image
                            src={formData.imageDesktop.url}
                            alt="Desktop preview"
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                            Click to replace image
                          </div>
                        </div>
                      ) : (
                        <div className="py-6 space-y-1">
                          <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                            Click or drag image to upload desktop banner
                          </p>
                          <p className="text-[11px] text-neutral-400">
                            JPEG, WebP, or PNG (minimum 1600px wide)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mobile Upload Zone */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                        Mobile Image (Optional but recommended)
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        Min 800px width • 9:16 vertical • Max 3 MB
                      </span>
                    </div>

                    <div
                      onClick={() => mobileInputRef.current?.click()}
                      className="group relative border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl p-3 text-center hover:border-black dark:hover:border-white transition-colors cursor-pointer bg-neutral-50 dark:bg-neutral-800/40"
                    >
                      <input
                        type="file"
                        ref={mobileInputRef}
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, "mobile");
                        }}
                      />

                      {uploadingMobile ? (
                        <div className="py-4 flex flex-col items-center justify-center gap-2 text-xs text-neutral-500">
                          <div className="w-5 h-5 border-2 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
                          <span>Uploading &amp; verifying mobile dimensions...</span>
                        </div>
                      ) : formData.imageMobile?.url ? (
                        <div className="relative h-24 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
                          <Image
                            src={formData.imageMobile.url}
                            alt="Mobile preview"
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                            Click to replace mobile image
                          </div>
                        </div>
                      ) : (
                        <div className="py-3 space-y-0.5">
                          <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                            Upload dedicated portrait image for mobile
                          </p>
                          <p className="text-[11px] text-neutral-400">
                            If omitted, desktop banner will be displayed on mobile.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Alt Text */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                      Accessibility Alt Text <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.altText}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, altText: e.target.value }))
                      }
                      placeholder="e.g. Model wearing bespoke French linen overcoat"
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                    />
                  </div>
                </div>

                {/* 2. Editorial Typography */}
                <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    2. Editorial Typography &amp; CTAs
                  </h3>

                  {/* Eyebrow */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <label className="font-semibold text-neutral-800 dark:text-neutral-200">
                        Eyebrow Label
                      </label>
                      <span className="text-[10px] text-neutral-400">
                        {formData.eyebrow.length} / 30
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={30}
                      value={formData.eyebrow}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, eyebrow: e.target.value }))
                      }
                      placeholder="e.g. AUTUMN / WINTER 2026"
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs uppercase tracking-wider text-neutral-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  {/* Title */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <label className="font-semibold text-neutral-800 dark:text-neutral-200">
                        Main Title <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[10px] text-neutral-400">
                        {formData.title.length} / 80
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={80}
                      value={formData.title}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="e.g. THE FINER SIDE OF WINTER"
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-bold text-neutral-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  {/* Subtitle */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <label className="font-semibold text-neutral-800 dark:text-neutral-200">
                        Subtitle
                      </label>
                      <span className="text-[10px] text-neutral-400">
                        {formData.subtitle.length} / 160
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      maxLength={160}
                      value={formData.subtitle}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, subtitle: e.target.value }))
                      }
                      placeholder="e.g. Hand-tailored outerwear and noble layers designed for understated distinction."
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  {/* Primary CTA */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                        Primary CTA Label <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={30}
                        value={formData.ctaLabel}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, ctaLabel: e.target.value }))
                        }
                        placeholder="EXPLORE COLLECTION"
                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                        Primary CTA URL <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.ctaUrl}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, ctaUrl: e.target.value }))
                        }
                        placeholder="/men or https://..."
                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-mono text-neutral-900 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Secondary CTA */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                        Secondary CTA Label (Optional)
                      </label>
                      <input
                        type="text"
                        maxLength={30}
                        value={formData.secondaryCtaLabel}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, secondaryCtaLabel: e.target.value }))
                        }
                        placeholder="DISCOVER LOOKBOOK"
                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                        Secondary CTA URL (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.secondaryCtaUrl}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, secondaryCtaUrl: e.target.value }))
                        }
                        placeholder="#lookbook or /kids"
                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-mono text-neutral-900 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Positioning & Styling */}
                <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    3. Text Alignment &amp; Visual Tone
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Text Position */}
                    <div>
                      <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">
                        Text Alignment
                      </label>
                      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                        {(["left", "center", "right"] as const).map((pos) => (
                          <button
                            type="button"
                            key={pos}
                            onClick={() =>
                              setFormData((prev) => ({ ...prev, textPosition: pos }))
                            }
                            className={`py-1.5 text-xs font-semibold rounded capitalize transition-all ${
                              formData.textPosition === pos
                                ? "bg-white dark:bg-neutral-900 text-black dark:text-white shadow-sm"
                                : "text-neutral-500 hover:text-black dark:hover:text-white"
                            }`}
                          >
                            {pos}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Text Theme */}
                    <div>
                      <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">
                        Text Theme
                      </label>
                      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, textTheme: "light" }))
                          }
                          className={`py-1.5 text-xs font-semibold rounded transition-all ${
                            formData.textTheme === "light"
                              ? "bg-white dark:bg-neutral-900 text-black dark:text-white shadow-sm"
                              : "text-neutral-500 hover:text-black dark:hover:text-white"
                          }`}
                        >
                          Light (for dark imagery)
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, textTheme: "dark" }))
                          }
                          className={`py-1.5 text-xs font-semibold rounded transition-all ${
                            formData.textTheme === "dark"
                              ? "bg-white dark:bg-neutral-900 text-black dark:text-white shadow-sm"
                              : "text-neutral-500 hover:text-black dark:hover:text-white"
                          }`}
                        >
                          Dark (for light imagery)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Overlay Opacity Slider */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <label className="font-semibold text-neutral-800 dark:text-neutral-200">
                        Dark Overlay Opacity
                      </label>
                      <span className="font-mono font-bold text-neutral-900 dark:text-white">
                        {formData.overlayOpacity}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="60"
                      step="5"
                      value={formData.overlayOpacity}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          overlayOpacity: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-black dark:accent-white"
                    />
                    <div className="flex justify-between text-[10px] text-neutral-400 mt-0.5">
                      <span>0% (Raw image)</span>
                      <span>30% (Recommended)</span>
                      <span>60% (High contrast)</span>
                    </div>
                  </div>
                </div>

                {/* 4. Scheduling & Status */}
                <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                      4. Publishing Schedule
                    </h3>
                    {(formData.startsAt || formData.endsAt) && (
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, startsAt: "", endsAt: "" }))
                        }
                        className="text-[11px] text-amber-600 hover:underline"
                      >
                        Clear Dates (Make Perpetual)
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                        Go-Live Date (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.startsAt}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, startsAt: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                        Expiration Date (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.endsAt}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, endsAt: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <input
                      type="checkbox"
                      id="activeBanner"
                      checked={formData.active}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, active: e.target.checked }))
                      }
                      className="rounded border-neutral-300 w-4 h-4 text-black focus:ring-0"
                    />
                    <label htmlFor="activeBanner" className="text-xs font-semibold text-neutral-900 dark:text-white">
                      Active (Display on storefront within schedule window)
                    </label>
                  </div>
                </div>
              </form>

              {/* LIVE PREVIEW PANEL (5 cols) */}
              <div className="lg:col-span-5 p-6 bg-neutral-50 dark:bg-neutral-950 flex flex-col space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">
                      Real-Time Live Preview
                    </span>
                  </div>

                  {/* Desktop / Mobile Viewport Switch */}
                  <div className="flex items-center p-0.5 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setPreviewViewport("desktop")}
                      className={`px-2.5 py-1 rounded ${
                        previewViewport === "desktop"
                          ? "bg-white dark:bg-neutral-900 text-black dark:text-white shadow-sm"
                          : "text-neutral-500 hover:text-black dark:hover:text-white"
                      }`}
                    >
                      🖥️ Desktop
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewViewport("mobile")}
                      className={`px-2.5 py-1 rounded ${
                        previewViewport === "mobile"
                          ? "bg-white dark:bg-neutral-900 text-black dark:text-white shadow-sm"
                          : "text-neutral-500 hover:text-black dark:hover:text-white"
                      }`}
                    >
                      📱 Mobile
                    </button>
                  </div>
                </div>

                {/* Live Banner Mockup */}
                <div className="flex-1 flex items-center justify-center py-4">
                  <div
                    className={`relative rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${
                      previewViewport === "desktop"
                        ? "w-full aspect-[16/10] max-w-md"
                        : "w-56 aspect-[9/16]"
                    }`}
                  >
                    {/* Background Image */}
                    {previewViewport === "mobile" && formData.imageMobile?.url ? (
                      <Image
                        src={formData.imageMobile.url}
                        alt={formData.altText || "Mobile preview"}
                        fill
                        className="object-cover"
                      />
                    ) : formData.imageDesktop?.url ? (
                      <Image
                        src={formData.imageDesktop.url}
                        alt={formData.altText || "Desktop preview"}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-xs text-neutral-400">
                        No image uploaded
                      </div>
                    )}

                    {/* Overlay driven by overlayOpacity */}
                    <div
                      className="absolute inset-0 bg-black transition-opacity"
                      style={{ opacity: formData.overlayOpacity / 100 }}
                    />

                    {/* Gradient for luxury depth */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

                    {/* Text Container */}
                    <div
                      className={`absolute inset-0 p-5 flex flex-col justify-end z-10 ${
                        formData.textPosition === "center"
                          ? "items-center text-center"
                          : formData.textPosition === "right"
                          ? "items-end text-right"
                          : "items-start text-left"
                      }`}
                    >
                      {formData.eyebrow && (
                        <span
                          className={`text-[9px] font-bold uppercase tracking-[0.2em] mb-1 ${
                            formData.textTheme === "light"
                              ? "text-amber-300"
                              : "text-amber-800"
                          }`}
                        >
                          {formData.eyebrow}
                        </span>
                      )}

                      <h4
                        className={`font-serif font-black uppercase tracking-tight leading-tight mb-1.5 ${
                          previewViewport === "desktop" ? "text-base sm:text-lg" : "text-sm"
                        } ${
                          formData.textTheme === "light"
                            ? "text-white"
                            : "text-neutral-900"
                        }`}
                      >
                        {formData.title || "Your Banner Title Here"}
                      </h4>

                      {formData.subtitle && (
                        <p
                          className={`text-[10px] max-w-xs leading-relaxed line-clamp-2 mb-3 ${
                            formData.textTheme === "light"
                              ? "text-neutral-200"
                              : "text-neutral-700"
                          }`}
                        >
                          {formData.subtitle}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 pt-1">
                        <span className="px-3 py-1 rounded-full bg-white text-black text-[9px] font-bold uppercase tracking-wider shadow-sm">
                          {formData.ctaLabel || "CTA"} →
                        </span>
                        {formData.secondaryCtaLabel && (
                          <span className="px-3 py-1 rounded-full border border-white/60 text-white text-[9px] font-semibold uppercase tracking-wider backdrop-blur-sm">
                            {formData.secondaryCtaLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Smart Quality & Accessibility Warnings */}
                <div className="space-y-2 pt-3 border-t border-neutral-200 dark:border-neutral-800 text-xs">
                  {formData.textTheme === "light" && formData.overlayOpacity < 25 && (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] flex gap-2">
                      <span>⚠️</span>
                      <span>
                        Low contrast risk: Light text with under 25% overlay may be hard to read on vibrant images. Consider increasing overlay opacity.
                      </span>
                    </div>
                  )}

                  {!formData.imageMobile?.url && (
                    <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 text-[11px] flex gap-2">
                      <span>📱</span>
                      <span>
                        Notice: No dedicated mobile image uploaded. The desktop 16:9 banner will be cropped for smartphone viewports.
                      </span>
                    </div>
                  )}

                  {!formData.altText && (
                    <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-[11px] flex gap-2">
                      <span>♿</span>
                      <span>
                        Warning: Alt text is empty. Describe the banner content for accessibility and SEO ranking.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmBanner && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-2xl space-y-4 border border-neutral-200 dark:border-neutral-800 animate-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center text-lg">
              🗑️
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Delete Hero Banner?
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                Are you sure you want to delete &ldquo;{deleteConfirmBanner.title}&rdquo;? This will immediately remove it from the storefront and revalidate the cache.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmBanner(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
