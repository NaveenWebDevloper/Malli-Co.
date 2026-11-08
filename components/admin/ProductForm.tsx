"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProductImageUploader from "./ProductImageUploader";
import {
  generateVariantsFromAttributes,
  parseCommaSeparatedAttributeValues,
  type AttributeOptionInput,
} from "../../lib/variant-utils";

interface BrandOption {
  _id: string;
  name: string;
}

interface CategoryOption {
  _id: string;
  name: string;
  gender: string;
}

interface VariantRow {
  _id?: string;
  sku: string;
  price: number; // in Rupees
  compareAtPrice?: number | null;
  stock: number;
  images: string[];
  options: Record<string, string>;
  isDefault: boolean;
  status: "ACTIVE" | "ARCHIVED";
}

interface ProductFormProps {
  initialData?: {
    _id?: string;
    name: string;
    slug: string;
    description: string;
    brandId: string | { _id: string };
    categoryId: string | { _id: string };
    gender: "MEN" | "KIDS";
    type: "SIMPLE" | "VARIABLE";
    basePrice: number; // in Rupees
    status: "DRAFT" | "ACTIVE";
    images: string[];
    productAttributes?: Array<{ name: string; values: string[] }>;
    variants?: VariantRow[];
  };
  brands: BrandOption[];
  categories: CategoryOption[];
}

interface AttributeValueInputProps {
  values: string[];
  onChange: (newValues: string[]) => void;
  placeholder?: string;
}

function AttributeValueInput({
  values,
  onChange,
  placeholder = "S, M, L, XL or 28, 30, 32, 34, 36",
}: AttributeValueInputProps) {
  const [rawText, setRawText] = useState(() => values.join(", "));
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Sync rawText if parent values change externally (e.g. form reset or initial load)
  useEffect(() => {
    setRawText(values.join(", "));
  }, [values]);

  const commit = () => {
    const result = parseCommaSeparatedAttributeValues(rawText);
    onChange(result.values);
    setRawText(result.values.join(", "));
    if (result.hasDuplicates && result.errorMessage) {
      setDuplicateWarning(result.errorMessage);
    } else {
      setDuplicateWarning(null);
    }
  };

  return (
    <div className="w-full">
      <input
        type="text"
        value={rawText}
        onChange={(e) => {
          setRawText(e.target.value);
          if (duplicateWarning) {
            setDuplicateWarning(null);
          }
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        placeholder={placeholder}
        className="mt-1 block w-full rounded border border-neutral-300 px-2.5 py-1 text-xs dark:border-neutral-600 dark:bg-neutral-900"
      />
      {duplicateWarning && (
        <p className="mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
          ⚠️ {duplicateWarning}
        </p>
      )}
    </div>
  );
}

export default function ProductForm({
  initialData,
  brands,
  categories,
}: ProductFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialData?._id);

  // Form State
  const [name, setName] = useState(initialData?.name || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [brandId, setBrandId] = useState(
    typeof initialData?.brandId === "object"
      ? initialData?.brandId?._id
      : initialData?.brandId || (brands[0]?._id ?? ""),
  );
  const [categoryId, setCategoryId] = useState(
    typeof initialData?.categoryId === "object"
      ? initialData?.categoryId?._id
      : initialData?.categoryId || (categories[0]?._id ?? ""),
  );
  const [gender, setGender] = useState<"MEN" | "KIDS">(
    initialData?.gender || "MEN",
  );
  const [productType, setProductType] = useState<"SIMPLE" | "VARIABLE">(
    initialData?.type || "SIMPLE",
  );
  const [basePrice, setBasePrice] = useState<number>(
    initialData?.basePrice ?? 1499,
  );
  const [status, setStatus] = useState<"DRAFT" | "ACTIVE">(
    initialData?.status || "DRAFT",
  );
  const [images, setImages] = useState<string[]>(initialData?.images || []);

  // Simple Product Variant State
  const initialSimple = initialData?.variants?.[0];
  const [simpleSku, setSimpleSku] = useState(initialSimple?.sku || "");
  const [simpleStock, setSimpleStock] = useState<number>(
    initialSimple?.stock ?? 25,
  );
  const [simpleComparePrice, setSimpleComparePrice] = useState<number | null>(
    initialSimple?.compareAtPrice ?? null,
  );

  // Variable Product Attributes State
  const [attributes, setAttributes] = useState<AttributeOptionInput[]>(
    initialData?.productAttributes && initialData.productAttributes.length > 0
      ? initialData.productAttributes
      : [
          { name: "Size", values: ["S", "M", "L", "XL"] },
          { name: "Color", values: ["Navy Blue", "Olive Green", "Burgundy"] },
        ],
  );

  // Variable Variants Matrix Table
  const [variants, setVariants] = useState<VariantRow[]>(
    initialData?.variants || [],
  );

  // Color-specific image gallery mapping
  const [colorImages, setColorImages] = useState<Record<string, string[]>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-generate slug from name
  const handleAutoSlug = () => {
    const generated = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
    setSlug(generated);

    if (productType === "SIMPLE" && !simpleSku) {
      const skuPrefix = generated
        .split("-")
        .slice(0, 2)
        .map((w) => w.slice(0, 3).toUpperCase())
        .join("");
      setSimpleSku(`MC-${skuPrefix}-STD`);
    }
  };

  // Extract all available colors from attributes
  const colorAttr = attributes.find(
    (a) =>
      a.name.toLowerCase() === "color" || a.name.toLowerCase() === "colour",
  );
  const availableColors = colorAttr ? colorAttr.values : [];

  // Generate Cartesian Variants
  const handleGenerateVariants = () => {
    if (!slug) {
      setErrorMessage(
        "Please enter or auto-generate a product slug before generating variants.",
      );
      return;
    }

    const blueprints = generateVariantsFromAttributes({
      productSlug: slug,
      attributes,
      defaultPricePaise: Math.round(basePrice * 100),
      defaultCompareAtPricePaise: simpleComparePrice
        ? Math.round(simpleComparePrice * 100)
        : undefined,
      defaultStock: 20,
      colorImages,
    });

    const generatedRows: VariantRow[] = blueprints.map((b, idx) => ({
      sku: b.sku,
      price: b.pricePaise / 100,
      compareAtPrice: b.compareAtPricePaise
        ? b.compareAtPricePaise / 100
        : null,
      stock: b.stock,
      images: b.images.length > 0 ? b.images : images,
      options: b.options,
      isDefault: idx === 0,
      status: "ACTIVE",
    }));

    setVariants(generatedRows);
    setErrorMessage(null);
  };

  const handleUpdateVariantRow = (
    index: number,
    updates: Partial<VariantRow>,
  ) => {
    setVariants((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...updates } : row)),
    );
  };

  const handleRemoveVariantRow = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    // Build payload according to ProductFormSchema
    let finalVariants: VariantRow[] = [];

    if (productType === "SIMPLE") {
      if (!simpleSku) {
        setErrorMessage("SKU is required for simple products.");
        setIsSubmitting(false);
        return;
      }

      finalVariants = [
        {
          _id: initialSimple?._id,
          sku: simpleSku.trim().toUpperCase(),
          price: Number(basePrice),
          compareAtPrice: simpleComparePrice
            ? Number(simpleComparePrice)
            : null,
          stock: Number(simpleStock),
          images,
          options: {},
          isDefault: true,
          status: "ACTIVE",
        },
      ];
    } else {
      if (variants.length === 0) {
        setErrorMessage(
          "Please click 'Generate variants' or add at least one variant.",
        );
        setIsSubmitting(false);
        return;
      }
      finalVariants = variants.map((v) => ({
        ...v,
        price: Number(v.price),
        compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
        stock: Number(v.stock),
        images: v.images && v.images.length > 0 ? v.images : images,
      }));
    }

    const payload = {
      name,
      slug,
      description,
      brandId,
      categoryId,
      gender,
      type: productType,
      basePrice: Number(basePrice),
      status,
      images,
      productAttributes: productType === "VARIABLE" ? attributes : [],
      variants: finalVariants,
    };

    try {
      const endpoint = isEditing
        ? `/api/admin/products/${initialData?._id}`
        : "/api/admin/products";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save product.");
      }

      router.push("/admin/products");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving product";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {isEditing
              ? `Edit Product: ${initialData?.name}`
              : "Create New Product"}
          </h1>
          <p className="text-xs text-neutral-500">
            Configure catalog item details, attributes, inventory SKUs, and
            imagery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 shadow-sm transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-900 shadow-sm transition-all"
          >
            {isSubmitting
              ? "Saving..."
              : isEditing
                ? "Update Product"
                : "Publish Product"}
          </button>
        </div>
      </div>

      {/* General Information & Inventory Tab */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column (2 Cols): Core Info, Type Selector, Variants */}
        <div className="space-y-6 lg:col-span-2">
          {/* Section: Basic Details */}
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
              General Information
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Classic Pure Linen Oxford Shirt"
                  className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-black focus:ring-1 focus:ring-black dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    URL Slug *
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoSlug}
                    className="text-[11px] font-semibold text-neutral-500 hover:text-black dark:hover:text-white"
                  >
                    Auto-Generate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="classic-pure-linen-oxford-shirt"
                  className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-mono text-neutral-900 shadow-sm focus:border-black focus:ring-1 focus:ring-black dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Base Price (₹ INR) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={basePrice}
                  onChange={(e) =>
                    setBasePrice(parseFloat(e.target.value) || 0)
                  }
                  placeholder="2499.00"
                  className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-black focus:ring-1 focus:ring-black dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Description *
                </label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed material provenance, weave, fit, and styling recommendations..."
                  className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-black focus:ring-1 focus:ring-black dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>
            </div>
          </div>

          {/* Section: Product Type Selector (SIMPLE vs VARIABLE) */}
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                  Product Type & Variants
                </h2>
                <p className="text-xs text-neutral-500">
                  Choose whether this item sells as a single standalone SKU or
                  multiple combinations (Size, Color).
                </p>
              </div>

              {/* Type Switch Pill */}
              <div className="flex rounded-lg border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-700 dark:bg-neutral-800">
                <button
                  type="button"
                  onClick={() => setProductType("SIMPLE")}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                    productType === "SIMPLE"
                      ? "bg-white text-black shadow-xs dark:bg-neutral-900 dark:text-white"
                      : "text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white"
                  }`}
                >
                  Simple Product
                </button>
                <button
                  type="button"
                  onClick={() => setProductType("VARIABLE")}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                    productType === "VARIABLE"
                      ? "bg-white text-black shadow-xs dark:bg-neutral-900 dark:text-white"
                      : "text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white"
                  }`}
                >
                  Variable Product
                </button>
              </div>
            </div>

            {/* Condition 1: SIMPLE PRODUCT FIELDS */}
            {productType === "SIMPLE" && (
              <div className="mt-4 grid grid-cols-1 gap-4 rounded-lg border border-neutral-100 bg-neutral-50/50 p-4 sm:grid-cols-3 dark:border-neutral-800 dark:bg-neutral-800/40">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    SKU (Unique Identifier) *
                  </label>
                  <input
                    type="text"
                    required
                    value={simpleSku}
                    onChange={(e) => setSimpleSku(e.target.value.toUpperCase())}
                    placeholder="e.g. MH-OXF-WHT-STD"
                    className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-mono uppercase text-neutral-900 shadow-sm focus:border-black focus:ring-1 focus:ring-black dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Compare-At Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={simpleComparePrice ?? ""}
                    onChange={(e) =>
                      setSimpleComparePrice(
                        e.target.value ? parseFloat(e.target.value) : null,
                      )
                    }
                    placeholder="2999.00"
                    className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 shadow-sm focus:border-black focus:ring-1 focus:ring-black dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Initial Stock Count *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={simpleStock}
                    onChange={(e) =>
                      setSimpleStock(parseInt(e.target.value, 10) || 0)
                    }
                    placeholder="50"
                    className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 shadow-sm focus:border-black focus:ring-1 focus:ring-black dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                </div>
              </div>
            )}

            {/* Condition 2: VARIABLE PRODUCT ATTRIBUTES & GENERATOR */}
            {productType === "VARIABLE" && (
              <div className="mt-4 space-y-6">
                {/* Attribute Setup Panel */}
                <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-800/40 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      Attributes Matrix
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setAttributes((prev) => [
                          ...prev,
                          {
                            name: "Fabric",
                            values: ["100% Linen", "Cotton Blend"],
                          },
                        ])
                      }
                      className="text-xs font-semibold text-neutral-700 hover:text-black dark:text-neutral-300 dark:hover:text-white"
                    >
                      + Add Attribute
                    </button>
                  </div>

                  <div className="space-y-3">
                    {attributes.map((attr, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col gap-2 rounded-md border border-neutral-200 bg-white p-3 sm:flex-row sm:items-center dark:border-neutral-700 dark:bg-neutral-800"
                      >
                        <div className="w-full sm:w-1/4">
                          <label className="block text-[11px] font-medium text-neutral-500">
                            Attribute Name
                          </label>
                          <input
                            type="text"
                            value={attr.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAttributes((prev) =>
                                prev.map((a, i) =>
                                  i === idx ? { ...a, name: val } : a,
                                ),
                              );
                            }}
                            className="mt-1 block w-full rounded border border-neutral-300 px-2.5 py-1 text-xs font-semibold dark:border-neutral-600 dark:bg-neutral-900"
                          />
                        </div>

                        <div className="flex-1">
                          <label className="block text-[11px] font-medium text-neutral-500">
                            Comma-Separated Values
                          </label>
                          <AttributeValueInput
                            values={attr.values}
                            onChange={(newValues) => {
                              setAttributes((prev) =>
                                prev.map((a, i) =>
                                  i === idx ? { ...a, values: newValues } : a,
                                ),
                              );
                            }}
                            placeholder="e.g. 28, 30, 32 or 32x34, 34x34 or 2-3Y, 3-4Y or S, M, L"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setAttributes((prev) =>
                              prev.filter((_, i) => i !== idx),
                            )
                          }
                          className="self-end sm:self-center text-xs text-red-600 hover:text-red-700 font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleGenerateVariants}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 shadow-sm transition-all"
                    >
                      ⚡ Generate Variants Matrix (
                      {attributes.reduce(
                        (sum, a) => sum * (a.values.length || 1),
                        1,
                      )}{" "}
                      Variants)
                    </button>
                  </div>
                </div>

                {/* Generated Variants Editable Table */}
                {variants.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                        Generated Variants ({variants.length})
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        Rule 5: Removing variants with order history archives
                        them safely.
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-300">
                          <tr>
                            <th className="py-2.5 px-3 font-semibold">
                              Options
                            </th>
                            <th className="py-2.5 px-3 font-semibold">SKU *</th>
                            <th className="py-2.5 px-3 font-semibold">
                              Price (₹) *
                            </th>
                            <th className="py-2.5 px-3 font-semibold">
                              Stock *
                            </th>
                            <th className="py-2.5 px-3 font-semibold">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                          {variants.map((v, vIdx) => {
                            const optionStr = Object.entries(v.options)
                              .map(([k, val]) => `${k}: ${val}`)
                              .join(" / ");

                            return (
                              <tr
                                key={vIdx}
                                className="transition hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40"
                              >
                                <td className="py-2.5 px-3 font-medium text-neutral-900 dark:text-neutral-100">
                                  {optionStr || "Default Variant"}
                                </td>
                                <td className="py-2.5 px-3">
                                  <input
                                    type="text"
                                    required
                                    value={v.sku}
                                    onChange={(e) =>
                                      handleUpdateVariantRow(vIdx, {
                                        sku: e.target.value.toUpperCase(),
                                      })
                                    }
                                    className="w-32 rounded border border-neutral-300 px-2 py-1 font-mono text-xs uppercase dark:border-neutral-700 dark:bg-neutral-900"
                                  />
                                </td>
                                <td className="py-2.5 px-3">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    required
                                    value={v.price}
                                    onChange={(e) =>
                                      handleUpdateVariantRow(vIdx, {
                                        price: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    className="w-24 rounded border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                                  />
                                </td>
                                <td className="py-2.5 px-3">
                                  <input
                                    type="number"
                                    min="0"
                                    required
                                    value={v.stock}
                                    onChange={(e) =>
                                      handleUpdateVariantRow(vIdx, {
                                        stock:
                                          parseInt(e.target.value, 10) || 0,
                                      })
                                    }
                                    className="w-20 rounded border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                                  />
                                </td>
                                <td className="py-2.5 px-3">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveVariantRow(vIdx)}
                                    className="text-xs font-semibold text-red-600 hover:text-red-700"
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section: Product Photography & Color Tagging */}
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <ProductImageUploader
              images={images}
              onChange={setImages}
              availableColors={availableColors}
              colorImages={colorImages}
              onColorImagesChange={setColorImages}
            />
          </div>
        </div>

        {/* Right Column (1 Col): Taxonomy & Publishing Status */}
        <div className="space-y-6">
          {/* Status & Publication Box */}
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
              Publishing Status
            </h2>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Catalog Status
              </label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "DRAFT" | "ACTIVE")
                }
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              >
                <option value="DRAFT">Draft (Hidden from storefront)</option>
                <option value="ACTIVE">Active (Live in catalog)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Department / Gender *
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as "MEN" | "KIDS")}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              >
                <option value="MEN">Men&apos;s Apparel</option>
                <option value="KIDS">Kids&apos; Apparel</option>
              </select>
            </div>
          </div>

          {/* Classification: Brand & Category */}
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
              Classification
            </h2>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Brand *
              </label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              >
                {brands.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              >
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.gender})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
