"use client";

import Image from "next/image";
import Link from "next/link";

interface OrderCelebrationBannerProps {
  orderNumber: string;
  formattedDate: string;
  customerEmail: string;
  isOwner: boolean;
}

export function OrderCelebrationBanner({
  orderNumber,
  formattedDate,
  customerEmail,
  isOwner,
}: OrderCelebrationBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-white border border-neutral-200/90 shadow-sm p-6 sm:p-8 md:p-10 transition-all">
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-10">
        
        {/* Left Column: Luxury Shopping Bags (Desktop & Tablet) */}
        <div className="hidden md:flex flex-col items-center justify-center w-full md:w-5/12 max-w-[340px] flex-shrink-0 select-none">
          <div className="relative w-full aspect-[4/3] flex items-center justify-center">
            <Image
              src="/images/order-placed-bags-clean.png"
              alt="Malli & Co. Luxury Shopping Bags"
              width={450}
              height={300}
              priority
              className="object-contain w-full h-auto drop-shadow-sm pointer-events-none"
            />
          </div>
        </div>

        {/* Right Column (Centered on Mobile): Celebration, Checkmark, Order ID, Details & CTA */}
        <div className="w-full md:w-7/12 flex flex-col items-center md:items-center text-center">
          
          {/* Green Checkmark Badge with Festive Confetti Particles */}
          <div className="relative mb-3 flex items-center justify-center">
            {/* SVG Confetti Particles surrounding the checkmark */}
            <svg
              className="absolute -inset-5 w-[140%] h-[140%] pointer-events-none overflow-visible"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* Confetti ribbons and dots */}
              <circle cx="20" cy="25" r="2.8" fill="#EF4444" />
              <rect x="75" y="18" width="5" height="5" rx="1.5" transform="rotate(25 75 18)" fill="#F59E0B" />
              <circle cx="82" cy="38" r="2.5" fill="#10B981" />
              <rect x="12" y="45" width="6" height="3" rx="1" transform="rotate(-30 12 45)" fill="#F5B817" />
              <circle cx="22" cy="72" r="3" fill="#3B82F6" />
              <rect x="78" y="68" width="5.5" height="3.5" rx="1" transform="rotate(40 78 68)" fill="#EF4444" />
              <circle cx="50" cy="8" r="2.5" fill="#10B981" />
              <polygon points="35,14 37,18 41,18 38,21 39,25 35,22 31,25 32,21 29,18 33,18" fill="#F5B817" />
              <circle cx="68" cy="12" r="2" fill="#EC4899" />
              <rect x="85" y="52" width="4" height="4" rx="1" transform="rotate(15 85 52)" fill="#8B5CF6" />
              <circle cx="15" cy="60" r="2" fill="#10B981" />
            </svg>

            {/* Green Circular Badge */}
            <div className="relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#22C55E] text-white flex items-center justify-center shadow-md">
              <svg
                className="w-7 h-7 sm:w-8 sm:h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#10264B] tracking-tight">
            Order Placed Successfully!
          </h1>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm text-neutral-600 font-medium mt-1">
            Thank you for shopping with Malli&amp;Co.
          </p>

          {/* Soft Green Pill Box for Order ID & Placed Timestamp */}
          <div className="bg-[#EAF7EE] border border-[#CDEFD7] rounded-2xl px-6 sm:px-8 py-2.5 sm:py-3 my-4 inline-block text-center shadow-sm">
            <p className="text-xs sm:text-sm font-bold text-[#10264B]">
              Order ID: #{orderNumber}
            </p>
            <p className="text-[11px] sm:text-xs text-neutral-500 font-medium mt-0.5">
              Placed on: {formattedDate}
            </p>
          </div>

          {/* Dispatched Confirmation Email Note */}
          <div className="text-xs sm:text-sm text-neutral-600 space-y-0.5">
            <p>We&apos;ve sent the order details to</p>
            <p className="font-bold text-[#10264B] break-all">
              {customerEmail || "your registered email"}
            </p>
          </div>

          {/* Action Buttons: Responsive to match both Desktop and Mobile references */}
          <div className="pt-5 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-xs sm:max-w-none">
            <Link
              href={isOwner ? `/account/orders/${encodeURIComponent(orderNumber)}` : "#order-breakdown"}
              className="w-full sm:w-auto px-7 py-3 sm:py-2.5 rounded-xl sm:rounded-lg font-bold text-xs sm:text-sm bg-[#F5B817] text-[#10264B] md:bg-[#10264B] md:text-white md:hover:bg-[#0B1B36] transition-all duration-200 text-center shadow-sm active:scale-[0.99] flex items-center justify-center gap-1.5"
            >
              Track Order
            </Link>
            <Link
              href="/men"
              className="w-full sm:w-auto px-7 py-3 sm:py-2.5 rounded-xl sm:rounded-lg border-2 border-[#10264B] bg-white hover:bg-neutral-50 text-[#10264B] font-bold text-xs sm:text-sm transition-all duration-200 text-center flex items-center justify-center gap-1.5 active:scale-[0.99]"
            >
              Continue Shopping <span className="text-sm font-bold">→</span>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

