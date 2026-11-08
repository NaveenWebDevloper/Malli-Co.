import Link from "next/link";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Store & System Settings
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Visual storefront lookbook configurations, payment gateways, and shipping parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hero Carousel Settings Card */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-xl text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
              🎠
            </div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Storefront 3D Hero Lookbook
            </h2>
            <p className="text-xs text-neutral-500 leading-relaxed dark:text-neutral-400">
              Customize the images, titles, fabrics, and arrangement of garments rendered in the high-performance WebGL 3D FlexCarousel on the storefront homepage.
            </p>
          </div>

          <div className="pt-6">
            <Link
              href="/admin/hero"
              className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black transition dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              <span>Manage Carousel Slides</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* Payment & Shipping Card */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-xl text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              💳
            </div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Payments & Logistics
            </h2>
            <p className="text-xs text-neutral-500 leading-relaxed dark:text-neutral-400">
              Razorpay API keys, INR integer paise processing rules, and standard vs. free shipping thresholds (₹2,000 threshold).
            </p>
          </div>

          <div className="pt-6">
            <span className="inline-flex items-center rounded-md bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
              Active (Configured via Environment)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
