"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { formatCurrency } from "@/lib/currency";

export type CollectionMode = "MANUAL" | "AUTO";
export type CollectionAutoRuleType = "BESTSELLERS" | "NEWEST" | "ON_SALE";

export interface CollectionItem {
  _id: string;
  name: string;
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  bannerImageUrl?: string;
  mode: CollectionMode;
  productCount: number;
  autoRule?: {
    type: CollectionAutoRuleType;
    gender?: "MEN" | "KIDS";
    categoryId?: string;
    limit?: number;
  };
  maxItems: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProductSearchResult {
  _id: string;
  name: string;
  slug: string;
  basePricePaise: number;
  images: string[];
  status: string;
  gender: string;
}

interface SelectedProduct {
  _id: string;
  name: string;
  slug: string;
  image: string;
  basePricePaise: number;
  status: string;
  gender: string;
}

interface CategoryOption {
  _id: string;
  name: string;
  gender: string;
}

interface PreviewProduct {
  _id: string;
  name: string;
  slug: string;
  firstImage: string;
  secondImage: string;
  brand?: { name: string };
  category?: { name: string };
  colorSwatches: Array<{ name: string; hex: string }>;
  totalStock: number;
  hasStock: boolean;
  pricing: {
    basePrice: number;
    compareAtPrice?: number;
    finalPrice: number;
    discountPercent: number;
    badgeLabel?: string;
    themeColor?: string;
  };
}

export function CollectionsManager() {
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modeFilter, setModeFilter] = useState<"ALL" | "MANUAL" | "AUTO">("ALL");

  // Modal / Drawer state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"config" | "preview">("config");

  // Form states
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugLocked, setSlugLocked] = useState(true);
  const [mode, setMode] = useState<CollectionMode>("MANUAL");
  const [maxItems, setMaxItems] = useState(10);
  const [active, setActive] = useState(true);

  // Manual mode state
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [productSearchResults, setProductSearchResults] = useState<ProductSearchResult[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Auto mode state
  const [ruleType, setRuleType] = useState<CollectionAutoRuleType>("BESTSELLERS");
  const [ruleGender, setRuleGender] = useState<"ALL" | "MEN" | "KIDS">("ALL");
  const [ruleCategoryId, setRuleCategoryId] = useState<string>("");
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  // Preview state
  const [previewProducts, setPreviewProducts] = useState<PreviewProduct[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Delete modal state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch collections
  const loadCollections = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/collections");
      const data = await res.json();
      if (res.ok) {
        setCollections(data.collections || []);
      } else {
        showToast(data.error || "Failed to load collections", "error");
      }
    } catch {
      showToast("Network error loading collections", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  // Fetch categories once
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/admin/categories");
        const data = await res.json();
        if (res.ok) {
          setCategories(data.categories || []);
        }
      } catch (e) {
        console.error("Failed to fetch categories:", e);
      }
    }
    loadCategories();
  }, []);

  // Product search with debounce
  useEffect(() => {
    if (!productSearch.trim()) {
      setProductSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingProducts(true);
      try {
        const res = await fetch(`/api/admin/products?search=${encodeURIComponent(productSearch)}&limit=8`);
        const data = await res.json();
        if (res.ok) {
          setProductSearchResults(data.products || []);
        }
      } catch (e) {
        console.error("Product search error:", e);
      } finally {
        setSearchingProducts(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [productSearch]);

  // Auto-generate slug from name if locked
  useEffect(() => {
    if (slugLocked && !editingId) {
      const generated = (title || name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      setSlug(generated);
    }
  }, [title, name, slugLocked, editingId]);

  const fetchLivePreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const payload = {
        name,
        slug,
        title,
        subtitle,
        mode,
        productIds: selectedProducts.map((p) => p._id),
        autoRule: {
          type: ruleType,
          gender: ruleGender === "ALL" ? undefined : ruleGender,
          categoryId: ruleCategoryId || undefined,
          limit: maxItems,
        },
        maxItems,
      };

      const res = await fetch("/api/admin/collections/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setPreviewProducts(data.products || []);
      } else {
        setPreviewProducts([]);
      }
    } catch {
      setPreviewProducts([]);
    } finally {
      setPreviewLoading(false);
    }
  }, [name, slug, title, subtitle, mode, selectedProducts, ruleType, ruleGender, ruleCategoryId, maxItems]);

  // Load preview whenever activeTab is "preview"
  useEffect(() => {
    if (activeTab === "preview" && isModalOpen) {
      fetchLivePreview();
    }
  }, [activeTab, isModalOpen, fetchLivePreview]);

  const openCreateModal = () => {
    setEditingId(null);
    setName("");
    setTitle("");
    setSubtitle("");
    setSlug("");
    setSlugLocked(true);
    setMode("MANUAL");
    setMaxItems(10);
    setActive(true);
    setSelectedProducts([]);
    setProductSearch("");
    setProductSearchResults([]);
    setRuleType("BESTSELLERS");
    setRuleGender("ALL");
    setRuleCategoryId("");
    setActiveTab("config");
    setIsModalOpen(true);
  };

  const openEditModal = async (col: CollectionItem) => {
    setEditingId(col._id);
    setName(col.name);
    setTitle(col.title);
    setSubtitle(col.subtitle || "");
    setSlug(col.slug);
    setSlugLocked(false);
    setMode(col.mode);
    setMaxItems(col.maxItems || 10);
    setActive(col.active);
    setProductSearch("");
    setProductSearchResults([]);
    setActiveTab("config");

    if (col.autoRule) {
      setRuleType(col.autoRule.type);
      setRuleGender((col.autoRule.gender as "MEN" | "KIDS") || "ALL");
      setRuleCategoryId(col.autoRule.categoryId || "");
    } else {
      setRuleType("BESTSELLERS");
      setRuleGender("ALL");
      setRuleCategoryId("");
    }

    setIsModalOpen(true);

    // Fetch full details including populated products
    try {
      const res = await fetch(`/api/admin/collections/${col._id}`);
      const data = await res.json();
      if (res.ok && data.collection?.selectedProducts) {
        setSelectedProducts(data.collection.selectedProducts);
      } else {
        setSelectedProducts([]);
      }
    } catch (e) {
      console.error("Failed to fetch full collection:", e);
      setSelectedProducts([]);
    }
  };

  const toggleActiveStatus = async (col: CollectionItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextActive = !col.active;
    // Optimistic update
    setCollections((prev) =>
      prev.map((c) => (c._id === col._id ? { ...c, active: nextActive } : c)),
    );

    try {
      const res = await fetch(`/api/admin/collections/${col._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: nextActive }),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || "Failed to update status", "error");
        // Revert
        setCollections((prev) =>
          prev.map((c) => (c._id === col._id ? { ...c, active: col.active } : c)),
        );
      } else {
        showToast(`Collection is now ${nextActive ? "Active" : "Inactive"}`, "success");
      }
    } catch {
      showToast("Network error updating status", "error");
      setCollections((prev) =>
        prev.map((c) => (c._id === col._id ? { ...c, active: col.active } : c)),
      );
    }
  };

  const handleAddProduct = (prod: ProductSearchResult) => {
    if (selectedProducts.some((p) => p._id === prod._id)) {
      showToast("Product is already in the collection", "error");
      return;
    }
    const newSelected: SelectedProduct = {
      _id: prod._id,
      name: prod.name,
      slug: prod.slug,
      image: prod.images?.[0] || "/images/placeholder.jpg",
      basePricePaise: prod.basePricePaise,
      status: prod.status,
      gender: prod.gender,
    };
    setSelectedProducts([...selectedProducts, newSelected]);
    setProductSearch("");
    setProductSearchResults([]);
  };

  const handleRemoveProduct = (index: number) => {
    const updated = [...selectedProducts];
    updated.splice(index, 1);
    setSelectedProducts(updated);
  };

  const moveProduct = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= selectedProducts.length) return;
    const updated = [...selectedProducts];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setSelectedProducts(updated);
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    moveProduct(draggedIndex, index);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast("Internal name is required", "error");
      return;
    }
    if (!title.trim()) {
      showToast("Customer title is required", "error");
      return;
    }
    if (!slug.trim()) {
      showToast("Slug is required", "error");
      return;
    }
    if (mode === "MANUAL" && selectedProducts.length === 0) {
      showToast("Please add at least 1 product for a manual collection", "error");
      return;
    }

    const payload = {
      name: name.trim(),
      slug: slug.trim(),
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      mode,
      maxItems: Number(maxItems),
      active,
      productIds: mode === "MANUAL" ? selectedProducts.map((p) => p._id) : [],
      autoRule:
        mode === "AUTO"
          ? {
              type: ruleType,
              gender: ruleGender === "ALL" ? undefined : ruleGender,
              categoryId: ruleCategoryId || undefined,
              limit: Number(maxItems),
            }
          : undefined,
    };

    try {
      const url = editingId ? `/api/admin/collections/${editingId}` : "/api/admin/collections";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to save collection", "error");
        return;
      }

      showToast(
        editingId ? "Collection updated successfully" : "Collection created successfully",
        "success",
      );
      setIsModalOpen(false);
      loadCollections();
    } catch {
      showToast("Failed to submit request", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/admin/collections/${deleteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("Collection deleted", "success");
        setDeleteConfirmOpen(false);
        setDeleteId(null);
        loadCollections();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to delete collection", "error");
      }
    } catch {
      showToast("Network error deleting collection", "error");
    }
  };

  const filteredCollections = collections.filter((col) => {
    const matchesSearch =
      col.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      col.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      col.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMode = modeFilter === "ALL" || col.mode === modeFilter;
    return matchesSearch && matchesMode;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium transition-all ${
            toast.type === "success"
              ? "bg-[#1B2A4A] text-white border border-[#2B406B]"
              : "bg-red-950 text-red-200 border border-red-800"
          }`}
        >
          <span>{toast.type === "success" ? "✓" : "⚠"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Curated Collections
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Create hand-picked showcases or algorithmic shelves for the storefront.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#8C7A58] text-white hover:bg-[#786745] shadow-sm transition-all"
        >
          <span>+</span>
          <span>Create Collection</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search by title, name, or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C7A58]"
          />
          <span className="absolute left-3 top-2.5 text-neutral-400 text-sm">🔍</span>
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {(["ALL", "MANUAL", "AUTO"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setModeFilter(m)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                modeFilter === m
                  ? "bg-[#1B2A4A] text-white"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              {m === "ALL" ? "All Modes" : m === "MANUAL" ? "Manual" : "Automatic"}
            </button>
          ))}
        </div>
      </div>

      {/* Collections Grid / Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <div className="w-8 h-8 border-2 border-[#8C7A58] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-neutral-500">Loading collections...</p>
        </div>
      ) : filteredCollections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-center">
          <span className="text-4xl mb-3">🗃️</span>
          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            No collections found
          </h3>
          <p className="text-sm text-neutral-500 max-w-sm mt-1 mb-4">
            {searchQuery
              ? "No collections match your search filter."
              : "Get started by creating your first curated collection."}
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-[#8C7A58] text-white text-xs font-semibold rounded-xl hover:bg-[#786747] transition"
          >
            Create Collection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCollections.map((col) => (
            <div
              key={col._id}
              className="group relative flex flex-col justify-between bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 hover:border-[#8C7A58]/50 hover:shadow-md transition"
            >
              <div>
                {/* Top badges */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    {col.mode === "MANUAL" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <span>✋</span> Manual ({col.productCount})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        <span>⚡</span> Auto: {col.autoRule?.type || "BESTSELLERS"}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => toggleActiveStatus(col, e)}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      col.active ? "bg-emerald-600" : "bg-neutral-300 dark:bg-neutral-700"
                    }`}
                    title={col.active ? "Click to deactivate" : "Click to activate"}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        col.active ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Title & Subtitle */}
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-[#8C7A58] transition-colors line-clamp-1">
                  {col.title}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-0.5">
                  {col.subtitle || col.name}
                </p>

                {/* Slug & Metadata */}
                <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-1">
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span className="font-mono text-[11px] text-neutral-400">/{col.slug}</span>
                    <span className="text-[11px]">Max: {col.maxItems} items</span>
                  </div>
                  {col.mode === "AUTO" && (
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Scope: {col.autoRule?.gender || "All Genders"}
                      {col.autoRule?.type === "BESTSELLERS" && " • 30d Paid Orders"}
                      {col.autoRule?.type === "ON_SALE" && " • Discount Resolver"}
                      {col.autoRule?.type === "NEWEST" && " • Latest Arrivals"}
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <a
                  href={`/api/collections/${col.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 underline font-mono"
                >
                  View JSON ↗
                </a>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(col)}
                    className="px-3 py-1.5 text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setDeleteId(col._id);
                      setDeleteConfirmOpen(true);
                    }}
                    className="p-1.5 text-neutral-400 hover:text-red-500 transition"
                    title="Delete collection"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <span className="text-xl">🗃️</span>
                <div>
                  <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                    {editingId ? "Edit Collection" : "Create Curated Collection"}
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Configure customer-facing presentation and product curation.
                  </p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-2">
                <div className="bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl flex items-center text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setActiveTab("config")}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      activeTab === "config"
                        ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm"
                        : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
                    }`}
                  >
                    Configuration
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("preview")}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      activeTab === "preview"
                        ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm"
                        : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
                    }`}
                  >
                    Live Strip Preview
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-lg leading-none"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeTab === "config" ? (
                <form id="collection-form" onSubmit={handleSubmit} className="space-y-6">
                  {/* Basics Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Internal Label *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Homepage Bestsellers Strip"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C7A58]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Customer Title *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Season's Top Picks"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C7A58]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Subtitle (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Handcrafted tailored essentials"
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C7A58]"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                          URL Slug *
                        </label>
                        <button
                          type="button"
                          onClick={() => setSlugLocked(!slugLocked)}
                          className="text-[11px] text-[#8C7A58] hover:underline"
                        >
                          {slugLocked ? "Unlock" : "Lock"}
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        readOnly={slugLocked}
                        placeholder="seasons-top-picks"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        className={`w-full px-3.5 py-2 text-sm font-mono rounded-xl border ${
                          slugLocked
                            ? "bg-neutral-100 dark:bg-neutral-800/50 text-neutral-500 border-neutral-200 dark:border-neutral-800 cursor-not-allowed"
                            : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#8C7A58]"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Mode Selector */}
                  <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-3">
                      Curation Mode *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setMode("MANUAL")}
                        className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition ${
                          mode === "MANUAL"
                            ? "border-[#8C7A58] bg-[#8C7A58]/5 dark:bg-[#8C7A58]/10"
                            : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300"
                        }`}
                      >
                        <span className="text-2xl">✋</span>
                        <div>
                          <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                            Manual Hand-Picked
                          </div>
                          <p className="text-xs text-neutral-500 mt-0.5">
                            Search and select exact products with custom ordering.
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMode("AUTO")}
                        className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition ${
                          mode === "AUTO"
                            ? "border-[#8C7A58] bg-[#8C7A58]/5 dark:bg-[#8C7A58]/10"
                            : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300"
                        }`}
                      >
                        <span className="text-2xl">⚡</span>
                        <div>
                          <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                            Automatic Rule
                          </div>
                          <p className="text-xs text-neutral-500 mt-0.5">
                            Algorithmic query (Bestsellers from 30d paid orders, Newest, or On Sale).
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Manual Mode Product Picker */}
                  {mode === "MANUAL" && (
                    <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                            Selected Products ({selectedProducts.length})
                          </h3>
                          <p className="text-xs text-neutral-500">
                            Drag or use arrows to reorder. Items with no stock or DRAFT status are skipped on the storefront automatically.
                          </p>
                        </div>
                      </div>

                      {/* Product search box */}
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search products by name or sku to add..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C7A58]"
                        />
                        <span className="absolute left-3 top-3 text-neutral-400 text-sm">🔍</span>

                        {/* Search dropdown */}
                        {productSearchResults.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-2 z-20 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-xl max-h-64 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-700">
                            {productSearchResults.map((prod) => (
                              <div
                                key={prod._id}
                                className="flex items-center justify-between p-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition cursor-pointer"
                                onClick={() => handleAddProduct(prod)}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="relative w-10 h-12 bg-neutral-100 rounded-lg overflow-hidden flex-shrink-0">
                                    <Image
                                      src={prod.images?.[0] || "/images/placeholder.jpg"}
                                      alt={prod.name}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                  <div>
                                    <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 line-clamp-1">
                                      {prod.name}
                                    </div>
                                    <div className="text-[11px] text-neutral-500 flex items-center gap-2">
                                      <span>{formatCurrency(prod.basePricePaise)}</span>
                                      <span>•</span>
                                      <span
                                        className={
                                          prod.status === "ACTIVE"
                                            ? "text-emerald-600"
                                            : "text-amber-600"
                                        }
                                      >
                                        {prod.status}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="px-2.5 py-1 text-xs font-semibold bg-[#8C7A58] text-white rounded-lg hover:bg-[#786747]"
                                >
                                  + Add
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {searchingProducts && (
                          <div className="absolute right-3 top-3 text-xs text-neutral-400">
                            Searching...
                          </div>
                        )}
                      </div>

                      {/* Selected products list with drag & drop */}
                      {selectedProducts.length === 0 ? (
                        <div className="py-8 text-center border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs text-neutral-400">
                          No products added yet. Use the search bar above to select products.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                          {selectedProducts.map((prod, index) => (
                            <div
                              key={prod._id}
                              draggable
                              onDragStart={() => handleDragStart(index)}
                              onDragOver={(e) => handleDragOver(e, index)}
                              onDragEnd={handleDragEnd}
                              className={`flex items-center justify-between p-2.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 rounded-xl transition cursor-grab active:cursor-grabbing ${
                                draggedIndex === index ? "opacity-50 border-[#8C7A58]" : ""
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-mono text-neutral-400 w-5 text-center">
                                  {index + 1}
                                </span>
                                <div className="relative w-9 h-11 bg-neutral-100 rounded-lg overflow-hidden flex-shrink-0">
                                  <Image
                                    src={prod.image}
                                    alt={prod.name}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 line-clamp-1">
                                    {prod.name}
                                  </div>
                                  <div className="text-[11px] text-neutral-500 flex items-center gap-2">
                                    <span>{formatCurrency(prod.basePricePaise)}</span>
                                    <span>•</span>
                                    <span>{prod.gender}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => moveProduct(index, index - 1)}
                                  disabled={index === 0}
                                  className="p-1 text-xs text-neutral-400 hover:text-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Move up"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveProduct(index, index + 1)}
                                  disabled={index === selectedProducts.length - 1}
                                  className="p-1 text-xs text-neutral-400 hover:text-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Move down"
                                >
                                  ▼
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveProduct(index)}
                                  className="p-1 text-neutral-400 hover:text-red-500 text-xs ml-2"
                                  title="Remove"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Auto Mode Configuration */}
                  {mode === "AUTO" && (
                    <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-2">
                          Auto Rule Type *
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[
                            {
                              type: "BESTSELLERS",
                              title: "Bestsellers",
                              desc: "30-day paid order units aggregation",
                            },
                            {
                              type: "NEWEST",
                              title: "New Arrivals",
                              desc: "Latest published products by date",
                            },
                            {
                              type: "ON_SALE",
                              title: "On Sale Deals",
                              desc: "Active campaign discounts sorted by %",
                            },
                          ].map((rule) => (
                            <button
                              key={rule.type}
                              type="button"
                              onClick={() => setRuleType(rule.type as CollectionAutoRuleType)}
                              className={`p-3 rounded-xl border text-left transition ${
                                ruleType === rule.type
                                  ? "border-[#8C7A58] bg-[#8C7A58]/10"
                                  : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300"
                              }`}
                            >
                              <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                                {rule.title}
                              </div>
                              <p className="text-[11px] text-neutral-500 mt-1">{rule.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                            Filter by Gender
                          </label>
                          <select
                            value={ruleGender}
                            onChange={(e) => setRuleGender(e.target.value as "ALL" | "MEN" | "KIDS")}
                            className="w-full px-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C7A58]"
                          >
                            <option value="ALL">All Genders</option>
                            <option value="MEN">Men</option>
                            <option value="KIDS">Kids</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                            Filter by Category (Optional)
                          </label>
                          <select
                            value={ruleCategoryId}
                            onChange={(e) => setRuleCategoryId(e.target.value)}
                            className="w-full px-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C7A58]"
                          >
                            <option value="">All Categories</option>
                            {categories.map((cat) => (
                              <option key={cat._id} value={cat._id}>
                                {cat.name} ({cat.gender})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Limits and Active Switch */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Max Items Displayed (2 - 24)
                      </label>
                      <input
                        type="number"
                        min={2}
                        max={24}
                        value={maxItems}
                        onChange={(e) => setMaxItems(Number(e.target.value))}
                        className="w-full px-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C7A58]"
                      />
                    </div>

                    <div className="flex items-center justify-between sm:justify-start sm:gap-6 pt-5">
                      <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                        Active on Storefront
                      </label>
                      <button
                        type="button"
                        onClick={() => setActive(!active)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          active ? "bg-emerald-600" : "bg-neutral-300 dark:bg-neutral-700"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            active ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                /* Live Strip Preview Tab */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                        {title || "Collection Preview"}
                      </h3>
                      <p className="text-xs text-neutral-500">
                        {subtitle || "Customer-facing horizontal strip preview"} • {previewProducts.length} items resolved
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={fetchLivePreview}
                      disabled={previewLoading}
                      className="px-3 py-1.5 text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200 transition"
                    >
                      {previewLoading ? "Refreshing..." : "↻ Refresh Preview"}
                    </button>
                  </div>

                  {previewLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-2">
                      <div className="w-6 h-6 border-2 border-[#8C7A58] border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-neutral-500">Resolving prices and availability...</p>
                    </div>
                  ) : previewProducts.length === 0 ? (
                    <div className="py-16 text-center border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl text-xs text-neutral-500">
                      No active products with stock were resolved for this configuration.
                    </div>
                  ) : (
                    <div className="overflow-x-auto pb-4">
                      <div className="flex gap-4 w-max min-w-full">
                        {previewProducts.map((p) => {
                          const hasDiscount = p.pricing.discountPercent > 0;
                          return (
                            <div
                              key={p._id}
                              className="w-56 flex-shrink-0 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl overflow-hidden p-3 group"
                            >
                              {/* 3:4 Image with Hover Flip */}
                              <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-[#F0EBE1] mb-2.5">
                                <Image
                                  src={p.firstImage}
                                  alt={p.name}
                                  fill
                                  className="object-cover transition-opacity duration-300 group-hover:opacity-0"
                                />
                                <Image
                                  src={p.secondImage}
                                  alt={`${p.name} alternate`}
                                  fill
                                  className="object-cover absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                />

                                {/* Campaign / Sale Badge */}
                                {p.pricing.badgeLabel && (
                                  <div
                                    className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider text-white px-2 py-0.5 rounded shadow"
                                    style={{
                                      backgroundColor: p.pricing.themeColor || "#8C7A58",
                                    }}
                                  >
                                    {p.pricing.badgeLabel}
                                  </div>
                                )}
                                {!p.pricing.badgeLabel && hasDiscount && (
                                  <div className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider text-white bg-red-600 px-2 py-0.5 rounded shadow">
                                    {p.pricing.discountPercent}% OFF
                                  </div>
                                )}

                                {p.brand && (
                                  <div className="absolute bottom-2 left-2 text-[9px] font-semibold bg-white/90 dark:bg-black/80 px-1.5 py-0.5 rounded backdrop-blur-sm">
                                    {p.brand.name}
                                  </div>
                                )}
                              </div>

                              {/* Title */}
                              <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 line-clamp-1 mb-1">
                                {p.name}
                              </div>

                              {/* Pricing */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                                  {formatCurrency(p.pricing.finalPrice)}
                                </span>
                                {hasDiscount && (
                                  <span className="text-[11px] text-neutral-400 line-through">
                                    {formatCurrency(p.pricing.basePrice)}
                                  </span>
                                )}
                              </div>

                              {/* Color swatches */}
                              {p.colorSwatches.length > 0 && (
                                <div className="flex items-center gap-1 mt-2">
                                  {p.colorSwatches.slice(0, 5).map((c, i) => (
                                    <div
                                      key={i}
                                      className="w-3 h-3 rounded-full border border-neutral-300 shadow-sm"
                                      style={{ backgroundColor: c.hex }}
                                      title={c.name}
                                    />
                                  ))}
                                  {p.colorSwatches.length > 5 && (
                                    <span className="text-[9px] text-neutral-400">
                                      +{p.colorSwatches.length - 5}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="collection-form"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#8C7A58] text-white hover:bg-[#786745] shadow-sm"
              >
                {editingId ? "Save Changes" : "Create Collection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Delete Collection?
            </h3>
            <p className="text-xs text-neutral-500 mt-2 mb-6">
              Are you sure you want to delete this collection? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-3 py-2 rounded-xl text-xs font-semibold border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
