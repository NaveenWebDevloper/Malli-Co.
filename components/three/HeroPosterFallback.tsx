import React from "react";
import Image from "next/image";
import Link from "next/link";
import { VaporType } from "@/components/ui/VaporType";

export function HeroPosterFallback() {
  return (
    <div
      id="lookbook"
      className="relative w-full h-[620px] md:h-[700px] overflow-hidden bg-[#0D0D0D] text-[#FBF9F5] flex flex-col items-center justify-center scroll-mt-20"
    >
      {/* Editorial High-Resolution Background Photography */}
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1600&q=85&auto=format&fit=crop"
          alt="Malli & Co. Luxury Italian Linen Collection"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-40 scale-105 transition-transform duration-1000 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-black/40 to-black/60" />
      </div>

      {/* Luxury Editorial Typography */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center flex flex-col items-center">
        <span className="text-[11px] uppercase tracking-[0.35em] text-[#D4AF37] font-medium mb-4">
          Autumn / Winter Collection
        </span>
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-light tracking-tight font-serif text-[#FBF9F5] mb-6 leading-[1.08]">
          The Art of <br />
          <VaporType
            words={[
              "Premium Wear",
              "Classic Shirts",
              "Pure Linens",
              "Festive Wear",
            ]}
            vaporColor="#D4AF37"
            color="#EAE3D4"
            align="center"
            className="italic font-normal text-[#EAE3D4]"
            density={1.2}
            particleSize={1.2}
            spread={1.3}
            rise={1.0}
            turbulence={0.7}
            condense={1.6}
            hold={2.6}
            dissolve={1.8}
            interactive
            pauseOnHover
            clickAdvance
          />
        </h1>
        <p className="max-w-xl text-neutral-300 text-sm sm:text-base font-light leading-relaxed mb-10 tracking-wide">
          Ready-to-wear shirts, breathable linens, and festive outfits.
          Crafted for modern men and kids.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link
            href="/men"
            className="w-full sm:w-auto px-8 py-3.5 bg-[#FBF9F5] text-[#121212] text-xs uppercase tracking-[0.2em] font-semibold hover:bg-[#EAE3D4] transition-colors duration-300 text-center"
          >
            Explore Men
          </Link>
          <Link
            href="/kids"
            className="w-full sm:w-auto px-8 py-3.5 border border-[#FBF9F5]/40 text-[#FBF9F5] text-xs uppercase tracking-[0.2em] font-semibold hover:bg-white/10 transition-colors duration-300 text-center"
          >
            Explore Kids
          </Link>
        </div>
      </div>

      {/* Discreet Fallback / Loading Badge */}
      <div className="absolute bottom-6 right-6 flex items-center gap-2 text-[10px] text-neutral-400 tracking-widest uppercase">
        <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
        <span>Malli & Co.</span>
      </div>
    </div>
  );
}

export default HeroPosterFallback;

