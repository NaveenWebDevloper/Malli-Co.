import React from "react";
import Image from "next/image";

export function TrustBanner() {
  return (
    <div
      className="w-full bg-[#EAE8E2] border-b border-[#DCD6CA]/80 my-0 py-0 flex items-center justify-center overflow-x-auto scrollbar-none"
      role="complementary"
      aria-label="Service Guarantees: Free Shipping, On Time Delivery, Secure Payment"
    >
      <div className="min-w-[560px] md:min-w-0 w-full max-w-[1021px] px-3 sm:px-4 flex items-center justify-center">
        <Image
          src="/images/trust-banner.png"
          alt="Free Shipping For Orders Above ₹599 • Promise, On Time Delivery • 100% Secure Payment"
          width={1021}
          height={36}
          priority
          quality={95}
          className="w-full h-auto object-contain py-2 select-none"
        />
      </div>
    </div>
  );
}

export default TrustBanner;

