import React from "react";

export function StoreTrustBar() {
  return (
    <section
      aria-label="Store Guarantees & Commitments"
      className="w-full bg-[#EAE8E2] border-t border-[#121212] py-4 sm:py-5"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-neutral-300 gap-3 sm:gap-0">
          {/* 1. Free Shipping Guarantee */}
          <div className="flex items-center justify-center gap-3 sm:gap-3.5 py-1.5 sm:py-0 sm:px-4">
            <svg
              viewBox="0 0 28 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-7 h-5 sm:w-8 sm:h-5.5 text-neutral-900 flex-shrink-0"
              aria-hidden="true"
            >
              {/* Cargo Trailer */}
              <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h14A1.5 1.5 0 0 1 18 2.5v11.5H2.5A1.5 1.5 0 0 1 1 12.5V2.5z" />
              {/* Cab */}
              <path d="M18 5.5h4.2a1.5 1.5 0 0 1 1.2.6l2.8 3.8A1.5 1.5 0 0 1 27 10.8V14h-9V5.5z" />
              {/* Wheels */}
              <circle cx="6" cy="15.5" r="2.5" />
              <circle cx="22" cy="15.5" r="2.5" />
              {/* Chassis link */}
              <path d="M8.5 14h11" />
            </svg>
            <div className="flex flex-col text-left">
              <span className="text-[11px] sm:text-[12px] font-bold uppercase tracking-wider text-neutral-900 leading-tight">
                Free Shipping For
              </span>
              <span className="text-[11px] sm:text-[12px] font-bold uppercase tracking-wider text-neutral-900 leading-tight">
                Orders Above ₹599
              </span>
            </div>
          </div>

          {/* 2. On-Time Delivery Promise */}
          <div className="flex items-center justify-center gap-3 sm:gap-3.5 py-1.5 sm:py-0 sm:px-4">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-6 h-6 sm:w-6.5 sm:h-6.5 text-neutral-900 flex-shrink-0"
              aria-hidden="true"
            >
              {/* Hand with open palm & fingers */}
              <path d="M18 11V6a1.5 1.5 0 0 0-3 0v4" />
              <path d="M15 10V4a1.5 1.5 0 0 0-3 0v6" />
              <path d="M12 10.5V5a1.5 1.5 0 0 0-3 0V13" />
              <path d="M9 11V7.5a1.5 1.5 0 0 0-3 0v6.5a6 6 0 0 0 6 6h1.5a6 6 0 0 0 6-6v-3a1.5 1.5 0 0 0-3 0" />
            </svg>
            <div className="flex flex-col text-left">
              <span className="text-[11px] sm:text-[12px] font-bold uppercase tracking-wider text-neutral-900 leading-tight">
                Promise, On Time
              </span>
              <span className="text-[11px] sm:text-[12px] font-bold uppercase tracking-wider text-neutral-900 leading-tight">
                Delivery
              </span>
            </div>
          </div>

          {/* 3. 100% Secure Payment */}
          <div className="flex items-center justify-center gap-3 sm:gap-3.5 py-1.5 sm:py-0 sm:px-4">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-6 h-6 sm:w-6.5 sm:h-6.5 text-neutral-900 flex-shrink-0"
              aria-hidden="true"
            >
              {/* Security Shield */}
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              {/* Checkmark */}
              <path d="m9 12 2 2 4-4" />
            </svg>
            <div className="flex flex-col text-left">
              <span className="text-[11px] sm:text-[12px] font-bold uppercase tracking-wider text-neutral-900 leading-tight">
                100% Secure
              </span>
              <span className="text-[11px] sm:text-[12px] font-bold uppercase tracking-wider text-neutral-900 leading-tight">
                Payment
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default StoreTrustBar;

