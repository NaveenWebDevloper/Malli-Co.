"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";

export function SeasonalBannerManager() {
  const [activeBanner, setActiveBanner] = useState<string>("");
  const [selectedBanner, setSelectedBanner] = useState<string>("");
  const [availableBanners, setAvailableBanners] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetch("/api/admin/banners/seasonal")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success) {
          setActiveBanner(data.activeBanner);
          setSelectedBanner(data.activeBanner);
          setAvailableBanners(data.availableBanners || []);
        }
      })
      .catch((err) => console.error("Failed to load seasonal banner:", err))
      .finally(() => setIsLoading(false));
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveActiveBanner = async () => {
    if (!selectedBanner || selectedBanner === activeBanner) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/banners/seasonal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bannerUrl: selectedBanner }),
      });

      if (!res.ok) {
        throw new Error("Failed to update active seasonal banner");
      }

      const data = await res.json();
      setActiveBanner(data.activeBanner);
      showToast("✓ Active Seasonal Essentials banner updated on storefront!");
    } catch (err) {
      console.error(err);
      alert("Could not update banner. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/banners/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const data = await res.json();
      const newUrl = data.url;
      if (newUrl) {
        setAvailableBanners((prev) => [newUrl, ...prev.filter((u) => u !== newUrl)]);
        setSelectedBanner(newUrl);
        showToast("✓ New campaign banner uploaded. Click 'Save Active Banner' to apply.");
      }
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload image. Please verify file format and size.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-[#141414] p-6 text-center text-neutral-400 text-sm">
        Loading Seasonal Banner settings...
      </div>
    );
  }

  const hasUnsavedChanges = selectedBanner !== activeBanner;

  return (
    <div className="rounded-2xl border border-neutral-800 bg-[#121212] p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Seasonal Essentials Editorial Banner
            </h2>
          </div>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
            Choose or upload the background banner image displayed on the storefront for the{" "}
            <span className="text-neutral-200 font-semibold">AUTUMN 26 WINTER</span> campaign section. Only administrators can access this setting.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl border border-neutral-700 bg-neutral-800/80 hover:bg-neutral-700 text-white text-xs font-semibold tracking-wider transition-all disabled:opacity-50 cursor-pointer"
          >
            {isUploading ? "Uploading..." : "+ Upload New Banner"}
          </button>

          <button
            type="button"
            disabled={!hasUnsavedChanges || isSaving}
            onClick={handleSaveActiveBanner}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md cursor-pointer"
          >
            {isSaving ? "Saving..." : hasUnsavedChanges ? "Save Active Banner" : "Active on Storefront"}
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-xs font-semibold text-emerald-300 flex items-center justify-between animate-in fade-in duration-200">
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage(null)} className="text-emerald-400">
            ✕
          </button>
        </div>
      )}

      {/* Live Preview Area */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="font-semibold uppercase tracking-wider">
            Live Preview {hasUnsavedChanges ? "(Previewing Selection)" : "(Active)"}
          </span>
          <span className="text-[11px] font-mono text-neutral-500 truncate max-w-sm">
            {selectedBanner}
          </span>
        </div>

        <div className="relative aspect-[16/7] w-full max-h-[360px] rounded-2xl overflow-hidden border border-neutral-700 bg-black">
          {selectedBanner && (
            <Image
              src={selectedBanner}
              alt="Seasonal Essentials Banner Preview"
              fill
              sizes="(max-width: 1200px) 100vw, 1200px"
              className="object-cover object-center"
            />
          )}
          {/* Subtle gradient overlay identical to storefront */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/75 pointer-events-none" />

          {/* Overlay Tag Preview */}
          <div className="absolute top-4 right-4 text-right pointer-events-none">
            <div className="flex items-baseline justify-end gap-2">
              <span className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                AUTUMN
              </span>
              <span
                className="text-2xl sm:text-3xl font-black text-transparent uppercase tracking-tight"
                style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.9)" }}
              >
                26
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight border-b border-white/80 pb-0.5">
              WINTER
            </div>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-300">
              Malli &amp; Co. Collection
            </span>
          </div>

          <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20 text-[11px] font-semibold text-white">
            {selectedBanner === activeBanner ? (
              <span className="text-emerald-400 font-bold">● Active Storefront Banner</span>
            ) : (
              <span className="text-amber-400 font-bold">▲ Selected (Click &apos;Save Active Banner&apos; above)</span>
            )}
          </div>
        </div>
      </div>

      {/* Available Banners Gallery */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="font-semibold uppercase tracking-wider">
            Available Banners in /public/uploads/banners/ ({availableBanners.length})
          </span>
          <span className="text-[11px] text-neutral-500">
            Click any thumbnail to preview and set as active
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {availableBanners.map((url, index) => {
            const isSelected = selectedBanner === url;
            const isActive = activeBanner === url;

            return (
              <button
                key={url}
                type="button"
                onClick={() => setSelectedBanner(url)}
                className={`group relative aspect-[16/9] rounded-xl overflow-hidden border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-amber-400 ring-2 ring-amber-400/50 scale-[1.02]"
                    : "border-neutral-800 hover:border-neutral-600 opacity-70 hover:opacity-100"
                }`}
              >
                <Image
                  src={url}
                  alt={`Banner ${index + 1}`}
                  fill
                  sizes="280px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />

                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-bold">
                  <span className="text-white drop-shadow-xs">Banner {index + 1}</span>
                  {isActive ? (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-black text-[9px] uppercase font-black">
                      Active
                    </span>
                  ) : isSelected ? (
                    <span className="px-1.5 py-0.5 rounded bg-amber-400 text-black text-[9px] uppercase font-black">
                      Selected
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default SeasonalBannerManager;

