"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "./CartContext";
import { formatCurrency } from "@/lib/currency";
import { PriceTag } from "@/components/product/PriceTag";

export function CartPageView() {
  const { cart, updateQuantity, removeFromCart, isLoading } = useCart();
  const items = cart?.items || [];
  const totals = cart?.totals;

  if (isLoading) {
    return (
      <div className="py-20 text-center text-neutral-400 text-xs">
        Loading bag contents...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-20 text-center space-y-4">
        <span className="text-3xl">🛍️</span>
        <h2 className="text-lg font-serif font-bold text-[#121212]">
          Your shopping bag is empty
        </h2>
        <p className="text-xs text-neutral-500 max-w-sm mx-auto">
          Explore our collection of pure linen shirts and premium cotton tees.
        </p>
        <Link
          href="/men"
          className="inline-block px-8 py-3 rounded-full bg-[#121212] text-white hover:bg-neutral-800 text-xs font-semibold uppercase tracking-widest transition-all shadow-md active:scale-[0.98]"
        >
          Explore Men&apos;s Collection
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Price Drift & Promotion Notices */}
      {cart?.notices && cart.notices.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1.5">
          {cart.notices.map((notice, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-amber-900 font-medium">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <span>{notice}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Items list */}
        <div className="lg:col-span-8 space-y-4">
          {items.map((item) => (
            <div
              key={item.variantId}
              className="flex gap-4 p-4 rounded-2xl bg-white border border-[#EAE3D4] text-xs items-center"
            >
              <div className="relative h-24 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-[#F0EBE1] border border-[#EAE3D4]">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.productName}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-400">
                    IMG
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <Link
                  href={`/product/${item.productSlug}`}
                  className="font-semibold text-neutral-900 text-sm hover:underline line-clamp-1"
                >
                  {item.productName}
                </Link>
                <p className="font-mono text-neutral-400 text-[11px] mt-0.5">
                  SKU: {item.sku}
                </p>
                {item.options && (
                  <div className="flex flex-wrap gap-1 mt-1 text-[11px] text-neutral-600">
                    {Object.entries(item.options).map(([k, v]) => (
                      <span key={k} className="bg-neutral-100 px-1.5 py-0.5 rounded">
                        {k}: {v}
                      </span>
                    ))}
                  </div>
                )}
                {item.badgeLabel && (
                  <div className="mt-1.5">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#8C7A58]/10 text-[#8C7A58]">
                      {item.badgeLabel}
                    </span>
                  </div>
                )}
              </div>

              {/* Stepper */}
              <div className="flex items-center rounded-lg border border-[#DDD4C1] bg-[#FBF9F5] px-2 py-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                  className="px-1.5 text-neutral-400 hover:text-black"
                >
                  −
                </button>
                <span className="px-2 font-mono">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                  className="px-1.5 text-neutral-400 hover:text-black"
                >
                  +
                </button>
              </div>

              {/* Line total with PriceTag */}
              <div className="text-right w-28">
                <PriceTag
                  finalPricePaise={item.lineTotalPaise}
                  compareAtPricePaise={
                    item.basePricePaise && item.basePricePaise > item.pricePaise
                      ? item.basePricePaise * item.quantity
                      : item.compareAtPricePaise
                        ? item.compareAtPricePaise * item.quantity
                        : undefined
                  }
                  size="sm"
                />
                <button
                  type="button"
                  onClick={() => removeFromCart(item.variantId)}
                  className="text-[11px] text-neutral-400 hover:text-red-600 underline mt-1 block w-full text-right"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        {totals && (
          <div className="lg:col-span-4">
            <div className="rounded-2xl border border-[#EAE3D4] bg-white p-6 shadow-sm space-y-4 text-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 pb-2 border-b border-[#EAE3D4]">
                Summary
              </h2>
              <div className="space-y-2 text-neutral-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatCurrency(totals.subtotalPaise)}</span>
                </div>
                {totals.discountPaise > 0 && (
                  <div className="flex justify-between text-emerald-800 font-semibold">
                    <span>Promotional Savings</span>
                    <span className="font-mono">-{formatCurrency(totals.discountPaise)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="font-semibold text-neutral-900">
                    {totals.shippingPaise === 0
                      ? "Complimentary"
                      : formatCurrency(totals.shippingPaise)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>GST (5% Included)</span>
                  <span className="font-mono">{formatCurrency(totals.taxPaise)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-neutral-900 pt-3 border-t border-neutral-900">
                  <span>Total</span>
                  <span className="font-mono">{formatCurrency(totals.totalPaise)}</span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="w-full py-4 rounded-xl bg-[#121212] hover:bg-neutral-800 text-white font-serif font-bold uppercase tracking-[0.2em] text-xs shadow-lg transition-all text-center flex items-center justify-center active:scale-[0.99]"
              >
                Proceed to Checkout
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

