"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Image from "next/image";

export interface CategoryTrending {
  enabled: boolean;
  sortOrder: number;
  tileImage?: {
    url: string;
    publicId?: string;
  };
  tileLabel?: string;
  badge?: string;
}

export interface CategoryItem {
  _id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl?: string;
  gender: "MEN" | "KIDS" | "UNISEX";
  parentId: string | null;
  parentName?: string | null;
  isActive: boolean;
  trending?: CategoryTrending;
  productCount: number;
  createdAt: string;
  updatedAt?: string;
}

export function CategoriesManager() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<"taxonomy" | "trending">("taxonomy");

  // Filters for Taxonomy
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modal states for Taxonomy Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryItem | null>(null);

  // Form states for Taxonomy
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    imageUrl: "",
    gender: "MEN" as "MEN" | "KIDS" | "UNISEX",
    parentId: "",
    isActive: true,
  });
  const [isAutoSlug, setIsAutoSlug] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Trending state
  const [trendingList, setTrendingList] = useState<CategoryItem[]>([]);
  const [isSavingTrending, setIsSavingTrending] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [uploadingForId, setUploadingForId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [targetCategoryForUpload, setTargetCategoryForUpload] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/categories");
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to load categories");
      }
      const data = await res.json();
      const loaded: CategoryItem[] = data.categories || [];
      setCategories(loaded);

      // Initialize trending list: sort by trending.sortOrder asc, prioritizing enabled
      const sortedTrending = [...loaded].sort((a, b) => {
        const aEnabled = a.trending?.enabled ? 1 : 0;
        const bEnabled = b.trending?.enabled ? 1 : 0;
        if (aEnabled !== bEnabled) return bEnabled - aEnabled;
        return (a.trending?.sortOrder ?? 0) - (b.trending?.sortOrder ?? 0);
      });
      setTrendingList(sortedTrending);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching categories");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Flash success message helper
  const notifySuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Helper to slugify category name
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
    setEditingCategory(null);
    setFormData({
      name: "",
      slug: "",
      description: "",
      imageUrl: "",
      gender: genderFilter !== "ALL" ? (genderFilter as "MEN" | "KIDS" | "UNISEX") : "MEN",
      parentId: "",
      isActive: true,
    });
    setIsAutoSlug(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      imageUrl: cat.imageUrl || "",
      gender: cat.gender,
      parentId: cat.parentId || "",
      isActive: cat.isActive,
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
      const url = editingCategory
        ? `/api/admin/categories/${editingCategory._id}`
        : "/api/admin/categories";
      const method = editingCategory ? "PUT" : "POST";

      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim(),
        imageUrl: formData.imageUrl.trim() || undefined,
        gender: formData.gender,
        parentId: formData.parentId || null,
        isActive: formData.isActive,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to save category");
      }

      notifySuccess(
        editingCategory
          ? `Category '${formData.name}' updated successfully.`
          : `Category '${formData.name}' created successfully.`,
      );
      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error saving category");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/categories/${deleteTarget._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete category");
      }
      notifySuccess(`Category '${deleteTarget.name}' deleted.`);
      setDeleteTarget(null);
      fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deleting category");
    } finally {
      setIsDeleting(false);
    }
  };

  // ---------------- TRENDING HANDLERS ----------------
  const activeTrendingCount = useMemo(() => {
    return trendingList.filter((c) => c.trending?.enabled).length;
  }, [trendingList]);

  const enabledTrendingCategories = useMemo(() => {
    return trendingList.filter((c) => c.trending?.enabled).slice(0, 8);
  }, [trendingList]);

  const toggleTrendingEnabled = (categoryId: string) => {
    setTrendingList((prev) =>
      prev.map((item) => {
        if (item._id === categoryId) {
          const currentTrending = item.trending || { enabled: false, sortOrder: 0 };
          return {
            ...item,
            trending: {
              ...currentTrending,
              enabled: !currentTrending.enabled,
            },
          };
        }
        return item;
      }),
    );
  };

  const updateTrendingField = (
    categoryId: string,
    field: "tileLabel" | "badge",
    value: string,
  ) => {
    setTrendingList((prev) =>
      prev.map((item) => {
        if (item._id === categoryId) {
          const currentTrending = item.trending || { enabled: false, sortOrder: 0 };
          return {
            ...item,
            trending: {
              ...currentTrending,
              [field]: value,
            },
          };
        }
        return item;
      }),
    );
  };

  const moveTrendingItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= trendingList.length) return;
    const updated = [...trendingList];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);

    // Re-assign sortOrder based on new positions
    const reordered = updated.map((item, index) => ({
      ...item,
      trending: {
        ...(item.trending || { enabled: false, sortOrder: 0 }),
        sortOrder: index,
      },
    }));
    setTrendingList(reordered);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    moveTrendingItem(draggedIndex, index);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleTriggerUpload = (categoryId: string) => {
    setTargetCategoryForUpload(categoryId);
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetCategoryForUpload) return;

    const currentTarget = targetCategoryForUpload;
    setUploadingForId(currentTarget);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: uploadData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload image");
      }

      // Handle upload for modal category creation/editing
      if (currentTarget === "__FORM_MODAL__") {
        setFormData((prev) => ({ ...prev, imageUrl: data.url }));
        notifySuccess("Image uploaded successfully!");
        return;
      }

      setTrendingList((prev) =>
        prev.map((cat) => {
          if (cat._id === currentTarget) {
            const currentTrending = cat.trending || { enabled: false, sortOrder: 0 };
            return {
              ...cat,
              trending: {
                ...currentTrending,
                tileImage: {
                  url: data.url,
                  publicId: data.publicId,
                },
              },
            };
          }
          return cat;
        }),
      );

      setCategories((prev) =>
        prev.map((cat) => {
          if (cat._id === currentTarget) {
            const currentTrending = cat.trending || { enabled: false, sortOrder: 0 };
            return {
              ...cat,
              trending: {
                ...currentTrending,
                tileImage: {
                  url: data.url,
                  publicId: data.publicId,
                },
              },
            };
          }
          return cat;
        }),
      );

      // Auto-persist tileImage to DB so it persists immediately
      const targetCat = categories.find((c) => c._id === currentTarget);
      if (targetCat) {
        const currentTrending = targetCat.trending || { enabled: false, sortOrder: 0 };
        const putRes = await fetch(`/api/admin/categories/${currentTarget}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: targetCat.name,
            slug: targetCat.slug,
            description: targetCat.description,
            gender: targetCat.gender,
            parentId: targetCat.parentId,
            isActive: targetCat.isActive,
            imageUrl: targetCat.imageUrl,
            trending: {
              ...currentTrending,
              tileImage: {
                url: data.url,
                publicId: data.publicId,
              },
            },
          }),
        });
        if (!putRes.ok) {
          const putErr = await putRes.json().catch(() => ({}));
          console.warn("Auto-persist tileImage warning:", putErr);
        }
      }

      notifySuccess("Tile image uploaded successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error uploading image");
    } finally {
      setUploadingForId(null);
      setTargetCategoryForUpload(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveTileImage = (categoryId: string) => {
    setTrendingList((prev) =>
      prev.map((cat) => {
        if (cat._id === categoryId && cat.trending) {
          return {
            ...cat,
            trending: {
              ...cat.trending,
              tileImage: undefined,
            },
          };
        }
        return cat;
      }),
    );
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat._id === categoryId && cat.trending) {
          return {
            ...cat,
            trending: {
              ...cat.trending,
              tileImage: undefined,
            },
          };
        }
        return cat;
      }),
    );
  };

  const saveTrendingSettings = async () => {
    setIsSavingTrending(true);
    setError(null);
    try {
      // 1. Batch reorder and sync status
      const reorderPayload = {
        items: trendingList.map((item, index) => ({
          id: item._id,
          sortOrder: index,
          enabled: !!item.trending?.enabled,
        })),
      };

      const reorderRes = await fetch("/api/admin/categories/trending/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reorderPayload),
      });

      if (!reorderRes.ok) {
        const errJson = await reorderRes.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to reorder categories");
      }

      // 2. Persist custom labels, badges, and images per category
      await Promise.all(
        trendingList.map(async (item) => {
          if (item.trending) {
            await fetch(`/api/admin/categories/${item._id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: item.name,
                slug: item.slug,
                description: item.description,
                gender: item.gender,
                parentId: item.parentId,
                isActive: item.isActive,
                imageUrl: item.imageUrl,
                trending: item.trending,
              }),
            });
          }
        }),
      );

      notifySuccess("Trending categories saved and published to storefront!");
      fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving trending settings");
    } finally {
      setIsSavingTrending(false);
    }
  };

  // ---------------- TAXONOMY FILTERS ----------------
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.slug.toLowerCase().includes(search.toLowerCase());
      const matchGender = genderFilter === "ALL" || c.gender === genderFilter;
      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && c.isActive) ||
        (statusFilter === "INACTIVE" && !c.isActive);
      return matchSearch && matchGender && matchStatus;
    });
  }, [categories, search, genderFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Hidden file input for tile image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Success Notification */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#1B2A4A] text-white px-4 py-3 rounded-xl shadow-xl text-xs font-semibold animate-fade-in border border-[#2B406B]">
          <span>✓</span>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded-xl text-xs flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Categories & Taxonomy
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Manage your product hierarchy, parent-child structures, and homepage trending showcases.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === "taxonomy" ? (
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#8C7A58] text-white hover:bg-[#786745] shadow-sm transition-all"
            >
              <span>+</span>
              <span>Create Category</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={saveTrendingSettings}
              disabled={isSavingTrending}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#8C7A58] text-white hover:bg-[#786745] disabled:opacity-50 shadow-sm transition-all"
            >
              {isSavingTrending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>Save Trending Settings</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs Header */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-px overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("taxonomy")}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === "taxonomy"
              ? "border-[#8C7A58] text-[#8C7A58]"
              : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          }`}
        >
          <span>🗂️</span>
          <span>Taxonomy Hierarchy</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
            {categories.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("trending")}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === "trending"
              ? "border-[#8C7A58] text-[#8C7A58]"
              : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          }`}
        >
          <span>⭐</span>
          <span>Trending Showcase</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
              activeTrendingCount > 8
                ? "bg-amber-100 text-amber-800 border border-amber-300"
                : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
            }`}
          >
            {activeTrendingCount} / 8 Active
          </span>
        </button>
      </div>

      {/* ================= TAB 1: TAXONOMY ================= */}
      {activeTab === "taxonomy" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Search categories by name or slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C7A58]"
              />
              <span className="absolute left-3 top-2.5 text-neutral-400 text-xs">🔍</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C7A58]"
              >
                <option value="ALL">All Genders</option>
                <option value="MEN">Men</option>
                <option value="KIDS">Kids</option>
                <option value="UNISEX">Unisex</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C7A58]"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          {/* Taxonomy Table */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-2">
              <div className="w-7 h-7 border-2 border-[#8C7A58] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-neutral-500">Loading categories...</p>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
              <p className="text-xs text-neutral-500">No categories found matching your search.</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    <th className="py-3 px-4">Category Name</th>
                    <th className="py-3 px-4">Gender</th>
                    <th className="py-3 px-4">Parent Category</th>
                    <th className="py-3 px-4">Products</th>
                    <th className="py-3 px-4">Trending</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-medium">
                  {filteredCategories.map((cat) => (
                    <tr key={cat._id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-neutral-900 dark:text-neutral-100">{cat.name}</div>
                        <div className="text-[11px] font-mono text-neutral-400">/{cat.slug}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                          {cat.gender}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-neutral-500">
                        {cat.parentName || <span className="text-neutral-400 italic">None (Root)</span>}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                          {cat.productCount}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {cat.trending?.enabled ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                            ⭐ #{cat.trending.sortOrder + 1}
                          </span>
                        ) : (
                          <span className="text-[11px] text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            cat.isActive
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                          }`}
                        >
                          {cat.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(cat)}
                            className="px-2.5 py-1 text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget(cat)}
                            className="p-1 text-neutral-400 hover:text-red-500 transition"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: TRENDING SHOWCASE ================= */}
      {activeTab === "trending" && (
        <div className="space-y-6">
          {/* Explanation Banner */}
          <div className="bg-gradient-to-r from-[#F7F4EE] to-[#EFEBD9] dark:from-neutral-900 dark:to-neutral-800/80 p-5 rounded-2xl border border-[#E0D8C4] dark:border-neutral-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">⭐</span>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Homepage Trending Categories Curation
                </h3>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1 max-w-2xl leading-relaxed">
                The storefront displays up to <strong>8 enabled categories</strong> ordered by the ranks below. Drag
                and drop rows to rearrange order. You can set a custom tile image (recommended 4:5 aspect ratio), an
                optional promotional badge (e.g. &quot;Up to 40% off&quot;), and a custom label override.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#8C7A58] bg-white dark:bg-neutral-900 px-3 py-1.5 rounded-xl border border-[#D5CBB5] dark:border-neutral-700 shadow-sm">
                {activeTrendingCount} / 8 Active
              </span>
            </div>
          </div>

          {/* Live Storefront Preview Strip (4:5 Cards) */}
          <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                  Live Storefront Preview
                </h4>
                <p className="text-[11px] text-neutral-400">
                  Real-time preview of how cards will render on the homepage (4:5 Aspect Ratio).
                </p>
              </div>
              <span className="text-[11px] text-neutral-400 font-mono">
                {enabledTrendingCategories.length} items rendered
              </span>
            </div>

            {enabledTrendingCategories.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs text-neutral-400">
                No trending categories are currently enabled. Enable categories below to build the showcase.
              </div>
            ) : (
              <div className="overflow-x-auto pb-2">
                <div className="flex gap-4 w-max min-w-full">
                  {enabledTrendingCategories.map((cat, idx) => {
                    const tileImg = cat.trending?.tileImage?.url || cat.imageUrl || "/images/placeholder.jpg";
                    const label = cat.trending?.tileLabel?.trim() || cat.name;
                    const badge = cat.trending?.badge?.trim();

                    return (
                      <div
                        key={cat._id}
                        className="w-48 flex-shrink-0 group relative flex flex-col justify-end p-4 rounded-2xl overflow-hidden aspect-[4/5] bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm transition hover:scale-[1.02]"
                      >
                        {/* Background Image */}
                        <Image
                          src={tileImg}
                          alt={label}
                          fill
                          className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent z-10" />

                        {/* Promotional Badge */}
                        {badge && (
                          <div className="absolute top-3 left-3 z-20 text-[9px] font-bold uppercase tracking-wider bg-[#8C7A58] text-white px-2 py-0.5 rounded shadow">
                            {badge}
                          </div>
                        )}

                        {/* Rank tag */}
                        <div className="absolute top-3 right-3 z-20 text-[9px] font-mono font-bold bg-black/60 text-white/90 px-1.5 py-0.5 rounded backdrop-blur-sm">
                          #{idx + 1}
                        </div>

                        {/* Meta */}
                        <div className="relative z-20 space-y-1">
                          <span className="text-[9px] uppercase font-bold tracking-widest text-[#D5CBB5]">
                            {cat.gender} Collection
                          </span>
                          <h5 className="text-sm font-bold text-white line-clamp-1">{label}</h5>
                          <p className="text-[10px] text-white/80 font-light">
                            {cat.productCount} {cat.productCount === 1 ? "Product" : "Products"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Trending Curation Table */}
          <div className="overflow-x-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  <th className="py-3 px-3 w-20 text-center">Rank</th>
                  <th className="py-3 px-3 w-16">Trending</th>
                  <th className="py-3 px-4 w-48">Category</th>
                  <th className="py-3 px-4 w-52">Tile Label Override</th>
                  <th className="py-3 px-4 w-44">Promo Badge</th>
                  <th className="py-3 px-4 w-60">4:5 Tile Artwork</th>
                  <th className="py-3 px-3 text-center w-24">Reorder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {trendingList.map((cat, index) => {
                  const isEnabled = !!cat.trending?.enabled;
                  const tileImg = cat.trending?.tileImage?.url;
                  const fallbackImg = cat.imageUrl || "/images/placeholder.jpg";
                  const displayImg = tileImg || fallbackImg;

                  return (
                    <tr
                      key={cat._id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`transition ${
                        isEnabled
                          ? "bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                          : "bg-neutral-50/50 dark:bg-neutral-900/40 opacity-70 hover:opacity-100"
                      } ${draggedIndex === index ? "opacity-40 border-2 border-[#8C7A58]" : ""}`}
                    >
                      {/* Rank */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-neutral-400">
                        {isEnabled ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#8C7A58]/10 text-[#8C7A58] border border-[#8C7A58]/20">
                            #{index + 1}
                          </span>
                        ) : (
                          <span className="text-[11px] text-neutral-400">—</span>
                        )}
                      </td>

                      {/* Enable Switch */}
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => toggleTrendingEnabled(cat._id)}
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isEnabled ? "bg-emerald-600" : "bg-neutral-300 dark:bg-neutral-700"
                          }`}
                          title={isEnabled ? "Disable from trending" : "Enable in trending"}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              isEnabled ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </td>

                      {/* Category Details */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-neutral-900 dark:text-neutral-100">{cat.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                            {cat.gender}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono">/{cat.slug}</span>
                        </div>
                      </td>

                      {/* Tile Label Override */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={cat.trending?.tileLabel || ""}
                          placeholder={`Defaults to: ${cat.name}`}
                          onChange={(e) => updateTrendingField(cat._id, "tileLabel", e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#8C7A58]"
                        />
                      </td>

                      {/* Promotional Badge */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={cat.trending?.badge || ""}
                          placeholder="e.g. Up to 40% off"
                          onChange={(e) => updateTrendingField(cat._id, "badge", e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#8C7A58]"
                        />
                      </td>

                      {/* 4:5 Tile Artwork & Upload */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-12 bg-neutral-200 dark:bg-neutral-800 rounded-lg overflow-hidden flex-shrink-0 border border-neutral-200 dark:border-neutral-700">
                            <Image src={displayImg} alt={cat.name} fill className="object-cover" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleTriggerUpload(cat._id)}
                                disabled={uploadingForId === cat._id}
                                className="px-2 py-1 text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition"
                              >
                                {uploadingForId === cat._id ? "Uploading..." : "Upload 4:5"}
                              </button>
                              {tileImg && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTileImage(cat._id)}
                                  className="text-[10px] text-red-500 hover:underline"
                                  title="Revert to category fallback"
                                >
                                  Reset
                                </button>
                              )}
                            </div>
                            <span className="text-[10px] text-neutral-400">
                              {tileImg ? "Custom 4:5 tile" : "Using category fallback"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Reorder Buttons */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveTrendingItem(index, index - 1)}
                            disabled={index === 0}
                            className="p-1 text-xs text-neutral-400 hover:text-neutral-800 disabled:opacity-20"
                            title="Move up"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => moveTrendingItem(index, index + 1)}
                            disabled={index === trendingList.length - 1}
                            className="p-1 text-xs text-neutral-400 hover:text-neutral-800 disabled:opacity-20"
                            title="Move down"
                          >
                            ▼
                          </button>
                          <span className="text-neutral-400 cursor-grab active:cursor-grabbing text-sm ml-1" title="Drag to reorder">
                            ⋮⋮
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Category Add / Edit Modal (Taxonomy) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {editingCategory ? `Edit '${editingCategory.name}'` : "Create New Category"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 mx-6 mt-4 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Linen Shirts"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C7A58]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                    Slug *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAutoSlug(!isAutoSlug)}
                    className="text-[10px] text-[#8C7A58] hover:underline"
                  >
                    {isAutoSlug ? "Unlock" : "Lock Auto"}
                  </button>
                </div>
                <input
                  type="text"
                  required
                  readOnly={isAutoSlug}
                  placeholder="linen-shirts"
                  value={formData.slug}
                  onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                  className={`w-full px-3.5 py-2 text-xs font-mono rounded-xl border ${
                    isAutoSlug
                      ? "bg-neutral-100 dark:bg-neutral-800/50 text-neutral-500 border-neutral-200 cursor-not-allowed"
                      : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#8C7A58]"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                    Gender *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        gender: e.target.value as "MEN" | "KIDS" | "UNISEX",
                      }))
                    }
                    className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C7A58]"
                  >
                    <option value="MEN">Men</option>
                    <option value="KIDS">Kids</option>
                    <option value="UNISEX">Unisex</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                    Parent Category
                  </label>
                  <select
                    value={formData.parentId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, parentId: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C7A58]"
                  >
                    <option value="">None (Root Category)</option>
                    {categories
                      .filter((c) => !editingCategory || c._id !== editingCategory._id)
                      .map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name} ({c.gender})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                  Category Image (Optional)
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Image URL or upload a file..."
                      value={formData.imageUrl}
                      onChange={(e) => setFormData((prev) => ({ ...prev, imageUrl: e.target.value }))}
                      className="flex-1 px-3.5 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C7A58]"
                    />
                    <button
                      type="button"
                      onClick={() => handleTriggerUpload("__FORM_MODAL__")}
                      disabled={uploadingForId === "__FORM_MODAL__"}
                      className="px-3 py-2 text-xs font-bold bg-[#8C7A58] text-white hover:bg-[#786747] rounded-xl transition flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50"
                    >
                      {uploadingForId === "__FORM_MODAL__" ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <span>↑</span> Upload
                        </>
                      )}
                    </button>
                  </div>
                  {formData.imageUrl && (
                    <div className="flex items-center gap-2.5 p-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-200">
                        <Image
                          src={formData.imageUrl}
                          alt="Category preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-mono text-neutral-600 dark:text-neutral-400 truncate">
                          {formData.imageUrl}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, imageUrl: "" }))}
                        className="text-xs text-red-500 hover:text-red-700 font-bold px-2 py-1"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Category description..."
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3.5 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C7A58]"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                  Active
                </span>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, isActive: !prev.isActive }))}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    formData.isActive ? "bg-emerald-600" : "bg-neutral-300 dark:bg-neutral-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      formData.isActive ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#8C7A58] text-white hover:bg-[#786745] disabled:opacity-50 shadow-sm"
                >
                  {isSaving ? "Saving..." : editingCategory ? "Save Changes" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Delete &apos;{deleteTarget.name}&apos;?
            </h3>
            <p className="text-xs text-neutral-500 mt-2 mb-6 leading-relaxed">
              Are you sure you want to delete this category? This action cannot be undone if products or child
              categories depend on it.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Category"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
