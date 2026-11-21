import React from "react";

export function TrustBanner() {
  return (
    <section
      className="w-full bg-[#EFECE6] border-b border-[#D8D2C5]/90 my-0 py-3.5 sm:py-4.5 md:py-5 select-none"
      aria-label="Service Guarantees"
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 md:gap-8 items-center justify-between divide-y sm:divide-y-0 sm:divide-x divide-[#D0C9BA]/80">
          {/* Badge 1: Free Shipping */}
          <div className="flex items-center justify-center gap-3 sm:gap-3.5 pt-2 sm:pt-0 sm:px-4">
            <svg
              className="w-6 h-6 sm:w-7 sm:h-7 text-[#10264B] flex-shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25H3.375c-.621 0-1.125.504-1.125 1.125v6.75c0 .621.504 1.125 1.125 1.125h1.5m14.25-9v5.25m0 0h3.75"
              />
            </svg>
            <div className="flex flex-col text-left">
              <span className="font-sans font-bold text-xs sm:text-[12.5px] md:text-[13.5px] text-[#10264B] tracking-wide uppercase leading-tight">
                Free Shipping For
              </span>
              <span className="font-sans font-extrabold text-xs sm:text-[12.5px] md:text-[13.5px] text-[#10264B] tracking-wide uppercase leading-tight">
                Orders Above ₹599
              </span>
            </div>
          </div>

          {/* Badge 2: On Time Delivery */}
          <div className="flex items-center justify-center gap-3 sm:gap-3.5 pt-3 sm:pt-0 sm:px-4">
            <svg
              className="w-6 h-6 sm:w-7 sm:h-7 text-[#10264B] flex-shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex flex-col text-left">
              <span className="font-sans font-bold text-xs sm:text-[12.5px] md:text-[13.5px] text-[#10264B] tracking-wide uppercase leading-tight">
                Promise, On Time
              </span>
              <span className="font-sans font-extrabold text-xs sm:text-[12.5px] md:text-[13.5px] text-[#10264B] tracking-wide uppercase leading-tight">
                Delivery
              </span>
            </div>
          </div>

          {/* Badge 3: 100% Secure Payment */}
          <div className="flex items-center justify-center gap-3 sm:gap-3.5 pt-3 sm:pt-0 sm:px-4">
            <svg
              className="w-6 h-6 sm:w-7 sm:h-7 text-[#10264B] flex-shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
            <div className="flex flex-col text-left">
              <span className="font-sans font-bold text-xs sm:text-[12.5px] md:text-[13.5px] text-[#10264B] tracking-wide uppercase leading-tight">
                100% Secure
              </span>
              <span className="font-sans font-extrabold text-xs sm:text-[12.5px] md:text-[13.5px] text-[#10264B] tracking-wide uppercase leading-tight">
                Payment
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default TrustBanner;
