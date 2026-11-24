import crypto from "crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { getStorePaymentSettings } from "@/lib/settings";
import { PaymentPageView } from "@/components/store/PaymentPageView";

export const metadata: Metadata = {
  title: "Complete UPI Payment | Malli & Co. Luxury Apparel",
  description: "Scan QR code or pay via any UPI app to complete your artisanal garment order.",
  robots: { index: false, follow: false },
};

export default async function CheckoutPaymentPage({
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
          You are not authorized to view this payment page. Please sign in with the account used to place the order.
        </p>
        <Link
          href={`/login?callbackUrl=/checkout/payment/${encodeURIComponent(orderNumber)}`}
          className="inline-block px-6 py-2.5 rounded-full bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider"
        >
          Sign In
        </Link>
      </div>
    );
  }

  // If order is already paid, redirect straight to confirmation page
  if (order.paymentStatus === "PAID") {
    redirect(`/order/confirmed/${encodeURIComponent(orderNumber)}`);
  }

  const paymentSettings = await getStorePaymentSettings();
  const amountRupees = (order.totals.totalPaise / 100).toFixed(2);
  const upiUri = `upi://pay?pa=${paymentSettings.storeUpiId}&pn=${encodeURIComponent(
    paymentSettings.storeUpiName,
  )}&am=${amountRupees}&cu=INR&tn=${encodeURIComponent(`Order ${order.orderNumber}`)}`;

  const orderItems = order.items.map((i) => ({
    name: i.nameSnapshot,
    sku: i.skuSnapshot,
    qty: i.qty,
    pricePaise: i.finalPricePaise ?? i.priceSnapshotPaise,
    image: i.imageSnapshot,
    options: i.optionsSnapshot ? Object.fromEntries(i.optionsSnapshot as unknown as Map<string, string>) : undefined,
  }));

  return (
    <PaymentPageView
      orderNumber={order.orderNumber}
      totalPaise={order.totals.totalPaise}
      subtotalPaise={order.totals.subtotalPaise}
      shippingPaise={order.totals.shippingPaise}
      taxPaise={order.totals.taxPaise}
      discountPaise={order.totals.discountPaise || 0}
      expiresAt={order.expiresAt?.toISOString()}
      items={orderItems}
      shippingAddress={{
        name: order.shippingAddress.name,
        phone: order.shippingAddress.phone,
        street: order.shippingAddress.street,
        landmark: order.shippingAddress.landmark,
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        postalCode: order.shippingAddress.postalCode,
      }}
      upiDetails={{
        upiId: paymentSettings.storeUpiId,
        payeeName: paymentSettings.storeUpiName,
        qrImage: paymentSettings.storeUpiQrImage,
        instructions: paymentSettings.storeUpiInstructions,
        upiUri,
      }}
    />
  );
}
