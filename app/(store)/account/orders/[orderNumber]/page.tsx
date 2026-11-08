import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { formatCurrency } from "@/lib/currency";
import { OrderPaymentRetryButton } from "@/components/store/OrderPaymentRetryButton";

export const metadata: Metadata = {
  title: "Order Details | Malli & Co. Account",
  description: "View tracking status, garment items, and tax invoice for your order.",
  robots: { index: false, follow: false },
};

export default async function CustomerOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  await connectDB();
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/account/orders/${encodeURIComponent(orderNumber)}`);
  }

  const order = await Order.findOne({ orderNumber }).lean();
  if (!order) {
    notFound();
  }

  // IDOR Protection: verify tenant ownership
  const isOwner = order.customerId?.toString() === session.user.id;
  const isAdmin = session.user.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 rounded-2xl bg-white border border-[#EAE3D4] text-center space-y-4">
        <h1 className="text-xl font-serif font-bold text-[#121212]">
          Access Denied
        </h1>
        <p className="text-xs text-neutral-500">
          You do not have permission to view this order.
        </p>
        <Link
          href="/account"
          className="inline-block px-6 py-2.5 rounded-full bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider"
        >
          Return to My Account
        </Link>
      </div>
    );
  }

  const isPaid = order.paymentStatus === "PAID";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-neutral-500 space-x-2">
        <Link href="/account" className="hover:text-black">
          My Account
        </Link>
        <span>/</span>
        <span className="text-black font-semibold">Order #{order.orderNumber}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#EAE3D4]">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8C7A58]">
            Order Status: {order.status}
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-black uppercase tracking-tight text-[#121212] mt-1">
            Order #{order.orderNumber}
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "long" })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              isPaid
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            Payment: {order.paymentStatus}
          </span>
        </div>
      </div>

      {/* Payment Pending Alert */}
      {!isPaid && order.status === "PENDING" && (
        <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-amber-900">
              Payment Pending Confirmation
            </h3>
            <p className="text-xs text-amber-700">
              Items are temporarily reserved. Please complete payment to avoid order cancellation.
            </p>
          </div>
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

      {/* Order Items */}
      <div className="rounded-2xl border border-[#EAE3D4] bg-white p-6 sm:p-8 space-y-4 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 border-b border-[#EAE3D4] pb-3">
          Garments Ordered
        </h2>

        <div className="divide-y divide-neutral-100">
          {order.items.map((item, idx) => {
            const finalPaise = item.finalPricePaise ?? item.priceSnapshotPaise;
            const basePaise = item.basePricePaise || item.priceSnapshotPaise;
            const hasDiscount = (item.discountAmountPaise || 0) > 0;

            return (
              <div key={idx} className="py-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-semibold text-neutral-900 text-sm">{item.nameSnapshot}</p>
                  <p className="font-mono text-xs text-neutral-500">
                    SKU: {item.skuSnapshot} • Quantity: {item.qty}
                  </p>
                  {item.campaignName && (
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                      {item.campaignName}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-semibold text-neutral-900">
                    {formatCurrency(finalPaise * item.qty)}
                  </p>
                  {hasDiscount && (
                    <p className="font-mono text-xs text-neutral-400 line-through">
                      {formatCurrency(basePaise * item.qty)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals */}
        <div className="border-t border-[#EAE3D4] pt-4 space-y-2 text-xs text-neutral-600">
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
            <span>Total Paid</span>
            <span className="font-mono text-black">{formatCurrency(order.totals.totalPaise)}</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-2xl border border-[#EAE3D4] bg-white p-6 sm:p-8 space-y-4 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 border-b border-[#EAE3D4] pb-3">
          Order Timeline
        </h2>
        <div className="space-y-3">
          {order.timeline.map((event, idx) => (
            <div key={idx} className="flex items-start gap-3 text-xs">
              <span className="w-2 h-2 rounded-full bg-[#8C7A58] mt-1.5 shrink-0" />
              <div>
                <p className="font-semibold text-neutral-900">{event.status}</p>
                {event.note && <p className="text-neutral-500 text-[11px]">{event.note}</p>}
                <p className="font-mono text-[10px] text-neutral-400 mt-0.5">
                  {new Date(event.timestamp).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

