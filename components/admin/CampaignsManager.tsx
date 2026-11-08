"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

export type CampaignType =
  | "FESTIVE"
  | "SEASONAL"
  | "FLASH"
  | "CLEARANCE"
  | "NEW_YEAR"
  | "CUSTOM";

export type CampaignStatus = "LIVE" | "SCHEDULED" | "ENDED" | "PAUSED";

export interface CampaignDiscount {
  kind: "PERCENT" | "FLAT";
  value: number; // For PERCENT: 1-90; For FLAT: integer paise
  maxDiscountAmount?: number; // Integer paise
}

export interface CampaignScope {
  mode: "ALL" | "CATEGORIES" | "BRANDS" | "COLLECTIONS" | "PRODUCTS";
  ids?: string[];
  gender?: "MEN" | "KIDS";
  excludeProductIds?: string[];
}

export interface CampaignDisplay {
  badgeLabel?: string;
  bannerImage?: {
    url: string;
    publicId?: string;
  };
  themeColor?: string;
  showCountdown?: boolean;
  landingEnabled?: boolean;
}

export interface CampaignItem {
  id: string;
  name: string;
  slug: string;
  type: CampaignType;
  description?: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
  priority: number;
  discount: CampaignDiscount;
  scope: CampaignScope;
  display: CampaignDisplay;
  status: CampaignStatus;
  scopeSummary: string;
  affectedCount: number;
  createdAt: string;
  updatedAt: string;
}

interface FormState {
  id?: string;
  name: string;
  slug: string;
  type: CampaignType;
  description: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
  priority: number;
  discountKind: "PERCENT" | "FLAT";
  discountValueRupees: number; // User inputs in rupees or percent
  maxDiscountRupees: number | "";
  scopeMode: CampaignScope["mode"];
  scopeIds: string[];
  scopeGender: "ALL" | "MEN" | "KIDS";
  excludeProductIds: string[];
  badgeLabel: string;
  bannerImageUrl: string;
  bannerImagePublicId: string;
  themeColor: string;
  showCountdown: boolean;
  landingEnabled: boolean;
}

interface OptionItem {
  id: string;
  name: string;
  extra?: string;
}

interface SampleProduct {
  id: string;
  name: string;
  image: string;
  basePriceRupees: number;
  finalPriceRupees: number;
  discountPercent: number;
  savingsRupees: number;
  belowCostWarning?: string;
}

const LUXURY_PALETTE = [
  { name: "Obsidian", hex: "#121212" },
  { name: "Gold Dust", hex: "#D4AF37" },
  { name: "Warm Atelier", hex: "#8C7A58" },
  { name: "Imperial Ruby", hex: "#991B1B" },
  { name: "Midnight Navy", hex: "#1E3A8A" },
  { name: "Deep Forest", hex: "#14532D" },
];

function toLocalDatetimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

function getInitialFormState(): FormState {
  const now = new Date();
  const nextWeek = new Date(Date.now() + 7 * 86400000);

  return {
    name: "",
    slug: "",
    type: "FESTIVE",
    description: "",
    startsAt: toLocalDatetimeString(now),
    endsAt: toLocalDatetimeString(nextWeek),
    active: true,
    priority: 10,
    discountKind: "PERCENT",
    discountValueRupees: 20,
    maxDiscountRupees: "",
    scopeMode: "ALL",
    scopeIds: [],
    scopeGender: "ALL",
    excludeProductIds: [],
    badgeLabel: "FESTIVE OFFER",
    bannerImageUrl: "",
    bannerImagePublicId: "",
    themeColor: "#8C7A58",
    showCountdown: true,
    landingEnabled: false,
  };
}

export function CampaignsManager() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Create / Edit Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(getInitialFormState());
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Available metadata for searchable multi-pickers
  const [categories, setCategories] = useState<OptionItem[]>([]);
  const [brands, setBrands] = useState<OptionItem[]>([]);
  const [allProducts, setAllProducts] = useState<OptionItem[]>([]);

  // Preview state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewAffectedCount, setPreviewAffectedCount] = useState<number>(0);
  const [sampleProducts, setSampleProducts] = useState<SampleProduct[]>([]);
  const [overlapWarnings, setOverlapWarnings] = useState<string[]>([]);
  const previewDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // High Impact Confirmation (>50 products)
  const [highImpactAlert, setHighImpactAlert] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    count: number;
    onConfirm: () => void;
  } | null>(null);

  // Delete Confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<CampaignItem | null>(null);

  // Toast notifications
  const [toasts, setToasts] = useState<{ id: string; type: "success" | "error" | "warn"; message: string }[]>([]);

  const addToast = (message: string, type: "success" | "error" | "warn" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Fetch campaigns
  const fetchCampaigns = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/campaigns");
      const data = await res.json();
      if (res.ok && data.campaigns) {
        setCampaigns(data.campaigns);
      } else {
        addToast(data.error || "Failed to load campaigns", "error");
      }
    } catch {
      addToast("Network error while loading campaigns", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch categories, brands, products metadata for multi-pickers
  const fetchMetadata = useCallback(async () => {
    try {
      const [catRes, brandRes, prodRes] = await Promise.all([
        fetch("/api/admin/categories"),
        fetch("/api/admin/brands"),
        fetch("/api/admin/products?limit=50"),
      ]);

      if (catRes.ok) {
        const catData = await catRes.json();
        if (catData.categories) {
          setCategories(catData.categories.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
        }
      }
      if (brandRes.ok) {
        const brandData = await brandRes.json();
        if (brandData.brands) {
          setBrands(brandData.brands.map((b: { id: string; name: string }) => ({ id: b.id, name: b.name })));
        }
      }
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        if (prodData.products) {
          setAllProducts(prodData.products.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
        }
      }
    } catch {
      // safe fallback
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
    fetchMetadata();
  }, [fetchCampaigns, fetchMetadata]);

  // Live preview fetcher (debounced)
  const triggerPreview = useCallback(() => {
    if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);

    previewDebounceRef.current = setTimeout(async () => {
      try {
        setPreviewLoading(true);
        const discountValue =
          form.discountKind === "PERCENT"
            ? Number(form.discountValueRupees)
            : Math.round(Number(form.discountValueRupees) * 100);

        const maxDiscountAmount =
          form.maxDiscountRupees !== "" && Number(form.maxDiscountRupees) > 0
            ? Math.round(Number(form.maxDiscountRupees) * 100)
            : undefined;

        const res = await fetch("/api/admin/campaigns/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startsAt: form.startsAt,
            endsAt: form.endsAt,
            discount: {
              kind: form.discountKind,
              value: discountValue,
              maxDiscountAmount,
            },
            scope: {
              mode: form.scopeMode,
              ids: form.scopeIds,
              gender: form.scopeGender === "ALL" ? undefined : form.scopeGender,
              excludeProductIds: form.excludeProductIds,
            },
            campaignId: editingCampaignId,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setPreviewAffectedCount(data.affectedCount || 0);
          setSampleProducts(data.sampleProducts || []);
          setOverlapWarnings(data.warnings || []);
        }
      } catch {
        // safe fallback
      } finally {
        setPreviewLoading(false);
      }
    }, 350);
  }, [form, editingCampaignId]);

  useEffect(() => {
    if (isFormOpen) {
      triggerPreview();
    }
  }, [
    isFormOpen,
    form.discountKind,
    form.discountValueRupees,
    form.maxDiscountRupees,
    form.scopeMode,
    form.scopeIds,
    form.scopeGender,
    form.excludeProductIds,
    form.startsAt,
    form.endsAt,
    triggerPreview,
  ]);

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingCampaignId(null);
    setForm(getInitialFormState());
    setFormError(null);
    setIsFormOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (c: CampaignItem) => {
    setEditingCampaignId(c.id);
    const discountVal =
      c.discount.kind === "PERCENT"
        ? c.discount.value
        : Math.round(c.discount.value / 100);

    const maxDiscountVal =
      c.discount.maxDiscountAmount && c.discount.maxDiscountAmount > 0
        ? Math.round(c.discount.maxDiscountAmount / 100)
        : "";

    setForm({
      id: c.id,
      name: c.name,
      slug: c.slug,
      type: c.type,
      description: c.description || "",
      startsAt: toLocalDatetimeString(new Date(c.startsAt)),
      endsAt: toLocalDatetimeString(new Date(c.endsAt)),
      active: c.active,
      priority: c.priority,
      discountKind: c.discount.kind,
      discountValueRupees: discountVal,
      maxDiscountRupees: maxDiscountVal,
      scopeMode: c.scope.mode || "ALL",
      scopeIds: c.scope.ids || [],
      scopeGender: c.scope.gender || "ALL",
      excludeProductIds: c.scope.excludeProductIds || [],
      badgeLabel: c.display?.badgeLabel || "",
      bannerImageUrl: c.display?.bannerImage?.url || "",
      bannerImagePublicId: c.display?.bannerImage?.publicId || "",
      themeColor: c.display?.themeColor || "#8C7A58",
      showCountdown: Boolean(c.display?.showCountdown),
      landingEnabled: Boolean(c.display?.landingEnabled),
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  // Apply Festive Template Preset
  const handleApplyFestiveTemplate = () => {
    const now = new Date();
    const festiveEnd = new Date(Date.now() + 7 * 86400000);

    setForm((prev) => ({
      ...prev,
      name: prev.name || "Diwali Festive Luxury Sale",
      slug: prev.slug || "diwali-festive-sale",
      type: "FESTIVE",
      badgeLabel: "DIWALI SALE",
      discountKind: "PERCENT",
      discountValueRupees: 20,
      themeColor: "#D4AF37",
      startsAt: toLocalDatetimeString(now),
      endsAt: toLocalDatetimeString(festiveEnd),
      showCountdown: true,
      landingEnabled: true,
    }));
    addToast("Applied Festive Sale preset (20% off, 7 days, Gold theme)", "success");
  };

  // Form Submission
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Client-side date check
    if (new Date(form.endsAt) <= new Date(form.startsAt)) {
      setFormError("End date must be scheduled after start date.");
      return;
    }

    // High Impact check: If activating a campaign with >50 affected products
    if (form.active && previewAffectedCount > 50) {
      setHighImpactAlert({
        isOpen: true,
        title: "High-Impact Promotion Notice",
        message: `Activating "${form.name}" will immediately discount ${previewAffectedCount} products across the store. Proceed with activation?`,
        count: previewAffectedCount,
        onConfirm: () => executeSaveForm(),
      });
      return;
    }

    await executeSaveForm();
  };

  const executeSaveForm = async () => {
    try {
      setIsSaving(true);
      const discountVal =
        form.discountKind === "PERCENT"
          ? Number(form.discountValueRupees)
          : Math.round(Number(form.discountValueRupees) * 100);

      const maxDiscountVal =
        form.maxDiscountRupees !== "" && Number(form.maxDiscountRupees) > 0
          ? Math.round(Number(form.maxDiscountRupees) * 100)
          : undefined;

      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        type: form.type,
        description: form.description.trim(),
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        active: form.active,
        priority: Number(form.priority) || 0,
        discount: {
          kind: form.discountKind,
          value: discountVal,
          maxDiscountAmount: maxDiscountVal,
        },
        scope: {
          mode: form.scopeMode,
          ids: form.scopeIds,
          gender: form.scopeGender === "ALL" ? undefined : form.scopeGender,
          excludeProductIds: form.excludeProductIds,
        },
        display: {
          badgeLabel: form.badgeLabel.trim(),
          bannerImage: form.bannerImageUrl
            ? { url: form.bannerImageUrl, publicId: form.bannerImagePublicId }
            : undefined,
          themeColor: form.themeColor,
          showCountdown: form.showCountdown,
          landingEnabled: form.landingEnabled,
        },
      };

      const url = editingCampaignId
        ? `/api/admin/campaigns/${editingCampaignId}`
        : "/api/admin/campaigns";
      const method = editingCampaignId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to save campaign");
        return;
      }

      if (data.warnings && data.warnings.length > 0) {
        addToast(data.warnings[0], "warn");
      } else {
        addToast(
          editingCampaignId
            ? "Campaign updated successfully"
            : "Campaign created successfully",
          "success",
        );
      }

      setIsFormOpen(false);
      setHighImpactAlert(null);
      await fetchCampaigns();
    } catch {
      setFormError("Network error while saving campaign");
    } finally {
      setIsSaving(false);
    }
  };

  // Duplicate campaign
  const handleDuplicate = async (c: CampaignItem) => {
    try {
      const res = await fetch(`/api/admin/campaigns/${c.id}/duplicate`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        addToast(`Duplicated into draft "${data.campaign.name}"`, "success");
        await fetchCampaigns();
      } else {
        addToast(data.error || "Failed to duplicate", "error");
      }
    } catch {
      addToast("Network error during duplication", "error");
    }
  };

  // Toggle active (pause / resume)
  const handleToggleActive = async (c: CampaignItem) => {
    const nextActive = !c.active;

    // Guard if resuming a large campaign
    if (nextActive && c.affectedCount > 50) {
      setHighImpactAlert({
        isOpen: true,
        title: "High-Impact Activation Alert",
        message: `Resuming "${c.name}" will immediately apply promotional pricing to ${c.affectedCount} products. Proceed?`,
        count: c.affectedCount,
        onConfirm: async () => {
          setHighImpactAlert(null);
          await executeToggleActive(c, true);
        },
      });
      return;
    }

    await executeToggleActive(c, nextActive);
  };

  const executeToggleActive = async (c: CampaignItem, activeState: boolean) => {
    try {
      const res = await fetch(`/api/admin/campaigns/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: activeState }),
      });
      if (res.ok) {
        addToast(
          activeState ? `Resumed "${c.name}"` : `Paused "${c.name}"`,
          "success",
        );
        await fetchCampaigns();
      } else {
        addToast("Failed to update status", "error");
      }
    } catch {
      addToast("Network error", "error");
    }
  };

  // Delete campaign
  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await fetch(`/api/admin/campaigns/${deleteConfirm.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        addToast(`Deleted "${deleteConfirm.name}"`, "success");
        setDeleteConfirm(null);
        await fetchCampaigns();
      } else {
        addToast("Failed to delete campaign", "error");
      }
    } catch {
      addToast("Network error", "error");
    }
  };

  // Humanized Timing Helper
  const getScheduleHelper = (startsAt: string, endsAt: string) => {
    const now = Date.now();
    const s = new Date(startsAt).getTime();
    const e = new Date(endsAt).getTime();

    if (isNaN(s) || isNaN(e)) return "";

    if (s > now) {
      const diffHours = Math.ceil((s - now) / 3600000);
      if (diffHours < 24) return `Starts in ${diffHours} hours`;
      const diffDays = Math.ceil(diffHours / 24);
      return `Starts in ${diffDays} day${diffDays > 1 ? "s" : ""}`;
    }

    if (e < now) {
      return "Ended";
    }

    const remainingHours = Math.ceil((e - now) / 3600000);
    if (remainingHours < 24) return `Live now • Ends in ${remainingHours} hours`;
    const remainingDays = Math.ceil(remainingHours / 24);
    return `Live now • Ends in ${remainingDays} day${remainingDays > 1 ? "s" : ""}`;
  };

  // Format IST Date String
  const formatIST = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  // Filtered campaigns
  const filteredCampaigns = campaigns.filter((c) => {
    const matchesStatus =
      statusFilter === "ALL" ? true : c.status === statusFilter;
    const matchesSearch = searchQuery
      ? c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.slug.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesStatus && matchesSearch;
  });

  const liveCount = campaigns.filter((c) => c.status === "LIVE").length;
  const scheduledCount = campaigns.filter((c) => c.status === "SCHEDULED").length;
  const pausedCount = campaigns.filter((c) => c.status === "PAUSED").length;

  return (
    <div className="space-y-8">
      {/* =========================================================================
          PAGE HEADER & ACTIONS
      ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Sales & Offers
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Configure seasonal promotions, festive discounts, flash offers, and storewide pricing rules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleApplyFestiveTemplate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#8C7A58] text-white hover:bg-[#786745] shadow-sm transition-all"
          >
            <span>✨</span>
            <span>Festive Preset</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 shadow-sm transition-all"
          >
            <span>+</span>
            <span>New Campaign</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          STATS STRIP
      ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 shadow-sm">
          <p className="text-xs uppercase font-medium tracking-wider text-neutral-500">Total Offers</p>
          <p className="text-2xl font-bold mt-1 text-neutral-900 dark:text-neutral-100">{campaigns.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20 shadow-sm">
          <p className="text-xs uppercase font-medium tracking-wider text-emerald-700 dark:text-emerald-400">Live Now</p>
          <p className="text-2xl font-bold mt-1 text-emerald-800 dark:text-emerald-300">{liveCount}</p>
        </div>
        <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20 shadow-sm">
          <p className="text-xs uppercase font-medium tracking-wider text-blue-700 dark:text-blue-400">Scheduled</p>
          <p className="text-2xl font-bold mt-1 text-blue-800 dark:text-blue-300">{scheduledCount}</p>
        </div>
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20 shadow-sm">
          <p className="text-xs uppercase font-medium tracking-wider text-amber-700 dark:text-amber-400">Paused</p>
          <p className="text-2xl font-bold mt-1 text-amber-800 dark:text-amber-300">{pausedCount}</p>
        </div>
      </div>

      {/* =========================================================================
          SEARCH & FILTER STRIP
      ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900">
          {["ALL", "LIVE", "SCHEDULED", "PAUSED", "ENDED"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                statusFilter === tab
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-sm"
                  : "text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white"
              }`}
            >
              {tab === "ALL" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search offers or slugs..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
          />
          <span className="absolute left-3 top-2 text-neutral-400 text-xs">🔍</span>
        </div>
      </div>

      {/* =========================================================================
          CAMPAIGNS TABLE / LIST VIEW
      ========================================================================= */}
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-neutral-500">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-neutral-400 border-t-transparent rounded-full mb-3" />
            <p>Loading campaigns...</p>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <span className="text-4xl">🏷️</span>
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              No promotions found
            </p>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              {searchQuery || statusFilter !== "ALL"
                ? "No campaigns matched your search or status filter."
                : "Create your first campaign to launch festive, flash, or seasonal store discounts."}
            </p>
            {!searchQuery && statusFilter === "ALL" && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:bg-neutral-800"
              >
                Create Campaign
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">
                  <th className="py-3.5 px-4">Offer / Slug</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Scope Summary</th>
                  <th className="py-3.5 px-4">IST Schedule Window</th>
                  <th className="py-3.5 px-4">Affected</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-xs">
                {filteredCampaigns.map((c) => {
                  const scheduleHelper = getScheduleHelper(c.startsAt, c.endsAt);

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      {/* Name & Type */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                              {c.name}
                            </span>
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                              {c.type}
                            </span>
                            {c.display?.badgeLabel && (
                              <span
                                className="px-1.5 py-0.5 text-[9px] font-bold rounded text-white"
                                style={{ backgroundColor: c.display.themeColor || "#8C7A58" }}
                              >
                                {c.display.badgeLabel}
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                            /{c.slug}
                          </span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold ${
                            c.status === "LIVE"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : c.status === "SCHEDULED"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                              : c.status === "PAUSED"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              c.status === "LIVE"
                                ? "bg-emerald-600 animate-pulse"
                                : c.status === "SCHEDULED"
                                ? "bg-blue-600"
                                : c.status === "PAUSED"
                                ? "bg-amber-600"
                                : "bg-neutral-400"
                            }`}
                          />
                          {c.status}
                        </span>
                      </td>

                      {/* Scope Summary */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-neutral-800 dark:text-neutral-200">
                          {c.scopeSummary}
                        </div>
                        {c.discount.maxDiscountAmount && c.discount.maxDiscountAmount > 0 ? (
                          <span className="text-[10px] text-neutral-500">
                            Capped at ₹{Math.round(c.discount.maxDiscountAmount / 100)}
                          </span>
                        ) : null}
                      </td>

                      {/* Schedule Window */}
                      <td className="py-3.5 px-4">
                        <div className="text-neutral-700 dark:text-neutral-300">
                          {formatIST(c.startsAt)}
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          to {formatIST(c.endsAt)}
                        </div>
                        {scheduleHelper && (
                          <div className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 mt-0.5">
                            {scheduleHelper}
                          </div>
                        )}
                      </td>

                      {/* Affected Products */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                          {c.affectedCount} items
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Pause / Resume */}
                          <button
                            type="button"
                            onClick={() => handleToggleActive(c)}
                            title={c.active ? "Pause campaign" : "Resume campaign"}
                            className={`px-2 py-1 text-[11px] font-semibold rounded border transition ${
                              c.active
                                ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 hover:bg-amber-100"
                                : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100"
                            }`}
                          >
                            {c.active ? "Pause" : "Resume"}
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            title="Edit campaign"
                            className="px-2 py-1 text-[11px] font-semibold rounded border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200"
                          >
                            Edit
                          </button>

                          {/* Duplicate */}
                          <button
                            type="button"
                            onClick={() => handleDuplicate(c)}
                            title="Duplicate into draft"
                            className="px-2 py-1 text-[11px] font-semibold rounded border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200"
                          >
                            Copy
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(c)}
                            title="Delete campaign"
                            className="px-2 py-1 text-[11px] font-semibold rounded border border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300 hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          CREATE / EDIT CAMPAIGN MODAL (6 Sections)
      ========================================================================= */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 bg-neutral-50 dark:bg-neutral-950">
              <div className="flex items-center gap-3">
                <span className="text-xl">🏷️</span>
                <div>
                  <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                    {editingCampaignId ? "Edit Promotion" : "Create New Promotion"}
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Configure dates, targeting, discount math, and storefront badges.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: 6 Structured Sections */}
            <form onSubmit={handleSubmitForm} className="flex-1 overflow-y-auto p-6 space-y-8">
              {formError && (
                <div className="p-3 text-xs rounded-lg border border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  {formError}
                </div>
              )}

              {/* -------------------------------------------------------------
                  SECTION 1: BASICS & PRESETS
              ------------------------------------------------------------- */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                    <span>1. Basics & Presets</span>
                  </h3>
                  <button
                    type="button"
                    onClick={handleApplyFestiveTemplate}
                    className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
                  >
                    <span>✨ Pre-fill Festive Sale Template</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Promotion Name *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={80}
                      value={form.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm((prev) => ({
                          ...prev,
                          name: val,
                          // Auto-generate slug if not manually customized yet
                          slug: editingCampaignId
                            ? prev.slug
                            : val
                                .toLowerCase()
                                .replace(/[^a-z0-9]+/g, "-")
                                .replace(/(^-|-$)/g, ""),
                        }));
                      }}
                      placeholder="e.g. Diwali Festive Luxury Sale"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      URL Slug * (Unique)
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={80}
                      value={form.slug}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          slug: e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]+/g, ""),
                        }))
                      }
                      placeholder="diwali-festive-sale"
                      className="w-full px-3 py-2 font-mono text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Campaign Type
                    </label>
                    <select
                      value={form.type}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          type: e.target.value as CampaignType,
                        }))
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    >
                      <option value="FESTIVE">Festive (Diwali, Eid, Dussehra)</option>
                      <option value="NEW_YEAR">New Year Exclusive</option>
                      <option value="FLASH">Flash Discount (Limited Hours)</option>
                      <option value="CLEARANCE">End of Season Clearance</option>
                      <option value="SEASONAL">Seasonal (Autumn / Winter)</option>
                      <option value="CUSTOM">Custom Campaign</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Priority (Higher number wins ties)
                    </label>
                    <input
                      type="number"
                      value={form.priority}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          priority: parseInt(e.target.value, 10) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Internal Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    maxLength={500}
                    value={form.description}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Notes on marketing source, goals, or discount approvals..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
              </div>

              {/* -------------------------------------------------------------
                  SECTION 2: SCHEDULE (IST DATE-TIME PICKERS)
              ------------------------------------------------------------- */}
              <div className="space-y-4">
                <div className="border-b border-neutral-200 dark:border-neutral-800 pb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                    2. Schedule (Indian Standard Time)
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Start Date & Time (IST) *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={form.startsAt}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, startsAt: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      End Date & Time (IST) *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={form.endsAt}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, endsAt: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-neutral-500 bg-neutral-50 dark:bg-neutral-950 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800">
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                    Schedule Status:
                  </span>
                  <span>{getScheduleHelper(form.startsAt, form.endsAt) || "Valid window"}</span>
                </div>
              </div>

              {/* -------------------------------------------------------------
                  SECTION 3: DISCOUNT CALCULATION
              ------------------------------------------------------------- */}
              <div className="space-y-4">
                <div className="border-b border-neutral-200 dark:border-neutral-800 pb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                    3. Discount Math
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Discount Format
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            discountKind: "PERCENT",
                            discountValueRupees: 20,
                          }))
                        }
                        className={`py-2 text-xs font-semibold rounded-lg border transition ${
                          form.discountKind === "PERCENT"
                            ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                            : "border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
                        }`}
                      >
                        Percentage (%)
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            discountKind: "FLAT",
                            discountValueRupees: 500,
                          }))
                        }
                        className={`py-2 text-xs font-semibold rounded-lg border transition ${
                          form.discountKind === "FLAT"
                            ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                            : "border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
                        }`}
                      >
                        Flat Off (₹)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      {form.discountKind === "PERCENT"
                        ? "Discount Percentage (1 - 90%)"
                        : "Flat Discount Amount (₹)"}
                    </label>
                    <input
                      type="number"
                      required
                      min={form.discountKind === "PERCENT" ? 1 : 1}
                      max={form.discountKind === "PERCENT" ? 90 : 50000}
                      value={form.discountValueRupees}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          discountValueRupees: Number(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />

                    {form.discountKind === "PERCENT" && (
                      <div className="flex gap-1.5 mt-2">
                        {[10, 15, 20, 30, 50].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                discountValueRupees: pct,
                              }))
                            }
                            className="px-2 py-0.5 text-[10px] font-semibold rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200"
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Max Discount Cap (₹ Optional)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.maxDiscountRupees}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          maxDiscountRupees:
                            e.target.value === "" ? "" : Number(e.target.value),
                        }))
                      }
                      placeholder="e.g. 1500 (No limit if empty)"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                    <span className="text-[10px] text-neutral-400 mt-1 block">
                      Protects margins on high-value orders
                    </span>
                  </div>
                </div>
              </div>

              {/* -------------------------------------------------------------
                  SECTION 4: APPLIES TO (SCOPE & TARGETING)
              ------------------------------------------------------------- */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                    4. Applies To (Scope & Targeting)
                  </h3>

                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                    <span>📦</span>
                    <span>
                      {previewLoading ? "Calculating..." : `${previewAffectedCount} Products Affected`}
                    </span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Target Mode
                    </label>
                    <select
                      value={form.scopeMode}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          scopeMode: e.target.value as CampaignScope["mode"],
                          scopeIds: [], // reset selection on mode switch
                        }))
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    >
                      <option value="ALL">All Products (Storewide)</option>
                      <option value="CATEGORIES">Specific Categories</option>
                      <option value="BRANDS">Specific Brands</option>
                      <option value="PRODUCTS">Specific Products</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Gender Filter
                    </label>
                    <select
                      value={form.scopeGender}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          scopeGender: e.target.value as "ALL" | "MEN" | "KIDS",
                        }))
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    >
                      <option value="ALL">All Genders (Men & Kids)</option>
                      <option value="MEN">Men Only</option>
                      <option value="KIDS">Kids Only</option>
                    </select>
                  </div>
                </div>

                {/* Multi-Picker for Categories, Brands, or Products */}
                {form.scopeMode !== "ALL" && (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      Select {form.scopeMode.charAt(0) + form.scopeMode.slice(1).toLowerCase()}
                    </label>

                    {/* Chips of currently selected */}
                    <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                      {form.scopeIds.length === 0 ? (
                        <span className="text-xs text-neutral-400">None selected yet. Choose from below.</span>
                      ) : (
                        form.scopeIds.map((id) => {
                          const list =
                            form.scopeMode === "CATEGORIES"
                              ? categories
                              : form.scopeMode === "BRANDS"
                              ? brands
                              : allProducts;
                          const item = list.find((x) => x.id === id);
                          return (
                            <span
                              key={id}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                            >
                              <span>{item?.name || id}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setForm((prev) => ({
                                    ...prev,
                                    scopeIds: prev.scopeIds.filter((x) => x !== id),
                                  }))
                                }
                                className="hover:text-red-400"
                              >
                                ✕
                              </button>
                            </span>
                          );
                        })
                      )}
                    </div>

                    {/* Quick selection options */}
                    <div className="max-h-36 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs">
                      {(form.scopeMode === "CATEGORIES"
                        ? categories
                        : form.scopeMode === "BRANDS"
                        ? brands
                        : allProducts
                      ).map((item) => {
                        const isSelected = form.scopeIds.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setForm((prev) => ({
                                ...prev,
                                scopeIds: isSelected
                                  ? prev.scopeIds.filter((x) => x !== item.id)
                                  : [...prev.scopeIds, item.id],
                              }));
                            }}
                            className={`p-1.5 rounded text-left truncate transition ${
                              isSelected
                                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-semibold"
                                : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                            }`}
                          >
                            {isSelected ? "✓ " : "+ "}
                            {item.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Exclude Products Picker */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Exclude Specific Products (Optional)
                  </label>
                  <div className="flex flex-wrap gap-1.5 min-h-[30px] p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
                    {form.excludeProductIds.length === 0 ? (
                      <span className="text-xs text-neutral-400">No exclusions specified.</span>
                    ) : (
                      form.excludeProductIds.map((id) => {
                        const item = allProducts.find((p) => p.id === id);
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                          >
                            <span>Excluded: {item?.name || id}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  excludeProductIds: prev.excludeProductIds.filter((x) => x !== id),
                                }))
                              }
                            >
                              ✕
                            </button>
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* -------------------------------------------------------------
                  SECTION 5: STOREFRONT DISPLAY
              ------------------------------------------------------------- */}
              <div className="space-y-4">
                <div className="border-b border-neutral-200 dark:border-neutral-800 pb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                    5. Storefront Badges & Display
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Storefront Badge Label (Max 20 chars)
                    </label>
                    <input
                      type="text"
                      maxLength={20}
                      value={form.badgeLabel}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, badgeLabel: e.target.value }))
                      }
                      placeholder="e.g. DIWALI SALE"
                      className="w-full px-3 py-2 text-xs uppercase font-bold tracking-wider rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Theme Accent Color
                    </label>
                    <div className="flex items-center gap-2">
                      {LUXURY_PALETTE.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({ ...prev, themeColor: c.hex }))
                          }
                          title={c.name}
                          style={{ backgroundColor: c.hex }}
                          className={`w-7 h-7 rounded-full border-2 transition ${
                            form.themeColor === c.hex
                              ? "border-neutral-900 dark:border-white scale-110 shadow-sm"
                              : "border-transparent hover:scale-105"
                          }`}
                        />
                      ))}
                      <input
                        type="color"
                        value={form.themeColor}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, themeColor: e.target.value }))
                        }
                        className="w-8 h-8 rounded border-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-6 pt-2">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-neutral-800 dark:text-neutral-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.showCountdown}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, showCountdown: e.target.checked }))
                      }
                      className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                    />
                    <span>Show Live Countdown Timer on Product & Hero</span>
                  </label>

                  <label className="inline-flex items-center gap-2 text-xs font-medium text-neutral-800 dark:text-neutral-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.landingEnabled}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, landingEnabled: e.target.checked }))
                      }
                      className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                    />
                    <span>Generate Dedicated Sale Landing Page (/sale/{form.slug || "offer"})</span>
                  </label>
                </div>
              </div>

              {/* -------------------------------------------------------------
                  SECTION 6: LIVE PREVIEW & OVERLAP WARNINGS
              ------------------------------------------------------------- */}
              <div className="space-y-4">
                <div className="border-b border-neutral-200 dark:border-neutral-800 pb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100 flex items-center justify-between">
                    <span>6. Live Pricing Preview (Sample Products)</span>
                    {previewLoading && (
                      <span className="text-xs text-neutral-400 font-normal">
                        Resolving canonical pricing...
                      </span>
                    )}
                  </h3>
                </div>

                {/* Overlap warnings callout */}
                {overlapWarnings.length > 0 && (
                  <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 space-y-1.5 text-xs text-amber-900 dark:text-amber-200">
                    <div className="font-bold flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>Scope Overlap Warning</span>
                    </div>
                    {overlapWarnings.map((w, idx) => (
                      <p key={idx} className="leading-relaxed">
                        • {w}
                      </p>
                    ))}
                  </div>
                )}

                {/* 3 Real Product Cards */}
                {sampleProducts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-neutral-400 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50 dark:bg-neutral-950">
                    No active sample products in this scope. Add products or select &quot;All Products&quot;.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {sampleProducts.map((p) => (
                      <div
                        key={p.id}
                        className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 flex flex-col justify-between space-y-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-14 rounded-md overflow-hidden bg-neutral-200 dark:bg-neutral-800 flex-shrink-0">
                            {p.image ? (
                              <Image
                                src={p.image}
                                alt={p.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs">👔</div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 truncate">
                              {p.name}
                            </p>
                            {form.badgeLabel && (
                              <span
                                className="inline-block mt-1 px-1.5 py-0.5 text-[8.5px] font-bold rounded text-white uppercase tracking-wider"
                                style={{ backgroundColor: form.themeColor || "#8C7A58" }}
                              >
                                {form.badgeLabel}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
                          <div className="flex items-baseline gap-2">
                            <span className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                              ₹{p.finalPriceRupees}
                            </span>
                            <span className="text-xs text-neutral-400 line-through">
                              ₹{p.basePriceRupees}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              -{p.discountPercent}%
                            </span>
                          </div>
                          <p className="text-[10.5px] text-neutral-500 mt-0.5">
                            Customer saves ₹{p.savingsRupees}
                          </p>

                          {p.belowCostWarning && (
                            <p className="text-[10px] font-semibold text-red-600 mt-1">
                              ⚠️ {p.belowCostWarning}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-900 shadow-sm"
                >
                  {isSaving ? "Saving..." : editingCampaignId ? "Save Changes" : "Launch Promotion"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          HIGH IMPACT CONFIRMATION MODAL (>50 Products)
      ========================================================================= */}
      {highImpactAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {highImpactAlert.title}
              </h3>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {highImpactAlert.message}
            </p>
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 text-[11px] text-amber-800 dark:text-amber-300">
              Rule 1 &amp; Rule 2 enforced: Server-side pricing will automatically apply to all checkout carts, listing cards, and PDPs.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setHighImpactAlert(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
              >
                Go Back &amp; Review
              </button>
              <button
                type="button"
                onClick={highImpactAlert.onConfirm}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#8C7A58] text-white hover:bg-[#786745] shadow-sm"
              >
                Proceed with Activation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DELETE CONFIRMATION MODAL
      ========================================================================= */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🗑️</span>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Delete Campaign?
              </h3>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Are you sure you want to permanently delete &quot;{deleteConfirm.name}&quot;?
              This action cannot be undone and will restore base pricing on all affected items.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 shadow-sm"
              >
                Delete Campaign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TOAST NOTIFICATION CONTAINER
      ========================================================================= */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-3.5 rounded-xl shadow-lg border text-xs flex items-center gap-2 transition-all ${
              t.type === "error"
                ? "bg-red-50 border-red-200 text-red-900 dark:bg-red-950 dark:border-red-900 dark:text-red-200"
                : t.type === "warn"
                ? "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950 dark:border-amber-900 dark:text-amber-200"
                : "bg-neutral-900 border-neutral-800 text-white dark:bg-neutral-100 dark:border-neutral-200 dark:text-neutral-900"
            }`}
          >
            <span>{t.type === "error" ? "❌" : t.type === "warn" ? "⚠️" : "✓"}</span>
            <span className="leading-snug">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CampaignsManager;

