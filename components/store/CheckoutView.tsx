"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "./CartContext";
import { formatCurrency } from "@/lib/currency";

const INDIAN_STATES = [
  "Telangana",
  "Andhra Pradesh",
  "Karnataka",
  "Maharashtra",
  "Tamil Nadu",
  "Delhi",
  "Gujarat",
  "Kerala",
  "West Bengal",
  "Rajasthan",
  "Uttar Pradesh",
  "Punjab",
  "Haryana",
  "Madhya Pradesh",
  "Goa",
];

export interface CheckoutCustomerAddress {
  name: string;
  phone: string;
  street: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  isDefault?: boolean;
}

export interface CheckoutCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  addresses?: CheckoutCustomerAddress[];
}

export interface CheckoutViewProps {
  initialCustomer?: CheckoutCustomer | null;
}

export function CheckoutView({ initialCustomer }: CheckoutViewProps = {}) {
  const router = useRouter();
  const { cart, refreshCart } = useCart();

  const defaultAddress =
    initialCustomer?.addresses?.find((a) => a.isDefault) ||
    initialCustomer?.addresses?.[0];

  const [formData, setFormData] = useState({
    name: defaultAddress?.name || initialCustomer?.name || "",
    phone: defaultAddress?.phone || initialCustomer?.phone || "",
    email: initialCustomer?.email || "",
    street: defaultAddress?.street || "",
    landmark: defaultAddress?.landmark || "",
    city: defaultAddress?.city || "",
    state: defaultAddress?.state || "Telangana",
    postalCode: defaultAddress?.postalCode || "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const items = cart?.items || [];
  const totals = cart?.totals;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setErrorMessage("Your bag is empty. Please add items before checking out.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Create Order on Server with server-side price and stock validation (Rule 1 & Rule 3)
      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
          })),
          shippingAddress: formData,
        }),
      });

      const orderData = await res.json();
      if (!res.ok) {
        throw new Error(orderData.error || "Order creation failed");
      }

      const { orderNumber, razorpayOrderId, amountPaise, keyId, customer } =
        orderData;

      // Helper to ensure Razorpay script is loaded before opening modal
      const loadRazorpayScript = async (): Promise<boolean> => {
        if (typeof (window as unknown as { Razorpay?: unknown }).Razorpay !== "undefined") {
          return true;
        }
        return new Promise((resolve) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });
      };

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error(
          "Could not load secure Razorpay payment gateway. Please check your internet connection and try again.",
        );
      }

      const options = {
        key: keyId,
        amount: amountPaise,
        currency: "INR",
        name: "Malli & Co.",
        description: `Artisanal Garment Order #${orderNumber}`,
        order_id: razorpayOrderId,
        prefill: {
          name: customer.name,
          email: customer.email,
          contact: customer.phone,
        },
        theme: {
          color: "#8C7A58",
        },
        modal: {
          ondismiss: () => {
            setIsSubmitting(false);
            setErrorMessage(
              `Payment was not completed. Your items are held for 15 minutes under Order #${orderNumber}. You can retry payment anytime.`,
            );
          },
        },
        handler: async function (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) {
          try {
            // Verify payment signature server-side (Rule 1 & Rule 3)
            const verifyRes = await fetch("/api/checkout/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderNumber,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(
                verifyData.error || "Payment signature verification failed.",
              );
            }

            await refreshCart();
            router.push(
              `/order/confirmed/${encodeURIComponent(orderNumber)}`,
            );
          } catch (verifyErr) {
            setIsSubmitting(false);
            setErrorMessage(
              verifyErr instanceof Error
                ? verifyErr.message
                : "Payment verification failed. Please contact concierge support.",
            );
          }
        },
      };

      type RazorpayInstance = {
        open: () => void;
        on: (
          event: string,
          handler: (resp: { error?: { description?: string } }) => void,
        ) => void;
      };

      const RazorpayConstructor = (
        window as unknown as {
          Razorpay: new (opts: typeof options) => RazorpayInstance;
        }
      ).Razorpay;

      const rzp = new RazorpayConstructor(options);

      rzp.on("payment.failed", function (resp) {
        setIsSubmitting(false);
        setErrorMessage(
          resp.error?.description ||
            "Payment failed at bank gateway. Please try another card or UPI method.",
        );
      });

      rzp.open();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to process checkout",
      );
      setIsSubmitting(false);
    }
  };

  if (!cart && items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="text-2xl font-serif font-bold text-[#121212]">
          Your Shopping Bag is Empty
        </h1>
        <p className="text-xs text-neutral-500">
          Add luxury essentials to your bag to proceed with secure checkout.
        </p>
        <Link
          href="/men"
          className="inline-block px-6 py-3 rounded-full bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest"
        >
          Explore Collection
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
      <div className="mb-8 pb-4 border-b border-[#EAE3D4]">
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-500">
          Express Checkout
        </span>
        <h1 className="text-2xl sm:text-3xl font-serif font-black uppercase tracking-tight text-[#121212] mt-1">
          Delivery & Payment
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Delivery Address Form (7 cols) */}
        <div className="lg:col-span-7">
          <form onSubmit={handleCheckoutSubmit} className="space-y-6">
            {errorMessage && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {errorMessage}
              </div>
            )}

            {/* Contact & Destination */}
            <div className="rounded-2xl border border-[#EAE3D4] bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                1. Delivery Destination
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Vikramaditya Rao"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[#DDD4C1] px-3 py-2 text-xs text-[#121212] focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    placeholder="10-digit mobile number"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[#DDD4C1] px-3 py-2 text-xs text-[#121212] focus:border-black focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Email Address (for order tracking & invoice) <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="vikram@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-[#DDD4C1] px-3 py-2 text-xs text-[#121212] focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Street Address & House / Flat No. <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="street"
                  required
                  placeholder="Plot 42, Road No. 36, Jubilee Hills"
                  value={formData.street}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-[#DDD4C1] px-3 py-2 text-xs text-[#121212] focus:border-black focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Landmark
                  </label>
                  <input
                    type="text"
                    name="landmark"
                    placeholder="Near Metro Station"
                    value={formData.landmark}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[#DDD4C1] px-3 py-2 text-xs text-[#121212] focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    required
                    placeholder="Hyderabad"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[#DDD4C1] px-3 py-2 text-xs text-[#121212] focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    PIN Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    required
                    maxLength={6}
                    placeholder="500033"
                    value={formData.postalCode}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[#DDD4C1] px-3 py-2 text-xs text-[#121212] focus:border-black focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  State <span className="text-red-500">*</span>
                </label>
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-[#DDD4C1] bg-white px-3 py-2 text-xs text-[#121212] focus:border-black focus:outline-none font-medium"
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Payment Method */}
            <div className="rounded-2xl border border-[#EAE3D4] bg-white p-6 shadow-sm space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                2. Payment Gateway
              </h2>

              <div className="p-4 rounded-xl border border-[#121212] bg-[#FBF9F5] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-[#121212] flex items-center justify-center text-[9px] text-white font-bold">
                    ✓
                  </span>
                  <div>
                    <p className="text-xs font-bold text-[#121212]">
                      Razorpay Official Payment Gateway
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      Supports UPI (GPay, PhonePe, Paytm), Credit/Debit Cards, NetBanking
                    </p>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  RBI Compliant
                </span>
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={isSubmitting || items.length === 0}
              className="w-full py-4 rounded-xl bg-[#121212] text-white text-xs font-serif font-bold uppercase tracking-[0.2em] shadow-xl hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.99] flex items-center justify-center"
            >
              {isSubmitting
                ? "Initiating Secure Payment..."
                : totals
                ? `Pay ${formatCurrency(totals.totalPaise)} via Razorpay`
                : "Proceed to Payment"}
            </button>
          </form>
        </div>

        {/* Right Column: Order Summary (5 cols) */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-[#EAE3D4] bg-white p-6 shadow-sm space-y-4 text-xs sticky top-24">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 pb-2 border-b border-[#EAE3D4]">
              Order Summary ({items.length})
            </h2>

            {/* Items scroll */}
            <div className="divide-y divide-neutral-100 max-h-72 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.variantId} className="flex items-center gap-3 py-3">
                  <div className="relative h-14 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-[#F0EBE1] border border-[#E8E2D6]">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.productName}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-400">
                        IMG
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-neutral-900 truncate">
                      {item.productName}
                    </p>
                    <p className="text-[11px] text-neutral-500 font-mono">
                      Qty: {item.quantity} • {formatCurrency(item.pricePaise)}
                    </p>
                  </div>
                  <span className="font-mono font-semibold text-neutral-900">
                    {formatCurrency(item.lineTotalPaise)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            {totals && (
              <div className="space-y-2 pt-3 border-t border-[#EAE3D4]">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatCurrency(totals.subtotalPaise)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Shipping</span>
                  <span className="font-semibold text-neutral-900">
                    {totals.shippingPaise === 0
                      ? "Complimentary"
                      : formatCurrency(totals.shippingPaise)}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Estimated GST (5%)</span>
                  <span className="font-mono">{formatCurrency(totals.taxPaise)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-neutral-900 pt-3 border-t border-neutral-900">
                  <span>Grand Total</span>
                  <span className="font-mono">{formatCurrency(totals.totalPaise)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
