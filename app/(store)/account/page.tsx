import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Customer } from "@/models/Customer";
import { formatCurrency } from "@/lib/currency";

export const metadata: Metadata = {
  title: "My Account & Orders | Malli & Co. Luxury Apparel",
  description: "View your personal profile, previous orders, shipment tracking, and saved delivery addresses.",
  robots: { index: false, follow: false },
};

export default async function CustomerAccountPage() {
  await connectDB();
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account");
  }

  const customer = await Customer.findById(session.user.id).lean();
  const orders = await Order.find({ customerId: session.user.id })
    .sort({ createdAt: -1 })
    .lean();

  const totalSpentPaise = orders
    .filter((o) => o.paymentStatus === "PAID")
    .reduce((sum, o) => sum + (o.totals?.totalPaise || 0), 0);

  const activeOrdersCount = orders.filter(
    (o) =>
      o.status !== "DELIVERED" &&
      o.status !== "CANCELLED" &&
      o.status !== "RETURNED",
  ).length;

  const memberSince = customer?.createdAt
    ? new Date(customer.createdAt).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
      })
    : "Recent Client";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Top Banner / Breadcrumb & Admin Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#EAE3D4]">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8C7A58]">
            Client Portal
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-black uppercase tracking-tight text-[#121212] mt-1">
            My Account
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Manage your bespoke wardrobe orders, personal details, and delivery addresses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {session.user.role === "ADMIN" && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider hover:bg-neutral-800 transition-colors shadow-sm"
            >
              <span>⚡ Admin Dashboard</span>
            </Link>
          )}

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="px-4 py-2 rounded-full border border-neutral-300 text-xs font-medium uppercase tracking-wider text-neutral-700 hover:text-black hover:border-black transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>

      {/* Account Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl border border-[#EAE3D4] bg-white shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8C7A58]">
            Total Orders
          </span>
          <div className="text-2xl font-serif font-bold text-[#121212]">
            {orders.length}
          </div>
          <p className="text-[11px] text-neutral-500">
            {orders.length === 1 ? "1 artisanal order placed" : `${orders.length} orders placed`}
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-[#EAE3D4] bg-white shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8C7A58]">
            Total Investment
          </span>
          <div className="text-2xl font-serif font-bold text-[#121212]">
            {formatCurrency(totalSpentPaise)}
          </div>
          <p className="text-[11px] text-neutral-500">Settled purchases</p>
        </div>

        <div className="p-6 rounded-2xl border border-[#EAE3D4] bg-white shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8C7A58]">
            Active Orders
          </span>
          <div className="text-2xl font-serif font-bold text-[#121212]">
            {activeOrdersCount}
          </div>
          <p className="text-[11px] text-neutral-500">In fulfillment &amp; transit</p>
        </div>
      </div>

      {/* Two Column Section: Customer Details & Saved Addresses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Customer Details Card */}
        <div className="p-6 sm:p-8 rounded-2xl border border-[#EAE3D4] bg-white shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#EAE3D4]">
            <h2 className="text-sm font-serif font-bold uppercase tracking-wider text-[#121212]">
              Customer Details
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FBF9F5] text-[#8C7A58] border border-[#EAE3D4]">
              {customer?.role || session.user.role}
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <span className="text-neutral-400 font-medium uppercase tracking-wider block text-[10px]">
                Full Name
              </span>
              <span className="font-semibold text-neutral-900 text-sm mt-0.5 block">
                {customer?.name || session.user.name || "Malli & Co. Client"}
              </span>
            </div>

            <div>
              <span className="text-neutral-400 font-medium uppercase tracking-wider block text-[10px]">
                Email Address
              </span>
              <span className="font-mono text-neutral-800 text-xs mt-0.5 block">
                {customer?.email || session.user.email}
              </span>
            </div>

            <div>
              <span className="text-neutral-400 font-medium uppercase tracking-wider block text-[10px]">
                Phone Number
              </span>
              <span className="text-neutral-800 text-xs mt-0.5 block">
                {customer?.phone || "Not specified (collected at checkout)"}
              </span>
            </div>

            <div>
              <span className="text-neutral-400 font-medium uppercase tracking-wider block text-[10px]">
                Member Since
              </span>
              <span className="text-neutral-800 text-xs mt-0.5 block">
                {memberSince}
              </span>
            </div>
          </div>
        </div>

        {/* Saved Shipping Addresses */}
        <div className="p-6 sm:p-8 rounded-2xl border border-[#EAE3D4] bg-white shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#EAE3D4]">
            <h2 className="text-sm font-serif font-bold uppercase tracking-wider text-[#121212]">
              Saved Delivery Addresses
            </h2>
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider">
              {customer?.addresses?.length || 0} Saved
            </span>
          </div>

          {!customer?.addresses || customer.addresses.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500 space-y-2">
              <p>No saved addresses in your address book yet.</p>
              <p className="text-[11px] text-neutral-400">
                Delivery addresses provided during checkout will automatically be saved to your profile.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {customer.addresses.map((addr, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-[#EAE3D4] bg-[#FBF9F5] text-xs space-y-1 relative"
                >
                  {addr.isDefault && (
                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#121212] text-white">
                      Default
                    </span>
                  )}
                  <p className="font-bold text-neutral-900">{addr.name}</p>
                  <p className="text-neutral-600">{addr.street}</p>
                  {addr.landmark && (
                    <p className="text-neutral-500">Landmark: {addr.landmark}</p>
                  )}
                  <p className="text-neutral-600">
                    {addr.city}, {addr.state} — {addr.postalCode}
                  </p>
                  <p className="text-neutral-500 font-mono text-[11px]">
                    Phone: {addr.phone}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Complete Order History Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-serif font-bold uppercase tracking-wider text-[#121212]">
            Order History ({orders.length})
          </h2>
          <Link
            href="/men"
            className="text-xs font-serif font-bold uppercase tracking-wider text-[#8C7A58] hover:text-[#121212] transition-colors"
          >
            Explore New Arrivals →
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="p-12 rounded-2xl border border-[#EAE3D4] bg-white text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#FBF9F5] border border-[#EAE3D4] flex items-center justify-center mx-auto text-[#8C7A58]">
              🛍️
            </div>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              You haven&apos;t placed any orders yet. Discover our linen shirts, trousers, and premium essentials.
            </p>
            <Link
              href="/men"
              className="inline-block px-6 py-2.5 rounded-full bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider hover:bg-neutral-800 transition-colors shadow-sm"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-neutral-200 rounded-2xl border border-[#EAE3D4] bg-white overflow-hidden shadow-sm">
            {orders.map((o) => (
              <div
                key={o._id.toString()}
                className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 hover:bg-[#FBF9F5]/40 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="font-mono text-sm font-bold text-[#121212]">
                      #{o.orderNumber}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        o.paymentStatus === "PAID"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : o.paymentStatus === "FAILED"
                          ? "bg-red-100 text-red-800 border border-red-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      Payment: {o.paymentStatus}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        o.status === "DELIVERED"
                          ? "bg-neutral-900 text-white"
                          : o.status === "CANCELLED"
                          ? "bg-neutral-200 text-neutral-700"
                          : "bg-blue-100 text-blue-800 border border-blue-200"
                      }`}
                    >
                      Fulfillment: {o.status}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-500">
                    Placed on{" "}
                    {new Date(o.createdAt).toLocaleDateString("en-IN", {
                      dateStyle: "medium",
                    })}{" "}
                    • Delivered to {o.shippingAddress?.city}, {o.shippingAddress?.state}
                  </p>

                  {/* Line Items Preview */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {o.items?.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center text-[11px] bg-[#FBF9F5] border border-[#EAE3D4] px-2.5 py-1 rounded-md text-neutral-700"
                      >
                        {item.nameSnapshot} × {item.qty}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex sm:flex-col md:items-end justify-between sm:justify-start gap-2 pt-4 md:pt-0 border-t md:border-t-0 border-[#EAE3D4]">
                  <span className="font-serif text-lg font-bold text-[#121212]">
                    {formatCurrency(o.totals?.totalPaise || 0)}
                  </span>
                  <Link
                    href={`/account/orders/${encodeURIComponent(o.orderNumber)}`}
                    className="px-5 py-2 rounded-full bg-[#121212] text-white text-xs font-semibold uppercase tracking-wider hover:bg-neutral-800 transition-colors shadow-sm inline-block text-center"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
