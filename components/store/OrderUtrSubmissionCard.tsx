"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/currency";

interface OrderUtrSubmissionCardProps {
  orderNumber: string;
  totalPaise: number;
  initialUtr?: string;
  isPaid: boolean;
}

export function OrderUtrSubmissionCard({
  orderNumber,
  totalPaise,
  initialUtr,
  isPaid,
}: OrderUtrSubmissionCardProps) {
  const router = useRouter();
  const [utrNumber, setUtrNumber] = useState(initialUtr || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (isPaid) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = utrNumber.trim();
    if (!clean || clean.length < 6) {
      setFeedback({
        type: "error",
        text: "Please enter a valid 12-digit UTR or transaction ID.",
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

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
        throw new Error(data.error || "Failed to submit reference");
      }

      setFeedback({
        type: "success",
        text: "UTR reference recorded successfully! Our team is verifying the transaction.",
      });
      router.refresh();
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Error submitting reference",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 rounded-2xl bg-white border border-neutral-200 shadow-sm text-left space-y-4 font-sans">
      <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#10264B]">
          UPI Payment Verification
        </span>
        <span className="text-xs font-mono font-bold text-neutral-900">
          {formatCurrency(totalPaise)}
        </span>
      </div>

      {initialUtr ? (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <span>⏳</span> Verification in Progress
          </p>
          <p className="text-[11px] font-mono text-neutral-700">
            Submitted UTR: <strong className="text-black">{initialUtr}</strong>
          </p>
          <p className="text-[10px] text-neutral-500 pt-1">
            Our accounts desk will confirm your order as soon as the credit reflects in our store account.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-xs text-neutral-600">
            If you have completed your UPI transfer, enter your 12-digit UTR or Transaction ID below:
          </p>
          <div>
            <input
              type="text"
              required
              placeholder="e.g. 432109876543"
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-black font-mono focus:border-[#10264B] focus:ring-1 focus:ring-[#10264B] focus:outline-none"
            />
          </div>

          {feedback && (
            <div
              className={`p-2.5 rounded-lg text-xs font-medium ${
                feedback.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {feedback.text}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !utrNumber.trim()}
            className="w-full py-2.5 rounded-xl bg-[#10264B] hover:bg-[#0B1B36] text-white text-xs font-bold uppercase tracking-wider transition disabled:opacity-50 shadow-sm"
          >
            {isSubmitting ? "Recording..." : "Submit UTR Reference"}
          </button>
        </form>
      )}
    </div>
  );
}

