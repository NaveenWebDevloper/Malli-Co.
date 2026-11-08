"use client";

import Link from "next/link";
import { StoreTrustBar } from "./StoreTrustBar";

export function StoreFooter() {
  return (
    <>
      <StoreTrustBar />
      <footer className="bg-[#121212] text-[#F4EFE6] border-t border-neutral-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand Philosophy */}
          <div className="md:col-span-1 space-y-4">
            <span className="font-serif text-xl font-bold tracking-[0.2em] uppercase text-white block">
              MALLI & CO.
            </span>
            <p className="text-xs text-neutral-400 leading-relaxed font-light">
              Crafted in Hyderabad. Rooted in artisanal Indian cottons and French linens, designed for gentlemen and little icons with exacting standards.
            </p>
            <div className="text-[11px] text-neutral-500 font-mono">
              <p>GSTIN: 36AAECM5544J1Z8</p>
              <p>Telangana, India</p>
            </div>
          </div>

          {/* Collections */}
          <div className="space-y-3 text-xs">
            <h4 className="font-semibold uppercase tracking-widest text-white text-[11px]">
              Collections
            </h4>
            <ul className="space-y-2 text-neutral-400">
              <li>
                <Link href="/men" className="hover:text-white transition-colors">
                  Men&apos;s Tailoring
                </Link>
              </li>
              <li>
                <Link href="/kids" className="hover:text-white transition-colors">
                  Kids&apos; Festive & Casuals
                </Link>
              </li>
              <li>
                <Link href="/category/mens-shirts" className="hover:text-white transition-colors">
                  Pure French Linen
                </Link>
              </li>
              <li>
                <Link href="/category/mens-t-shirts" className="hover:text-white transition-colors">
                  Supima & Pima Cotton
                </Link>
              </li>
            </ul>
          </div>

          {/* Client Concierge */}
          <div className="space-y-3 text-xs">
            <h4 className="font-semibold uppercase tracking-widest text-white text-[11px]">
              Client Care
            </h4>
            <ul className="space-y-2 text-neutral-400">
              <li>
                <Link href="/admin/orders" className="hover:text-white transition-colors">
                  Track Orders
                </Link>
              </li>
              <li>
                <span className="cursor-default">Complimentary Pan-India Delivery</span>
              </li>
              <li>
                <span className="cursor-default">14-Day Complimentary Returns</span>
              </li>
              <li>
                <span className="text-neutral-500">concierge@malliandco.com</span>
              </li>
            </ul>
          </div>

          {/* Heritage Newsletter */}
          <div className="space-y-3 text-xs">
            <h4 className="font-semibold uppercase tracking-widest text-white text-[11px]">
              Private Salon
            </h4>
            <p className="text-neutral-400 text-[11px] leading-relaxed">
              Subscribe to receive private preview access to our seasonal drops and bespoke bespoke capsules.
            </p>
            <form onSubmit={(e) => e.preventDefault()} className="flex gap-2">
              <input
                type="email"
                placeholder="Enter email address"
                className="bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 flex-1"
              />
              <button
                type="submit"
                className="bg-[#F4EFE6] text-[#121212] px-4 py-2 text-xs font-semibold tracking-wider uppercase rounded hover:bg-white transition-colors"
              >
                Join
              </button>
            </form>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-neutral-500">
          <p>© {new Date().getFullYear()} Malli & Co. Luxury Apparel Pvt. Ltd. All rights reserved.</p>
          <p className="mt-2 sm:mt-0 font-light">Handcrafted in India • Zero compromise on quality</p>
        </div>
      </div>
    </footer>
    </>
  );
}
