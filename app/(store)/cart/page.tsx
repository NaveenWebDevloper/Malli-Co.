import type { Metadata } from "next";
import { CartPageView } from "@/components/store/CartPageView";

export const metadata: Metadata = {
  title: "Shopping Bag | Malli & Co.",
  description: "Review items in your shopping bag before proceeding to secure checkout.",
};

export default function CartPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
      <div className="mb-8 pb-4 border-b border-[#EAE3D4]">
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-500">
          Your Selection
        </span>
        <h1 className="text-2xl sm:text-3xl font-serif font-black uppercase tracking-tight text-[#121212] mt-1">
          Shopping Bag
        </h1>
      </div>
      <CartPageView />
    </div>
  );
}
