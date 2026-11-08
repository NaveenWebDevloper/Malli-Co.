"use client";

import React, { useState } from "react";
import Image from "next/image";

interface ProductImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  availableColors?: string[];
  colorImages?: Record<string, string[]>;
  onColorImagesChange?: (colorImages: Record<string, string[]>) => void;
}

export default function ProductImageUploader({
  images,
  onChange,
  availableColors = [],
  colorImages = {},
  onColorImagesChange,
}: ProductImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // File upload handler calling /api/admin/upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setErrorMsg(null);

    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.error || `Upload failed for ${file.name}`);
        }

        if (data.url) {
          uploadedUrls.push(data.url);
        }
      }

      onChange([...images, ...uploadedUrls]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Image upload error";
      setErrorMsg(msg);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  // HTML5 Drag-to-Reorder Handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const updated = [...images];
    const [movedItem] = updated.splice(draggedIndex, 1);
    updated.splice(dropIndex, 0, movedItem);

    onChange(updated);
    setDraggedIndex(null);
  };

  const handleRemove = (index: number) => {
    const targetUrl = images[index];
    onChange(images.filter((_, i) => i !== index));

    // Remove from color galleries if assigned
    if (onColorImagesChange && colorImages) {
      const updatedColors: Record<string, string[]> = {};
      for (const [color, urls] of Object.entries(colorImages)) {
        updatedColors[color] = urls.filter((u) => u !== targetUrl);
      }
      onColorImagesChange(updatedColors);
    }
  };

  const handleToggleColorImage = (color: string, url: string) => {
    if (!onColorImagesChange) return;

    const currentList = colorImages[color] || [];
    const isAssigned = currentList.includes(url);

    const updated = isAssigned
      ? currentList.filter((u) => u !== url)
      : [...currentList, url];

    onColorImagesChange({
      ...colorImages,
      [color]: updated,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
            Product Photography ({images.length})
          </label>
          <p className="text-[11px] text-neutral-500">
            Drag cards to reorder image sequence. First image will be primary
            thumbnail.
          </p>
        </div>

        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 shadow-sm transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700">
          <span>{isUploading ? "Uploading..." : "📁 Upload Images"}</span>
          <input
            type="file"
            multiple
            accept="image/*"
            disabled={isUploading}
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {errorMsg && (
        <p className="rounded bg-red-50 p-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {errorMsg}
        </p>
      )}

      {/* Images Grid with Drag and Drop */}
      {images.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 p-8 text-center text-xs text-neutral-400 dark:border-neutral-700">
          <span className="text-2xl">📸</span>
          <p className="mt-2 font-medium">No product images uploaded yet.</p>
          <p className="text-[11px]">
            Upload photos to activate drag-and-drop sequencing and color gallery
            linking.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {images.map((url, idx) => (
            <div
              key={`${url}-${idx}`}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(idx)}
              className={`group relative aspect-square overflow-hidden rounded-lg border bg-neutral-100 transition-all cursor-grab active:cursor-grabbing dark:bg-neutral-800 ${
                idx === 0
                  ? "border-black ring-2 ring-black dark:border-white dark:ring-white"
                  : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-400"
              }`}
            >
              <Image
                src={url}
                alt={`Product image ${idx + 1}`}
                fill
                unoptimized
                sizes="(max-width: 768px) 50vw, 16vw"
                className="object-cover"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.src = "/images/products/linen-oxford-front.jpg";
                }}
              />

              {idx === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider backdrop-blur-xs">
                  Primary
                </span>
              )}

              {/* Action Buttons Overlay */}
              <div className="absolute inset-0 flex flex-col justify-between bg-black/40 p-1.5 opacity-0 transition group-hover:opacity-100">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white hover:bg-red-700"
                    title="Remove Image"
                  >
                    ×
                  </button>
                </div>

                {/* Color tagging chips */}
                {availableColors.length > 0 && onColorImagesChange && (
                  <div className="flex flex-wrap gap-1">
                    {availableColors.map((color) => {
                      const isTagged = (colorImages[color] || []).includes(url);
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => handleToggleColorImage(color, url)}
                          className={`rounded px-1 py-0.5 text-[9px] font-semibold transition ${
                            isTagged
                              ? "bg-amber-400 text-black shadow"
                              : "bg-white/80 text-black hover:bg-white"
                          }`}
                        >
                          {color} {isTagged ? "✓" : "+"}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
