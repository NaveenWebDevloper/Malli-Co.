"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { PriceTag } from "@/components/product/PriceTag";
import { useCart } from "./CartContext";
import type { DetailedProduct } from "@/lib/catalog";
import { getColorHex, isLightColor } from "@/lib/colors";
import { SizeGuideModal } from "./SizeGuideModal";

export function ProductDetailView({ product }: { product: DetailedProduct }) {
  // Extract all distinct options from variants
  const { allSizes, allColors, isVariable } = useMemo(() => {
    const sizeSet = new Set<string>();
    const colorSet = new Set<string>();

    for (const v of product.variants) {
      if (v.options?.Size) sizeSet.add(v.options.Size);
      if (v.options?.Color) colorSet.add(v.options.Color);
    }

    return {
      allSizes: Array.from(sizeSet),
      allColors: Array.from(colorSet),
      isVariable: product.type === "VARIABLE" && (sizeSet.size > 0 || colorSet.size > 0),
    };
  }, [product]);

  // Initial color & size selection
  const [selectedColor, setSelectedColor] = useState<string>(
    () => allColors[0] || "",
  );

  const [selectedSize, setSelectedSize] = useState<string>(() => {
    if (!allColors[0]) return allSizes[0] || "";
    // Pick first size with positive stock in this initial color
    const inStockSize = allSizes.find((sz) => {
      const v = product.variants.find(
        (variant) =>
          variant.options?.Color === allColors[0] &&
          variant.options?.Size === sz,
      );
      return v && v.stock > 0;
    });
    return inStockSize || allSizes[0] || "";
  });

  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [addedToast, setAddedToast] = useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  // Active Variant based on selection
  const activeVariant = useMemo(() => {
    if (!isVariable) {
      return product.variants[0] || null;
    }
    return (
      product.variants.find((v) => {
        const matchesColor = !selectedColor || v.options?.Color === selectedColor;
        const matchesSize = !selectedSize || v.options?.Size === selectedSize;
        return matchesColor && matchesSize;
      }) || null
    );
  }, [product.variants, isVariable, selectedColor, selectedSize]);

  // Active Image Gallery: switch images if variant has specific images, else use product images
  const galleryImages = useMemo(() => {
    const validVariantImages = (activeVariant?.images || []).filter(
      (img) => Boolean(img) && !img.includes("simulated_"),
    );
    if (validVariantImages.length > 0) {
      return validVariantImages;
    }
    const validProductImages = (product.images || []).filter(
      (img) => Boolean(img) && !img.includes("simulated_"),
    );
    return validProductImages.length > 0
      ? validProductImages
      : ["/images/products/linen-oxford-front.jpg"];
  }, [activeVariant, product.images]);

  // Switch color handler
  const handleColorChange = (newColor: string) => {
    setSelectedColor(newColor);
    setActiveImageIndex(0);

    // If currently selected size is out of stock in new color, check for an available size
    const currentSizeAvailable = product.variants.some(
      (v) =>
        v.options?.Color === newColor &&
        v.options?.Size === selectedSize &&
        v.stock > 0,
    );

    if (!currentSizeAvailable) {
      const firstAvailable = allSizes.find((sz) => {
        const v = product.variants.find(
          (variant) =>
            variant.options?.Color === newColor &&
            variant.options?.Size === sz,
        );
        return v && v.stock > 0;
      });
      if (firstAvailable) {
        setSelectedSize(firstAvailable);
      }
    }
  };

  const currentPricePaise = activeVariant ? activeVariant.pricePaise : product.basePricePaise;
  const compareAtPricePaise = activeVariant?.compareAtPricePaise;
  const currentStock = activeVariant ? activeVariant.stock : 0;
  const isOutOfStock = currentStock <= 0;

  const [isAdding, setIsAdding] = useState(false);
  const { addToCart } = useCart();
  const [saleTimeText, setSaleTimeText] = useState<string>("");

  useEffect(() => {
    if (!product.activeCampaign?.endsAt) return;
    const endsAtMs = new Date(product.activeCampaign.endsAt).getTime();

    const updateTimer = () => {
      const diff = endsAtMs - Date.now();
      if (diff <= 0) {
        setSaleTimeText("Ended");
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setSaleTimeText(`${days}d ${hours}h left`);
      } else {
        setSaleTimeText(`${hours}h ${mins}m ${secs}s left`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [product.activeCampaign?.endsAt]);

  const handleAddToBag = async () => {
    if (isOutOfStock || !activeVariant) return;
    setIsAdding(true);
    try {
      await addToCart(activeVariant._id, quantity);
      setAddedToast(true);
      setTimeout(() => setAddedToast(false), 3000);
    } catch {
      // Handled in context
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
      {/* Breadcrumb Trail */}
      <nav className="mb-8 flex items-center gap-2 text-xs text-neutral-500 uppercase tracking-widest">
        <Link href="/" className="hover:text-black">
          Home
        </Link>
        <span>/</span>
        <Link
          href={product.gender === "MEN" ? "/men" : "/kids"}
          className="hover:text-black"
        >
          {product.gender === "MEN" ? "Men" : "Kids"}
        </Link>
        {product.category && (
          <>
            <span>/</span>
            <Link
              href={`/category/${product.category.slug}`}
              className="hover:text-black"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-black font-semibold truncate max-w-[200px]">
          {product.name}
        </span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
        {/* Left Column: Image Gallery */}
        <div className="space-y-4">
          {/* Main Large Image */}
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl bg-[#F0EBE1] border border-[#E8E2D6] shadow-sm">
            <Image
              src={galleryImages[activeImageIndex] || galleryImages[0]}
              alt={`${product.name} - View ${activeImageIndex + 1}`}
              fill
              priority
              unoptimized
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover object-center transition-all duration-500"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.src = "/images/products/linen-oxford-front.jpg";
              }}
            />
            {isOutOfStock && (
              <div className="absolute top-4 left-4 bg-neutral-900/90 text-white text-[11px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-full backdrop-blur-sm">
                Sold Out
              </div>
            )}
          </div>

          {/* Thumbnails Row */}
          {galleryImages.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative h-20 w-16 sm:h-24 sm:w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                    activeImageIndex === idx
                      ? "border-neutral-900 shadow-md"
                      : "border-[#E8E2D6] opacity-70 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    fill
                    unoptimized
                    sizes="80px"
                    className="object-cover"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      target.src = "/images/products/linen-oxford-front.jpg";
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Product Meta & Variant Selection */}
        <div className="space-y-6">
          {/* Brand, Sale Badge & Title */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              {product.brand && (
                <span className="text-xs font-bold uppercase tracking-[0.25em] text-neutral-500">
                  {product.brand.name}
                </span>
              )}
              {product.activeCampaign?.badgeLabel && (
                <span className="bg-[#8C7A58] text-white text-[9.5px] uppercase font-bold tracking-wider px-2 py-0.5 rounded shadow-sm">
                  {product.activeCampaign.badgeLabel}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-4xl font-serif font-black tracking-tight text-[#121212] uppercase leading-tight">
              {product.name}
            </h1>

            {/* Price Row with PriceTag */}
            <div className="mt-3">
              <PriceTag
                pricing={activeVariant?.pricing || product.pricing}
                finalPricePaise={currentPricePaise}
                compareAtPricePaise={compareAtPricePaise}
                size="xl"
                showTaxLabel
              />
            </div>

            {/* "Sale ends in X" Callout Banner */}
            {product.activeCampaign && saleTimeText && saleTimeText !== "Ended" && (
              <div
                role="timer"
                aria-live="off"
                className="mt-3.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#8C7A58]/10 border border-[#8C7A58]/20 text-[#8C7A58] text-xs font-semibold"
              >
                <span>⚡</span>
                <span>
                  {product.activeCampaign.name}: Sale ends in{" "}
                  <strong className="font-mono font-bold">{saleTimeText}</strong>
                </span>
              </div>
            )}

            {/* SKU and Stock Indicator */}
            {activeVariant && (
              <div className="mt-2 flex items-center gap-3 text-xs">
                <span className="font-mono text-neutral-400">
                  SKU: {activeVariant.sku}
                </span>
                <span className="text-neutral-300">•</span>
                <span
                  className={`font-semibold ${
                    isOutOfStock
                      ? "text-red-600"
                      : currentStock <= 5
                      ? "text-amber-600"
                      : "text-emerald-700"
                  }`}
                >
                  {isOutOfStock
                    ? "Out of Stock"
                    : currentStock <= 5
                    ? `Only ${currentStock} left in stock`
                    : "In Stock"}
                </span>
              </div>
            )}
          </div>

          <div className="h-px bg-[#EAE3D4]" />

          {/* Color Variant Selector */}
          {allColors.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-neutral-700">
                  Color: <span className="font-normal text-black">{selectedColor}</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {allColors.map((colorName) => {
                  const isSelected = selectedColor === colorName;
                  const hex = getColorHex(colorName);
                  const isLight = isLightColor(hex);
                  return (
                    <button
                      key={colorName}
                      type="button"
                      onClick={() => handleColorChange(colorName)}
                      className={`group relative flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all ${
                        isSelected
                          ? "bg-[#121212] text-white border-black shadow-sm"
                          : "bg-white text-neutral-800 border-[#DDD4C1] hover:border-black"
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full flex-shrink-0 transition-transform group-hover:scale-110 ${
                          isLight
                            ? "border border-neutral-400/80 shadow-2xs"
                            : "border border-black/10 shadow-2xs"
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                      <span>{colorName}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size Variant Selector with Disabled/Out of Stock States */}
          {allSizes.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-neutral-700">
                  Select Size: <span className="font-normal text-black">{selectedSize}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsSizeGuideOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-[#8C7A58] hover:text-[#121212] font-semibold underline underline-offset-4 decoration-[#8C7A58]/50 hover:decoration-[#121212] transition-colors cursor-pointer"
                >
                  <svg
                    className="w-3.5 h-3.5 text-[#8C7A58]"
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
                  Size Guide
                </button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {allSizes.map((sz) => {
                  // Check stock for this size in currently selected color
                  const variantForSize = product.variants.find((v) => {
                    const matchesColor = !selectedColor || v.options?.Color === selectedColor;
                    return matchesColor && v.options?.Size === sz;
                  });

                  const hasInventory = Boolean(variantForSize && variantForSize.stock > 0);
                  const isSelected = selectedSize === sz;

                  return (
                    <button
                      key={sz}
                      type="button"
                      disabled={!hasInventory}
                      onClick={() => setSelectedSize(sz)}
                      title={hasInventory ? `Select size ${sz}` : `Size ${sz} is Out of Stock`}
                      className={`relative py-3 rounded-xl border text-xs font-bold transition-all ${
                        isSelected
                          ? "bg-[#121212] text-white border-black shadow-sm"
                          : hasInventory
                          ? "bg-white text-neutral-800 border-[#DDD4C1] hover:border-black"
                          : "bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed line-through opacity-60"
                      }`}
                    >
                      {sz}
                      {!hasInventory && (
                        <span className="sr-only">(Out of Stock)</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity Selector & Add to Bag CTAs */}
          <div className="space-y-3 pt-2">
            <div className="flex gap-3">
              {/* Quantity */}
              <div className="flex items-center rounded-xl border border-[#DDD4C1] bg-white px-3 py-2 text-xs font-semibold text-neutral-800">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || isOutOfStock}
                  className="px-2 text-neutral-400 hover:text-black disabled:opacity-30"
                >
                  −
                </button>
                <span className="px-2 font-mono">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(currentStock, q + 1))}
                  disabled={quantity >= currentStock || isOutOfStock}
                  className="px-2 text-neutral-400 hover:text-black disabled:opacity-30"
                >
                  +
                </button>
              </div>

              {/* Add to Bag CTA */}
              <button
                type="button"
                onClick={handleAddToBag}
                disabled={isOutOfStock || isAdding}
                className="flex-1 py-3.5 px-6 rounded-xl bg-[#121212] text-white text-xs font-serif font-bold uppercase tracking-[0.2em] shadow-lg hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.99]"
              >
                {isOutOfStock ? "Sold Out" : isAdding ? "Adding..." : "Add to Bag"}
              </button>
            </div>

            {/* Feedback message */}
            {addedToast && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center justify-between">
                <span>✓ Added {quantity} unit(s) of {product.name} ({selectedColor} / {selectedSize}) to bag.</span>
                <Link href="/admin/orders" className="underline">View</Link>
              </div>
            )}
          </div>

          <div className="h-px bg-[#EAE3D4]" />

          {/* Description & Details Accordion */}
          <div className="space-y-4 text-xs">
            <div>
              <h3 className="font-bold uppercase tracking-wider text-neutral-900 mb-2">
                Product Details &amp; Story
              </h3>
              <p className="text-neutral-600 leading-relaxed font-light text-xs sm:text-sm">
                {product.description}
              </p>
            </div>

            <div className="rounded-2xl border border-[#EAE3D4] bg-[#F4EFE6]/40 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <span className="text-base">🧵</span>
                <div>
                  <h4 className="font-bold text-neutral-900">Premium Quality &amp; Craftsmanship</h4>
                  <p className="text-neutral-600 font-light mt-0.5">
                    Crafted with durable high-precision stitching, reinforced seams, and premium quality buttons for everyday comfort and lasting wear.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-base">📦</span>
                <div>
                  <h4 className="font-bold text-neutral-900">Complimentary Pan-India Delivery</h4>
                  <p className="text-neutral-600 font-light mt-0.5">
                    Express courier dispatch with 14-day complimentary doorstep return pickup.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Bespoke Size Guide Modal */}
      <SizeGuideModal
        isOpen={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
        product={product}
        selectedSize={selectedSize}
        onSelectSize={(sz) => {
          if (allSizes.includes(sz)) {
            setSelectedSize(sz);
          }
        }}
      />
    </div>
  );
}

