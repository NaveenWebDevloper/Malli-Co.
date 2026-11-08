"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";

export interface BrandItem {
  _id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl?: string;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt?: string;
}

export function BrandsManager() {
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BrandItem | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    logoUrl: "",
    isActive: true,
  });
  const [isAutoSlug, setIsAutoSlug] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchBrands = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/brands");
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to load brands");
      }
      const data = await res.json();
      setBrands(data.brands || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching brands");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const notifySuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const handleNameChange = (val: string) => {
    setFormData((prev) => ({
      ...prev,
      name: val,
      slug: isAutoSlug ? slugify(val) : prev.slug,
    }));
  };

  const openAddModal = () => {
    setEditingBrand(null);
    setFormData({
      name: "",
      slug: "",
      description: "",
      logoUrl: "",
      isActive: true,
    });
    setIsAutoSlug(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (b: BrandItem) => {
    setEditingBrand(b);
    setFormData({
      name: b.name,
      slug: b.slug,
      description: b.description || "",
      logoUrl: b.logoUrl || "",
      isActive: b.isActive,
    });
    setIsAutoSlug(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSaving(true);

    try {
      const url = editingBrand
        ? `/api/admin/brands/${editingBrand._id}`
        : "/api/admin/brands";
      const method = editingBrand ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          logoUrl: formData.logoUrl,
          isActive: formData.isActive,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to save brand");
      }

      notifySuccess(json.message || "Brand saved successfully");
      setIsModalOpen(false);
      await fetchBrands();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/brands/${deleteTarget._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to delete brand");
      }
      notifySuccess(json.message || "Brand deleted successfully");
      setDeleteTarget(null);
      await fetchBrands();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete brand");
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredBrands = useMemo(() => {
    return brands.filter((b) => {
      const matchesSearch =
        !search ||
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.slug.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" ? b.isActive : !b.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [brands, search, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300">
          ✓ {successMessage}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800 dark:border-red-800/40 dark:bg-red-950/40 dark:text-red-300 flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-900 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Brands & Labels
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Malli Heritage, Little Malli, and house artisan labels.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 shadow-sm transition-all"
        >
          <span>＋ Add Brand</span>
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search brand name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 bg-neutral-50 py-2 pl-9 pr-4 text-xs text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
          <span className="absolute left-3 top-2.5 text-xs text-neutral-400">
            🔍
          </span>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 focus:border-neutral-900 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Grid of Brand Cards */}
      {isLoading ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center text-neutral-500 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-neutral-400 border-t-neutral-900 dark:border-neutral-600 dark:border-t-white" />
          <p className="mt-2 text-xs">Loading brands...</p>
        </div>
      ) : filteredBrands.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center text-neutral-500 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          No brands found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBrands.map((brand) => (
            <div
              key={brand._id}
              className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
            >
              <div>
                {/* Brand Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {brand.logoUrl ? (
                      <div className="relative h-11 w-11 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
                        <Image
                          src={brand.logoUrl}
                          alt={brand.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900 text-sm font-bold text-white uppercase tracking-wider dark:bg-neutral-800 dark:text-neutral-100">
                        {brand.name.slice(0, 2)}
                      </div>
                    )}
                    <div>
                      <h2 className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                        {brand.name}
                      </h2>
                      <span className="font-mono text-[11px] text-neutral-500">
                        /{brand.slug}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      brand.isActive
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                        : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        brand.isActive ? "bg-emerald-500" : "bg-neutral-400"
                      }`}
                    />
                    {brand.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Description */}
                <p className="mt-3 text-xs text-neutral-600 dark:text-neutral-300 line-clamp-2">
                  {brand.description || "No description provided."}
                </p>
              </div>

              {/* Card Footer */}
              <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
                <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                  <span>👔</span>
                  <span>
                    <strong>{brand.productCount}</strong> product
                    {brand.productCount === 1 ? "" : "s"}
                  </span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(brand)}
                    className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-700 shadow-xs hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(brand)}
                    className="rounded-lg border border-red-100 bg-red-50/50 px-2.5 py-1 text-[11px] font-semibold text-red-600 shadow-xs hover:bg-red-100/60 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/60"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-800">
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {editingBrand ? `Edit Brand: ${editingBrand.name}` : "Create Brand / Label"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300">
                  Brand Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Malli Heritage"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                    Slug <span className="text-red-500">*</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-[10px] text-neutral-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAutoSlug}
                      onChange={(e) => setIsAutoSlug(e.target.checked)}
                      className="rounded border-neutral-300"
                    />
                    <span>Auto-generate</span>
                  </label>
                </div>
                <div className="mt-1 flex items-center rounded-xl border border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/60">
                  <span className="pl-3 text-neutral-400 font-mono">/brand/</span>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => {
                      setIsAutoSlug(false);
                      setFormData((prev) => ({ ...prev, slug: e.target.value.toLowerCase() }));
                    }}
                    className="w-full bg-transparent px-2 py-2 font-mono text-xs text-neutral-900 focus:outline-none dark:text-neutral-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300">
                  Logo / Mark URL
                </label>
                <input
                  type="text"
                  placeholder="https://... or /images/brands/logo.png"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, logoUrl: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Brand positioning, artisan history, or label notes..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="brandActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                />
                <label
                  htmlFor="brandActiveToggle"
                  className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 cursor-pointer"
                >
                  Active on storefront (accessible in catalog & filters)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-900 shadow-sm transition-all"
                >
                  {isSaving ? "Saving..." : editingBrand ? "Update Brand" : "Create Brand"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="text-sm font-bold text-red-600 dark:text-red-400">
              Confirm Brand Deletion
            </h3>
            <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Are you sure you want to delete brand{" "}
              <strong className="text-neutral-900 dark:text-neutral-100">
                {deleteTarget.name}
              </strong>{" "}
              (<span className="font-mono">/{deleteTarget.slug}</span>)?
            </p>

            {deleteTarget.productCount > 0 ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300">
                ⚠️ <strong>Cannot be deleted:</strong> This brand has{" "}
                <strong>{deleteTarget.productCount}</strong> assigned product(s). You must
                reassign or delete those products before removing this brand.
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-neutral-400">
                This action is permanent and will remove the brand from all filters.
              </p>
            )}

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting || deleteTarget.productCount > 0}
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

