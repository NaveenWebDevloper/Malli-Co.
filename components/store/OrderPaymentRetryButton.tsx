"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface OrderPaymentRetryButtonProps {
  orderNumber: string;
  razorpayOrderId?: string;
  amountPaise: number;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
}

export function OrderPaymentRetryButton({
  orderNumber,
  razorpayOrderId,
  amountPaise,
  customer,
}: OrderPaymentRetryButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRetry = async () => {
    setLoading(true);
    setError(null);

    try {
      // Ensure Razorpay script is loaded
      if (typeof (window as unknown as { Razorpay?: unknown }).Razorpay === "undefined") {
        await new Promise((resolve) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });
      }

      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_your_key_id";

      const options = {
        key: keyId,
        amount: amountPaise,
        currency: "INR",
        name: "Malli & Co.",
        description: `Order #${orderNumber} Payment`,
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
            setLoading(false);
          },
        },
        handler: async function (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) {
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

          if (!verifyRes.ok) {
            const errData = await verifyRes.json();
            throw new Error(errData.error || "Payment verification failed.");
          }

          router.refresh();
        },
      };

      type RazorpayConstructorType = new (opts: typeof options) => {
        open: () => void;
        on: (
          event: string,
          handler: (resp: { error?: { description?: string } }) => void,
        ) => void;
      };

      const RazorpayConstructor = (
        window as unknown as { Razorpay: RazorpayConstructorType }
      ).Razorpay;

      const rzp = new RazorpayConstructor(options);
      rzp.on("payment.failed", (resp) => {
        setLoading(false);
        setError(resp.error?.description || "Payment failed at bank.");
      });

      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open payment gateway");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs text-center border border-red-200">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={handleRetry}
        disabled={loading}
        className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#121212] text-white hover:bg-neutral-800 text-xs font-semibold uppercase tracking-widest shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? "Opening Secure Gateway..." : "Complete Payment Now"}
      </button>
    </div>
  );
}

