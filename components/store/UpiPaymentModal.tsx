"use client";

import { useState } from "react";
import Image from "next/image";
import { formatCurrency } from "@/lib/currency";
import { QrCode } from "@/lib/qrcode";

export interface UpiPaymentDetails {
  upiId: string;
  payeeName: string;
  qrImage?: string;
  instructions?: string;
  upiUri: string;
}

interface UpiPaymentModalProps {
  isOpen: boolean;
  orderNumber: string;
  totalPaise: number;
  upiDetails: UpiPaymentDetails;
  onSuccess: (utrNumber: string) => void;
  onClose: () => void;
}

export function UpiPaymentModal({
  isOpen,
  orderNumber,
  totalPaise,
  upiDetails,
  onSuccess,
  onClose,
}: UpiPaymentModalProps) {
  const [utrNumber, setUtrNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"dynamic" | "standee">(
    upiDetails.qrImage ? "standee" : "dynamic",
  );

  if (!isOpen) return null;

  // Generate dynamic QR SVG
  let dynamicQrSvg = "";
  try {
    const qr = QrCode.encodeText(upiDetails.upiUri, "M");
    dynamicQrSvg = qr.toSvg(180, 2);
  } catch (err) {
    console.error("QR Code generation error:", err);
  }

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2500);
    } catch {
      // Fallback
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2500);
    }
  };

  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = utrNumber.trim();
    if (!clean || clean.length < 6) {
      setErrorMsg("Please enter a valid 12-digit UTR or Transaction ID (minimum 6 characters).");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

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

      onSuccess(clean);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Could not submit payment reference. Please verify your internet connection.",
      );
      setIsSubmitting(false);
    }
  };

  const amountRupees = (totalPaise / 100).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg my-8 rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-[#EAE3D4] text-[#121212]">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#EAE3D4]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8C7A58]">
                UPI Instant Checkout
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-black uppercase tracking-tight text-[#121212] mt-1">
              Pay via UPI / QR Scanner
            </h2>
            <p className="text-xs font-mono text-neutral-500 mt-0.5">
              Order Reference: <strong className="text-black">#{orderNumber}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-black flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Amount to pay banner */}
        <div className="mt-5 p-4 rounded-2xl bg-[#FBF9F5] border border-[#EAE3D4] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 block">
              Total Amount to Pay
            </span>
            <span className="text-2xl font-mono font-black text-[#121212]">
              {formatCurrency(totalPaise)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleCopy(amountRupees, "amount")}
            className="px-3 py-1.5 rounded-lg border border-[#DDD4C1] bg-white text-[11px] font-bold text-neutral-800 hover:bg-neutral-50 transition shadow-sm"
          >
            {copiedField === "amount" ? "✓ Copied" : "Copy Amount"}
          </button>
        </div>

        {/* QR Code and Scanner Section */}
        <div className="mt-5 text-center space-y-3">
          {/* View mode toggle if custom standee exists */}
          {upiDetails.qrImage && (
            <div className="inline-flex rounded-xl bg-neutral-100 p-1 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("standee")}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  viewMode === "standee"
                    ? "bg-white text-black shadow-sm"
                    : "text-neutral-500 hover:text-black"
                }`}
              >
                Store QR Scanner
              </button>
              <button
                type="button"
                onClick={() => setViewMode("dynamic")}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  viewMode === "dynamic"
                    ? "bg-white text-black shadow-sm"
                    : "text-neutral-500 hover:text-black"
                }`}
              >
                Auto-Filled QR
              </button>
            </div>
          )}

          {/* QR Display */}
          <div className="inline-block p-3 rounded-2xl bg-white border border-[#DDD4C1] shadow-sm">
            {viewMode === "standee" && upiDetails.qrImage ? (
              <div className="relative w-48 h-48 mx-auto rounded-xl overflow-hidden bg-neutral-50">
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
                className="w-48 h-48 mx-auto flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: dynamicQrSvg }}
              />
            ) : (
              <div className="w-48 h-48 bg-neutral-100 rounded-xl flex items-center justify-center text-xs text-neutral-400">
                QR Code
              </div>
            )}
          </div>

          {/* Mobile UPI Deep Link Button */}
          <div>
            <a
              href={upiDetails.upiUri}
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-[#8C7A58] hover:bg-[#786746] text-white text-xs font-bold uppercase tracking-wider transition shadow-md sm:hidden"
            >
              <span>📲</span>
              <span>Tap to Pay via Any UPI App</span>
            </a>
          </div>

          {/* Store UPI ID Display with Copy */}
          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs">
            <div className="text-left overflow-hidden mr-2">
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">
                Payee UPI ID ({upiDetails.payeeName})
              </span>
              <span className="font-mono font-bold text-neutral-800 text-xs sm:text-sm truncate block">
                {upiDetails.upiId}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(upiDetails.upiId, "upiId")}
              className="px-3 py-1.5 rounded-lg bg-black text-white text-[11px] font-bold hover:bg-neutral-800 transition whitespace-nowrap shadow-sm"
            >
              {copiedField === "upiId" ? "✓ Copied" : "Copy UPI ID"}
            </button>
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="mt-4 p-3.5 rounded-xl bg-[#FBF9F5] border border-[#EAE3D4] text-[11px] text-neutral-600 leading-relaxed text-left whitespace-pre-line">
          {upiDetails.instructions ||
            "1. Scan the QR code or use the UPI ID in your GPay, PhonePe, Paytm, or BHIM app.\n2. Pay the exact order total.\n3. Enter the 12-digit UTR number or Transaction ID below to verify your order."}
        </div>

        {/* UTR / Transaction ID Submission Form */}
        <form onSubmit={handleSubmitUtr} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1 text-left">
              Enter 12-digit UTR / Transaction ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 432109876543 or bank reference"
              value={utrNumber}
              onChange={(e) => {
                setUtrNumber(e.target.value);
                setErrorMsg(null);
              }}
              className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-3 text-sm text-[#121212] focus:border-black focus:outline-none font-mono tracking-wider"
            />
            <p className="text-[10px] text-neutral-400 mt-1 text-left">
              Found in your UPI app payment receipt / SMS as &quot;UTR&quot;, &quot;UPI Ref ID&quot;, or &quot;Txn ID&quot;.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 text-left">
              {errorMsg}
            </div>
          )}

          <div className="space-y-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !utrNumber.trim()}
              className="w-full py-3.5 rounded-xl bg-[#121212] hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-[0.18em] shadow-lg disabled:opacity-50 transition active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Recording Reference...</span>
                </>
              ) : (
                <span>Confirm &amp; Place Order</span>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 text-xs text-neutral-500 hover:text-black font-semibold transition"
            >
              I will pay later (Keep my items held for 15 minutes)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

