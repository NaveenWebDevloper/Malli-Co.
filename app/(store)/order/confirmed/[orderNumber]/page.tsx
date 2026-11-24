import crypto from "crypto";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Customer } from "@/models/Customer";
import { formatCurrency } from "@/lib/currency";
import { OrderPaymentRetryButton } from "@/components/store/OrderPaymentRetryButton";
import { OrderUtrSubmissionCard } from "@/components/store/OrderUtrSubmissionCard";
import { OrderCelebrationBanner } from "@/components/store/OrderCelebrationBanner";

export const metadata: Metadata = {
  title: "Order Placed Successfully | Malli & Co.",
  description: "Your Malli & Co. fashion garments order has been placed. Review confirmation, order status, and dispatch tracking.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function OrderConfirmedPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  await connectDB();
  const session = await auth();

  const order = await Order.findOne({ orderNumber }).lean();
  if (!order) {
    notFound();
  }

  // Security Check: Verify order belongs to the logged-in customer or guest token (Rule 7 & IDOR Guard)
  const isOwner =
    session?.user?.id && order.customerId?.toString() === session.user.id;
  const isAdmin = session?.user?.role === "ADMIN";

  let isGuestAuthorized = false;
  if (!isOwner && !isAdmin && order.guestAccessTokenHash) {
    const cookieStore = await cookies();
    const guestCookie = cookieStore.get(`malli_guest_order_${order.orderNumber}`)?.value;
    if (guestCookie) {
      const computedHash = crypto
        .createHash("sha256")
        .update(guestCookie)
        .digest("hex");
      if (computedHash === order.guestAccessTokenHash) {
        isGuestAuthorized = true;
      }
    }
  }

  if (!isOwner && !isAdmin && !isGuestAuthorized) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 rounded-2xl bg-white border border-[#EAE3D4] text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 text-xl flex items-center justify-center mx-auto">
          ✕
        </div>
        <h1 className="text-xl font-sans font-bold text-[#121212]">
          Access Restricted
        </h1>
        <p className="text-xs text-neutral-500 leading-relaxed">
          You are not authorized to view this order. Please log in with the account used to place the order.
        </p>
        <Link
          href={`/login?callbackUrl=/order/confirmed/${encodeURIComponent(orderNumber)}`}
          className="inline-block px-6 py-2.5 rounded-full bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const isPaid = order.paymentStatus === "PAID";
  const isManualUpi = order.paymentMethod === "MANUAL_UPI" || Boolean(order.paymentDetails?.upiTransactionId);
  const hasUtr = Boolean(order.paymentDetails?.upiTransactionId);

  // Fetch customer profile for primary email
  const customer = order.customerId ? await Customer.findById(order.customerId).lean() : null;
  const customerEmail = customer?.email || session?.user?.email || "";

  // Format date according to reference design: "18 Nov 2026, 10:24 AM"
  const formattedDate = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(order.createdAt));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 space-y-8 font-sans">
      
      {/* 1. Primary Hero: Celebratory Order Placed Banner (Matching Desktop & Mobile references) */}
      <OrderCelebrationBanner
        orderNumber={order.orderNumber}
        formattedDate={formattedDate}
        customerEmail={customerEmail}
        isOwner={Boolean(isOwner)}
      />

      {/* 2. Manual UPI / Payment Verification State */}
      <div className="space-y-4">
        {isPaid ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold flex-shrink-0 text-sm">
              ✓
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-emerald-950">
                Payment Verified &amp; Order Confirmed
              </p>
              <p className="text-[11px] sm:text-xs text-emerald-800 mt-0.5">
                Your payment has been reconciled. Garments are currently queued for final quality inspection and fulfillment.
              </p>
            </div>
          </div>
        ) : hasUtr ? (
          <div className="p-5 sm:p-6 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-950 space-y-3">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold flex-shrink-0 text-sm">
                ⏳
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs sm:text-sm font-bold text-amber-950 uppercase tracking-wide">
                    Payment Verification In Progress
                  </p>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-white border border-amber-300 font-bold text-amber-900">
                    UTR: {order.paymentDetails?.upiTransactionId}
                  </span>
                </div>
                <p className="text-xs text-amber-900/90 leading-relaxed mt-1">
                  We have received your 12-digit transaction reference. Our accounts desk confirms bank credits rapidly. Once verified, your status will update automatically.
                </p>
              </div>
            </div>

            {/* Optional UTR edit form if needed */}
            <div className="pt-2 border-t border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-800">
              <span>Mistyped your transaction reference?</span>
              <Link
                href={`/checkout/payment/${encodeURIComponent(order.orderNumber)}`}
                className="font-bold underline text-amber-950 hover:text-black transition-colors"
              >
                Reopen Payment Page →
              </Link>
            </div>
          </div>
        ) : isManualUpi ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-amber-950">
                    Action Required: Submit Your UPI Transaction Reference
                  </p>
                  <p className="text-[11px] text-amber-800">
                    Your apparel is held for 15 minutes. Complete payment and enter the 12-digit UTR below.
                  </p>
                </div>
              </div>
              <Link
                href={`/checkout/payment/${encodeURIComponent(order.orderNumber)}`}
                className="inline-block px-4 py-2 rounded-xl bg-[#10264B] text-white text-xs font-bold text-center hover:bg-[#0B1B36] transition flex-shrink-0"
              >
                View QR Scanner →
              </Link>
            </div>

            <OrderUtrSubmissionCard
              orderNumber={order.orderNumber}
              totalPaise={order.totals.totalPaise}
              initialUtr={order.paymentDetails?.upiTransactionId}
              isPaid={isPaid}
            />
          </div>
        ) : (
          <div className="max-w-md mx-auto p-6 rounded-2xl bg-[#FBF9F5] border border-[#EAE3D4] space-y-4 text-center">
            <p className="text-xs text-neutral-600">
              Total Payable: <strong className="text-base text-black">{formatCurrency(order.totals.totalPaise)}</strong>
            </p>
            <OrderPaymentRetryButton
              orderNumber={order.orderNumber}
              razorpayOrderId={order.paymentDetails?.razorpayOrderId}
              amountPaise={order.totals.totalPaise}
              customer={{
                name: order.shippingAddress.name,
                email: customerEmail || order.shippingAddress.phone || "",
                phone: order.shippingAddress.phone,
              }}
            />
          </div>
        )}
      </div>

      {/* 3. Order Tracking Progress Stepper */}
      <div id="order-breakdown" className="p-6 rounded-3xl bg-white border border-neutral-200/90 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10264B]"></span>
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#10264B]">
              Order Tracking &amp; Status
            </h2>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-neutral-100 text-neutral-700">
            {order.status}
          </span>
        </div>

        {/* Horizontal Timeline Steps */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {/* Step 1 */}
          <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-1">
            <div className="w-7 h-7 mx-auto rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
              ✓
            </div>
            <p className="text-xs font-bold text-neutral-900">Order Placed</p>
            <p className="text-[10px] text-neutral-500">Confirmed</p>
          </div>

          {/* Step 2 */}
          <div className={`p-3 rounded-2xl border space-y-1 ${
            isPaid
              ? "bg-emerald-50/70 border-emerald-100"
              : hasUtr
              ? "bg-amber-50/70 border-amber-200"
              : "bg-neutral-50 border-neutral-200/60"
          }`}>
            <div className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-bold ${
              isPaid
                ? "bg-emerald-600 text-white"
                : hasUtr
                ? "bg-amber-500 text-white"
                : "bg-neutral-200 text-neutral-600"
            }`}>
              {isPaid ? "✓" : hasUtr ? "⏳" : "2"}
            </div>
            <p className="text-xs font-bold text-neutral-900">Payment</p>
            <p className="text-[10px] text-neutral-500">
              {isPaid ? "Paid" : hasUtr ? "Verifying" : "Pending"}
            </p>
          </div>

          {/* Step 3 */}
          <div className={`p-3 rounded-2xl border space-y-1 ${
            ["PACKED", "SHIPPED", "DELIVERED"].includes(order.status)
              ? "bg-emerald-50/70 border-emerald-100"
              : "bg-neutral-50 border-neutral-200/60"
          }`}>
            <div className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-bold ${
              ["PACKED", "SHIPPED", "DELIVERED"].includes(order.status)
                ? "bg-emerald-600 text-white"
                : "bg-neutral-200 text-neutral-600"
            }`}>
              {["PACKED", "SHIPPED", "DELIVERED"].includes(order.status) ? "✓" : "3"}
            </div>
            <p className="text-xs font-bold text-neutral-900">Quality &amp; Packing</p>
            <p className="text-[10px] text-neutral-500">
              {["PACKED", "SHIPPED", "DELIVERED"].includes(order.status) ? "Completed" : "Next Step"}
            </p>
          </div>

          {/* Step 4 */}
          <div className={`p-3 rounded-2xl border space-y-1 ${
            order.status === "DELIVERED"
              ? "bg-emerald-50/70 border-emerald-100"
              : order.status === "SHIPPED"
              ? "bg-blue-50 border-blue-200"
              : "bg-neutral-50 border-neutral-200/60"
          }`}>
            <div className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-bold ${
              order.status === "DELIVERED"
                ? "bg-emerald-600 text-white"
                : order.status === "SHIPPED"
                ? "bg-blue-600 text-white"
                : "bg-neutral-200 text-neutral-600"
            }`}>
              {order.status === "DELIVERED" ? "✓" : "4"}
            </div>
            <p className="text-xs font-bold text-neutral-900">Delivery</p>
            <p className="text-[10px] text-neutral-500">
              {order.status === "DELIVERED" ? "Delivered" : "Standard 3-5 Days"}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Order Breakdown & Purchased Items */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200/90 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#10264B]">
            Purchased Garments ({order.items.reduce((acc, i) => acc + i.qty, 0)})
          </h2>
          <span className="font-mono text-xs text-neutral-500">
            Ref: #{order.orderNumber}
          </span>
        </div>

        {/* Items List */}
        <div className="divide-y divide-neutral-100">
          {order.items.map((item, idx) => {
            const finalPaise = item.finalPricePaise ?? item.priceSnapshotPaise;
            const basePaise = item.basePricePaise || item.priceSnapshotPaise;
            const hasDiscount = (item.discountAmountPaise || 0) > 0;

            // Safe options parsing (optionsSnapshot can be a Map or plain object)
            let optionsObj: Record<string, string> = {};
            if (item.optionsSnapshot) {
              if (item.optionsSnapshot instanceof Map) {
                optionsObj = Object.fromEntries(item.optionsSnapshot);
              } else if (typeof item.optionsSnapshot === "object") {
                optionsObj = item.optionsSnapshot as Record<string, string>;
              }
            }

            return (
              <div key={idx} className="py-4 flex items-center gap-4">
                {/* Thumbnail */}
                <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200/80 flex-shrink-0">
                  {item.imageSnapshot ? (
                    <Image
                      src={item.imageSnapshot}
                      alt={item.nameSnapshot}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">
                      Malli
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-neutral-900 text-xs sm:text-sm truncate">
                    {item.nameSnapshot}
                  </p>
                  <p className="font-mono text-[11px] text-neutral-500 mt-0.5">
                    SKU: {item.skuSnapshot}
                  </p>

                  {/* Options: Size, Color */}
                  {Object.entries(optionsObj).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {Object.entries(optionsObj).map(([k, v]) => (
                        <span
                          key={k}
                          className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 font-semibold text-[10px]"
                        >
                          {k}: {v}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Campaign badge */}
                  {item.campaignName && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                      {item.campaignName}
                    </span>
                  )}
                </div>

                {/* Qty & Price */}
                <div className="text-right flex-shrink-0">
                  <p className="font-mono text-xs sm:text-sm font-bold text-neutral-900">
                    {formatCurrency(finalPaise * item.qty)}
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    Qty: {item.qty}
                  </p>
                  {hasDiscount && (
                    <p className="font-mono text-[10px] text-neutral-400 line-through">
                      {formatCurrency(basePaise * item.qty)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Financial Breakdown Table */}
        <div className="border-t border-neutral-200/80 pt-4 space-y-2 text-xs sm:text-sm text-neutral-600">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-mono font-medium text-neutral-900">
              {formatCurrency(order.totals.subtotalPaise)}
            </span>
          </div>

          {order.totals.discountPaise > 0 && (
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Promotional Savings</span>
              <span className="font-mono">
                -{formatCurrency(order.totals.discountPaise)}
              </span>
            </div>
          )}

          <div className="flex justify-between">
            <span>Shipping</span>
            <span className="font-mono font-medium text-neutral-900">
              {order.totals.shippingPaise === 0 ? (
                <span className="text-emerald-700 font-bold">FREE</span>
              ) : (
                formatCurrency(order.totals.shippingPaise)
              )}
            </span>
          </div>

          <div className="flex justify-between">
            <span>GST (5% Included)</span>
            <span className="font-mono font-medium text-neutral-900">
              {formatCurrency(order.totals.taxPaise)}
            </span>
          </div>

          <div className="flex justify-between font-extrabold text-[#10264B] text-base pt-3 border-t border-neutral-200">
            <span>Total Payable</span>
            <span className="font-mono text-lg text-[#10264B]">
              {formatCurrency(order.totals.totalPaise)}
            </span>
          </div>
        </div>

        {/* Shipping Destination */}
        <div className="border-t border-neutral-200/80 pt-4 space-y-1.5 text-xs text-neutral-600">
          <p className="font-bold uppercase tracking-wider text-[11px] text-[#10264B]">
            Delivery Destination
          </p>
          <p className="text-neutral-900 font-bold text-sm">
            {order.shippingAddress.name}
          </p>
          <p>{order.shippingAddress.street}</p>
          {order.shippingAddress.landmark && <p>{order.shippingAddress.landmark}</p>}
          <p>
            {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}
          </p>
          <p className="font-mono text-[11px] text-neutral-700 pt-0.5">
            Contact: <strong>{order.shippingAddress.phone}</strong>
          </p>
        </div>
      </div>

      {/* 5. Help & Support */}
      <div className="p-6 rounded-3xl bg-neutral-50 border border-neutral-200/70 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-600">
        <div>
          <p className="font-bold text-neutral-900 text-sm">Need help with your order?</p>
          <p className="text-neutral-500 mt-0.5">
            Reach out via WhatsApp or call our support desk at <strong>+91 91219 92349</strong>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://wa.me/919121992349"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm"
          >
            Chat on WhatsApp
          </a>
          <Link
            href="/men"
            className="px-4 py-2 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 font-bold text-xs transition"
          >
            Storefront
          </Link>
        </div>
      </div>

    </div>
  );
}
