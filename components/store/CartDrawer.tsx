"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "./CartContext";
import { formatCurrency } from "@/lib/currency";
import { PriceTag } from "@/components/product/PriceTag";
import { FREE_SHIPPING_THRESHOLD_PAISE } from "@/lib/constants";

export function CartDrawer() {
  const { cart, isDrawerOpen, closeCart, updateQuantity, removeFromCart, isLoading } =
    useCart();

  if (!isDrawerOpen) return null;

  const items = cart?.items || [];
  const totals = cart?.totals;
  const subtotal = totals?.subtotalPaise || 0;
  const neededForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD_PAISE - subtotal);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={closeCart}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#FBF9F5] shadow-2xl flex flex-col border-l border-[#EAE3D4]">
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#EAE3D4] flex items-center justify-between">
            <div>
              <h2 className="text-base font-serif font-black uppercase tracking-wider text-[#121212]">
                Your Shopping Bag
              </h2>
              <span className="text-[11px] text-neutral-500">
                {items.length} {items.length === 1 ? "design" : "designs"}
              </span>
            </div>
            <button
              onClick={closeCart}
              className="p-1.5 text-neutral-400 hover:text-black text-xl"
            >
              ✕
            </button>
          </div>

          {/* Shipping Progress Banner */}
          <div className="bg-[#F4EFE6] px-6 py-2.5 border-b border-[#EAE3D4] text-xs text-neutral-700">
            {neededForFreeShipping > 0 ? (
              <p>
                Add <strong className="text-black">{formatCurrency(neededForFreeShipping)}</strong> more for <strong className="text-emerald-800">Complimentary Pan-India Shipping</strong>
              </p>
            ) : (
              <p className="text-emerald-800 font-semibold flex items-center gap-1.5">
                <span>✓</span> You qualify for Complimentary Pan-India Shipping!
              </p>
            )}
          </div>

          {/* Price Drift & Promotion Notices */}
          {cart?.notices && cart.notices.length > 0 && (
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 space-y-1">
              {cart.notices.map((notice, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-amber-900 font-medium">
                  <span className="shrink-0 mt-0.5">⚠️</span>
                  <span>{notice}</span>
                </div>
              ))}
            </div>
          )}

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {isLoading && (
              <div className="text-center py-16 text-neutral-400 text-xs">
                Synchronizing bag...
              </div>
            )}

            {!isLoading && items.length === 0 && (
              <div className="text-center py-24 space-y-4">
                <span className="text-3xl">🛍️</span>
                <p className="font-serif text-base font-bold text-[#121212]">
                  Your shopping bag is empty
                </p>
                <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                  Explore our luxury French linen shirts and organic cotton festive wear.
                </p>
                <button
                  type="button"
                  onClick={closeCart}
                  className="inline-block px-6 py-2.5 rounded-full bg-[#121212] text-white hover:bg-neutral-800 text-xs font-semibold uppercase tracking-widest transition-all shadow-md active:scale-[0.98]"
                >
                  Start Exploring
                </button>
              </div>
            )}

            {!isLoading &&
              items.map((item) => (
                <div
                  key={item.variantId}
                  className="flex gap-4 p-3.5 rounded-2xl bg-white border border-[#EAE3D4] text-xs"
                >
                  <div className="relative h-20 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-[#F0EBE1] border border-[#EAE3D4]">
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

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <Link
                          href={`/product/${item.productSlug}`}
                          onClick={closeCart}
                          className="font-semibold text-neutral-900 hover:underline line-clamp-1 text-xs"
                        >
                          {item.productName}
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.variantId)}
                          className="text-neutral-400 hover:text-red-600 text-sm ml-2"
                          title="Remove item"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1 mt-1 text-[11px] text-neutral-500 font-mono">
                        {item.options &&
                          Object.entries(item.options).map(([k, v]) => (
                            <span key={k} className="bg-neutral-100 px-1.5 py-0.5 rounded">
                              {k}: {v}
                            </span>
                          ))}
                      </div>

                      {item.badgeLabel && (
                        <div className="mt-1">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase bg-[#8C7A58]/10 text-[#8C7A58]">
                            {item.badgeLabel}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      {/* Quantity Stepper */}
                      <div className="flex items-center rounded-lg border border-[#DDD4C1] bg-[#FBF9F5] px-2 py-0.5 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                          className="px-1 text-neutral-400 hover:text-black"
                        >
                          −
                        </button>
                        <span className="px-2 font-mono text-[11px]">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                          className="px-1 text-neutral-400 hover:text-black"
                        >
                          +
                        </button>
                      </div>

                      {/* Line Price with PriceTag */}
                      <PriceTag
                        finalPricePaise={item.lineTotalPaise}
                        compareAtPricePaise={
                          item.basePricePaise && item.basePricePaise > item.pricePaise
                            ? item.basePricePaise * item.quantity
                            : item.compareAtPricePaise
                              ? item.compareAtPricePaise * item.quantity
                              : undefined
                        }
                        size="xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* Footer Checkout Summary */}
          {items.length > 0 && totals && (
            <div className="border-t border-[#EAE3D4] bg-white p-6 space-y-4 text-xs">
              <div className="space-y-1.5 text-neutral-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-neutral-900">
                    {formatCurrency(totals.subtotalPaise)}
                  </span>
                </div>
                {totals.discountPaise > 0 && (
                  <div className="flex justify-between text-emerald-800 font-semibold">
                    <span>Promotional Savings</span>
                    <span>-{formatCurrency(totals.discountPaise)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="font-semibold text-neutral-900">
                    {totals.shippingPaise === 0 ? "Complimentary" : formatCurrency(totals.shippingPaise)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>GST (5% Included)</span>
                  <span className="font-semibold text-neutral-900">
                    {formatCurrency(totals.taxPaise)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-neutral-900 pt-2 border-t border-[#EAE3D4]">
                  <span>Total Payable</span>
                  <span>{formatCurrency(totals.totalPaise)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Link
                  href="/checkout"
                  onClick={closeCart}
                  className="w-full py-3.5 rounded-xl bg-[#121212] hover:bg-neutral-800 text-white font-serif font-bold uppercase tracking-[0.2em] text-xs shadow-lg transition-all text-center flex items-center justify-center active:scale-[0.99]"
                >
                  Proceed to Checkout
                </Link>
                <button
                  type="button"
                  onClick={closeCart}
                  className="w-full py-2.5 text-center text-neutral-600 hover:text-black text-xs font-semibold uppercase tracking-wider transition-colors"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

