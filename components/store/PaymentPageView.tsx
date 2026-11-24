"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/currency";
import { QrCode } from "@/lib/qrcode";

export interface PaymentPageItem {
  name: string;
  sku: string;
  qty: number;
  pricePaise: number;
  image?: string;
  options?: Record<string, string>;
}

export interface PaymentPageProps {
  orderNumber: string;
  totalPaise: number;
  subtotalPaise: number;
  shippingPaise: number;
  taxPaise: number;
  discountPaise: number;
  expiresAt?: string;
  items: PaymentPageItem[];
  shippingAddress: {
    name: string;
    phone: string;
    street: string;
    landmark?: string;
    city: string;
    state: string;
    postalCode: string;
  };
  upiDetails: {
    upiId: string;
    payeeName: string;
    qrImage?: string;
    instructions?: string;
    upiUri: string;
  };
}

export function PaymentPageView({
  orderNumber,
  totalPaise,
  subtotalPaise,
  shippingPaise,
  taxPaise,
  discountPaise,
  expiresAt,
  items,
  shippingAddress,
  upiDetails,
}: PaymentPageProps) {
  const router = useRouter();
  const [utrNumber, setUtrNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"standee" | "dynamic">(
    upiDetails.qrImage ? "standee" : "dynamic",
  );

  // Live countdown timer for the reservation hold
  const [timeLeft, setTimeLeft] = useState<{ minutes: number; seconds: number } | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;
    const target = new Date(expiresAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft({ minutes: 0, seconds: 0 });
        setIsExpired(true);
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeLeft({ minutes, seconds });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  // Generate dynamic QR SVG
  let dynamicQrSvg = "";
  try {
    const qr = QrCode.encodeText(upiDetails.upiUri, "M");
    dynamicQrSvg = qr.toSvg(200, 2);
  } catch (err) {
    console.error("Failed to generate QR code SVG:", err);
  }

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2500);
    } catch {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2500);
    }
  };

  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = utrNumber.trim();
    if (!clean || clean.length < 6) {
      setErrorMessage("Please enter a valid 12-digit UTR or Transaction ID (minimum 6 alphanumeric characters).");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/checkout/submit-utr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber,
          utrNumber: clean,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record payment reference");
      }

      router.push(`/order/confirmed/${encodeURIComponent(orderNumber)}`);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Could not submit payment reference. Please check your connection and try again.",
      );
      setIsSubmitting(false);
    }
  };

  const amountRupees = (totalPaise / 100).toFixed(2);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#121212] py-8 sm:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Navigation Step Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#EAE3D4]">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-[#8C7A58]">
              <span>Checkout</span>
              <span>/</span>
              <span className="text-[#121212]">Step 2 of 2: Payment</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-black uppercase tracking-tight text-[#121212] mt-1">
              Complete Your UPI Payment
            </h1>
            <p className="text-xs font-mono text-neutral-500 mt-0.5">
              Order Reference: <strong className="text-black">#{orderNumber}</strong>
            </p>
          </div>

          {/* Reservation Hold Timer Badge */}
          {timeLeft && (
            <div
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-medium ${
                isExpired
                  ? "bg-red-50 text-red-800 border-red-200"
                  : timeLeft.minutes < 3
                  ? "bg-amber-50 text-amber-800 border-amber-300 animate-pulse"
                  : "bg-emerald-50 text-emerald-900 border-emerald-200"
              }`}
            >
              <span className="text-sm">⏱️</span>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider block">
                  {isExpired ? "Stock Reservation Expired" : "Stock Held For"}
                </span>
                <span className="font-mono font-bold text-sm">
                  {String(timeLeft.minutes).padStart(2, "0")}:{String(timeLeft.seconds).padStart(2, "0")}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Main Content: 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left Column: Interactive Payment & QR Area (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Amount Banner Card */}
            <div className="rounded-2xl border border-[#EAE3D4] bg-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                  Exact Payable Total
                </span>
                <span className="text-3xl sm:text-4xl font-mono font-black text-[#121212]">
                  {formatCurrency(totalPaise)}
                </span>
                <span className="text-[11px] text-neutral-500 block mt-0.5">
                  Includes all applicable apparel taxes (GST 5%) &amp; delivery
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(amountRupees, "amount")}
                className="self-start sm:self-auto px-4 py-2 rounded-xl border border-[#DDD4C1] bg-[#FBF9F5] hover:bg-neutral-100 text-xs font-bold text-neutral-800 transition shadow-sm"
              >
                {copiedField === "amount" ? "✓ Amount Copied" : "Copy Amount"}
              </button>
            </div>

            {/* QR Scanner & Mobile App Deep Link Card */}
            <div className="rounded-2xl border border-[#EAE3D4] bg-white p-6 sm:p-8 shadow-sm space-y-6 text-center">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8C7A58] block">
                  Scan &amp; Pay via UPI
                </span>
                <h2 className="text-lg sm:text-xl font-serif font-black uppercase text-[#121212]">
                  Scan with GPay, PhonePe, Paytm, or BHIM
                </h2>
                <p className="text-xs text-neutral-500 max-w-md mx-auto">
                  Open your camera or favorite UPI application on your mobile device and scan the secure code below.
                </p>
              </div>

              {/* Standee vs Dynamic QR Toggle (if store uploaded a physical standee) */}
              {upiDetails.qrImage && (
                <div className="inline-flex rounded-xl bg-[#F0EBE1] p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode("standee")}
                    className={`px-4 py-1.5 rounded-lg font-bold transition ${
                      viewMode === "standee"
                        ? "bg-white text-black shadow-sm"
                        : "text-neutral-500 hover:text-black"
                    }`}
                  >
                    Official Store Scanner
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("dynamic")}
                    className={`px-4 py-1.5 rounded-lg font-bold transition ${
                      viewMode === "dynamic"
                        ? "bg-white text-black shadow-sm"
                        : "text-neutral-500 hover:text-black"
                    }`}
                  >
                    Auto-Filled Amount QR
                  </button>
                </div>
              )}

              {/* QR Code Presentation Box */}
              <div className="inline-block p-4 sm:p-5 rounded-3xl bg-white border-2 border-[#EAE3D4] shadow-md">
                {viewMode === "standee" &&
                upiDetails.qrImage &&
                (upiDetails.qrImage.startsWith("/") ||
                  upiDetails.qrImage.startsWith("http")) ? (
                  <div className="relative w-56 h-56 sm:w-64 sm:h-64 mx-auto rounded-2xl overflow-hidden bg-neutral-50">
                    <Image
                      src={upiDetails.qrImage}
                      alt="Store UPI QR Code"
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                ) : dynamicQrSvg ? (
                  <div
                    className="w-56 h-56 sm:w-64 sm:h-64 mx-auto flex items-center justify-center"
                    dangerouslySetInnerHTML={{ __html: dynamicQrSvg }}
                  />
                ) : (
                  <div className="w-56 h-56 bg-neutral-100 rounded-2xl flex items-center justify-center text-xs text-neutral-400">
                    QR Code
                  </div>
                )}
              </div>

              {/* Mobile "Open UPI App" Button (visible on mobile screens) */}
              <div>
                <a
                  href={upiDetails.upiUri}
                  className="inline-flex items-center justify-center gap-2.5 w-full py-4 px-6 rounded-2xl bg-[#8C7A58] hover:bg-[#786746] text-white text-xs font-bold uppercase tracking-[0.15em] transition shadow-lg active:scale-[0.99] sm:hidden"
                >
                  <span className="text-base">📲</span>
                  <span>Tap to Pay in Any UPI App</span>
                </a>
              </div>

              {/* Store UPI ID Display & Copy */}
              <div className="max-w-md mx-auto p-4 rounded-xl bg-[#FBF9F5] border border-[#EAE3D4] flex items-center justify-between text-xs">
                <div className="text-left overflow-hidden mr-3">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">
                    Store UPI ID ({upiDetails.payeeName})
                  </span>
                  <span className="font-mono font-bold text-neutral-900 text-sm truncate block mt-0.5">
                    {upiDetails.upiId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(upiDetails.upiId, "upiId")}
                  className="px-3.5 py-2 rounded-lg bg-[#121212] text-white text-[11px] font-bold hover:bg-neutral-800 transition whitespace-nowrap shadow-sm"
                >
                  {copiedField === "upiId" ? "✓ Copied" : "Copy UPI ID"}
                </button>
              </div>
            </div>

            {/* Step-by-Step Guidance Box */}
            <div className="rounded-2xl border border-[#EAE3D4] bg-[#FBF9F5] p-5 text-xs text-neutral-600 leading-relaxed space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C7A58] block">
                Simple 3-Step Verification
              </span>
              <p className="whitespace-pre-line text-neutral-700">
                {upiDetails.instructions ||
                  "1. Scan the QR code or transfer to the UPI ID from your UPI app (GPay, PhonePe, Paytm, BHIM).\n2. Pay the exact order amount.\n3. Enter the 12-digit UTR or Transaction ID from your payment receipt below."}
              </p>
            </div>

            {/* UTR / Transaction ID Submission Card */}
            <div className="rounded-2xl border-2 border-[#121212] bg-white p-6 sm:p-8 shadow-md space-y-5">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                  Final Step
                </span>
                <h3 className="text-lg font-serif font-black uppercase text-[#121212]">
                  Enter 12-Digit UTR or Transaction ID
                </h3>
                <p className="text-xs text-neutral-500">
                  After completing the transfer in your bank app, copy the 12-digit reference number (UTR / UPI Ref ID / Txn ID) and submit it below to confirm your order.
                </p>
              </div>

              <form onSubmit={handleSubmitUtr} className="space-y-4">
                <div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 432109876543 or bank reference"
                    value={utrNumber}
                    onChange={(e) => {
                      setUtrNumber(e.target.value);
                      setErrorMessage(null);
                    }}
                    className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3.5 text-base text-[#121212] focus:border-black focus:outline-none font-mono tracking-wider shadow-inner"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1.5">
                    Found in Google Pay / PhonePe / Paytm payment details under &quot;UPI transaction ID&quot; or &quot;UTR&quot;.
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                    {errorMessage}
                  </div>
                )}

                <div className="pt-2 space-y-3">
                  <button
                    type="submit"
                    disabled={isSubmitting || !utrNumber.trim()}
                    className="w-full py-4 rounded-xl bg-[#121212] hover:bg-neutral-800 text-white text-xs font-serif font-bold uppercase tracking-[0.2em] shadow-xl disabled:opacity-50 transition active:scale-[0.99] flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Verifying Reference...</span>
                      </>
                    ) : (
                      <span>Confirm &amp; Place Order</span>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-6 text-[11px] text-neutral-500 pt-2">
                    <span className="flex items-center gap-1.5">
                      <span>🔒</span> 100% Encrypted
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span>✓</span> RBI NPCI Compliant
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span>⚡</span> Fast Verification
                    </span>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Order Summary & Delivery Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-[#EAE3D4] bg-white p-6 shadow-sm space-y-5 text-xs sticky top-24">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 pb-3 border-b border-[#EAE3D4]">
                Order Summary ({items.length} items)
              </h2>

              {/* Items List */}
              <div className="divide-y divide-neutral-100 max-h-72 overflow-y-auto pr-1">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 py-3">
                    <div className="relative h-14 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-[#F0EBE1] border border-[#E8E2D6]">
                      {item.image &&
                      (item.image.startsWith("/") ||
                        item.image.startsWith("http")) ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-400 font-mono">
                          IMG
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-neutral-900 truncate">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-neutral-500 font-mono">
                        Qty: {item.qty} • {formatCurrency(item.pricePaise)}
                      </p>
                    </div>
                    <span className="font-mono font-semibold text-neutral-900">
                      {formatCurrency(item.pricePaise * item.qty)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals Breakdown */}
              <div className="space-y-2 pt-3 border-t border-[#EAE3D4] text-neutral-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatCurrency(subtotalPaise)}</span>
                </div>
                {discountPaise > 0 && (
                  <div className="flex justify-between text-emerald-800 font-semibold">
                    <span>Discount</span>
                    <span className="font-mono">-{formatCurrency(discountPaise)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="font-semibold text-neutral-900">
                    {shippingPaise === 0 ? "Complimentary" : formatCurrency(shippingPaise)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated GST (5%)</span>
                  <span className="font-mono">{formatCurrency(taxPaise)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-neutral-900 pt-3 border-t border-neutral-900">
                  <span>Total Payable</span>
                  <span className="font-mono">{formatCurrency(totalPaise)}</span>
                </div>
              </div>

              {/* Shipping Address Preview */}
              <div className="pt-4 border-t border-[#EAE3D4] space-y-1 text-[11px] text-neutral-500">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                  Delivering To
                </span>
                <p className="font-semibold text-neutral-900">{shippingAddress.name}</p>
                <p>{shippingAddress.street}</p>
                {shippingAddress.landmark && <p>Near: {shippingAddress.landmark}</p>}
                <p>
                  {shippingAddress.city}, {shippingAddress.state} - {shippingAddress.postalCode}
                </p>
                <p className="font-mono text-neutral-600">Contact: {shippingAddress.phone}</p>
              </div>

              {/* Help & Support Assistance */}
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
                <span>Need assistance?</span>
                <Link
                  href="/account"
                  className="font-bold text-[#8C7A58] hover:underline"
                >
                  Contact Concierge Support
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

