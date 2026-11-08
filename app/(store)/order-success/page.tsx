import { redirect } from "next/navigation";
import Link from "next/link";

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string }>;
}) {
  const { orderNumber } = await searchParams;

  if (orderNumber) {
    redirect(`/order/confirmed/${encodeURIComponent(orderNumber)}`);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
      <h1 className="text-2xl font-serif font-bold text-[#121212]">
        Order Confirmation
      </h1>
      <p className="text-xs text-neutral-600">
        Please visit your account orders to review your garment status.
      </p>
      <div className="pt-4 flex justify-center gap-3">
        <Link
          href="/men"
          className="px-8 py-3 rounded-full bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest"
        >
          Continue Shopping
        </Link>
        <Link
          href="/account"
          className="px-8 py-3 rounded-full border border-[#DDD4C1] bg-white text-neutral-800 text-xs font-semibold uppercase tracking-widest"
        >
          My Account
        </Link>
      </div>
    </div>
  );
}
