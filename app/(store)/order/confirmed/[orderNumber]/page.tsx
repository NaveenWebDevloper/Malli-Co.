import crypto from "crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { formatCurrency } from "@/lib/currency";
import { OrderPaymentRetryButton } from "@/components/store/OrderPaymentRetryButton";

export const metadata: Metadata = {
  title: "Order Status | Malli & Co. Luxury Apparel",
  description: "Check your luxury artisanal garment order details and confirmation status.",
  robots: { index: false, follow: false },
};

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
        <h1 className="text-xl font-serif font-bold text-[#121212]">
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

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 text-center space-y-8">
      {/* Status Header Badge */}
      <div className="space-y-3">
        {isPaid ? (
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 text-2xl flex items-center justify-center mx-auto">
            ✓
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-800 text-2xl flex items-center justify-center mx-auto">
            ⏳
          </div>
        )}

        <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#8C7A58]">
          {isPaid ? "Order Confirmed & Paid" : "Payment Pending"}
        </span>

        <h1 className="text-3xl sm:text-4xl font-serif font-black uppercase tracking-tight text-[#121212]">
          {isPaid ? "Thank You For Your Order" : "Complete Your Order Payment"}
        </h1>

        <p className="text-sm font-mono text-neutral-600">
          Order Reference: <strong className="text-black">#{order.orderNumber}</strong>
        </p>
      </div>

      {/* Description message */}
      <p className="max-w-lg mx-auto text-xs sm:text-sm text-neutral-600 leading-relaxed font-light">
        {isPaid
          ? "Your payment has been verified. A formal tax invoice and receipt have been dispatched to your email address."
          : "Your artisanal garments are temporarily held for 15 minutes. Please complete payment to confirm your order."}
      </p>

      {/* Retry Action if pending */}
      {!isPaid && (
        <div className="max-w-md mx-auto p-6 rounded-2xl bg-[#FBF9F5] border border-[#EAE3D4] space-y-4">
          <p className="text-xs text-neutral-600">
            Total Payable: <strong className="text-base text-black">{formatCurrency(order.totals.totalPaise)}</strong>
          </p>
          <OrderPaymentRetryButton
            orderNumber={order.orderNumber}
            razorpayOrderId={order.paymentDetails?.razorpayOrderId}
            amountPaise={order.totals.totalPaise}
            customer={{
              name: order.shippingAddress.name,
              email: order.shippingAddress.phone || "",
              phone: order.shippingAddress.phone,
            }}
          />
        </div>
      )}

      {/* Order Summary Receipt Box */}
      <div className="p-6 sm:p-8 rounded-2xl border border-[#EAE3D4] bg-white text-left text-xs space-y-6 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 border-b border-[#EAE3D4] pb-3">
          Order Breakdown
        </h2>

        {/* Item List */}
        <div className="divide-y divide-neutral-100">
          {order.items.map((item, idx) => {
            const finalPaise = item.finalPricePaise ?? item.priceSnapshotPaise;
            const basePaise = item.basePricePaise || item.priceSnapshotPaise;
            const hasDiscount = (item.discountAmountPaise || 0) > 0;

            return (
              <div key={idx} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-neutral-900 text-xs">{item.nameSnapshot}</p>
                  <p className="font-mono text-[10px] text-neutral-500">
                    SKU: {item.skuSnapshot} • Qty: {item.qty}
                  </p>
                  {item.campaignName && (
                    <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                      {item.campaignName}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs font-semibold text-neutral-900">
                    {formatCurrency(finalPaise * item.qty)}
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

        {/* Totals Table */}
        <div className="border-t border-[#EAE3D4] pt-4 space-y-1.5 text-neutral-600">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-mono">{formatCurrency(order.totals.subtotalPaise)}</span>
          </div>
          {order.totals.discountPaise > 0 && (
            <div className="flex justify-between text-emerald-800 font-semibold">
              <span>Promotional Savings</span>
              <span className="font-mono">-{formatCurrency(order.totals.discountPaise)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Shipping</span>
            <span className="font-mono">
              {order.totals.shippingPaise === 0 ? "FREE" : formatCurrency(order.totals.shippingPaise)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>GST (5% Included)</span>
            <span className="font-mono">{formatCurrency(order.totals.taxPaise)}</span>
          </div>
          <div className="flex justify-between font-bold text-neutral-900 text-sm pt-2 border-t border-neutral-100">
            <span>Total Payable</span>
            <span className="font-mono text-black">{formatCurrency(order.totals.totalPaise)}</span>
          </div>
        </div>

        {/* Shipping Destination */}
        <div className="border-t border-[#EAE3D4] pt-4 text-neutral-600 space-y-1">
          <p className="font-bold uppercase tracking-wider text-[10px] text-neutral-400">
            Delivery Destination
          </p>
          <p className="text-neutral-900 font-medium">{order.shippingAddress.name}</p>
          <p>{order.shippingAddress.street}</p>
          {order.shippingAddress.landmark && <p>{order.shippingAddress.landmark}</p>}
          <p>
            {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}
          </p>
          <p className="font-mono text-[11px] text-neutral-500">Contact: {order.shippingAddress.phone}</p>
        </div>
      </div>

      {/* Navigation Buttons (Strictly Customer Facing — NEVER TO /admin) */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/men"
          className="w-full sm:w-auto px-8 py-3 rounded-full bg-[#121212] hover:bg-neutral-800 text-white text-xs font-semibold uppercase tracking-widest transition-colors duration-200"
        >
          Continue Shopping
        </Link>
        <Link
          href={`/account/orders/${encodeURIComponent(order.orderNumber)}`}
          className="w-full sm:w-auto px-8 py-3 rounded-full border border-[#DDD4C1] bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-semibold uppercase tracking-widest transition-colors duration-200"
        >
          View My Order
        </Link>
      </div>
    </div>
  );
}

