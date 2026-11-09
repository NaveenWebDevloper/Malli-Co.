import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Malli & Co. Luxury Menswear & Kids",
  description:
    "Terms of Service and Conditions of Sale for Malli & Co. Learn about online purchases, shipping, 14-day returns, and legal terms.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsOfServicePage() {
  const lastUpdated = "November 10, 2026";

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#121212] py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white border border-[#EAE3D4] rounded-2xl shadow-xs p-8 sm:p-12 lg:p-16">
        {/* Header */}
        <div className="border-b border-[#EAE3D4] pb-8 mb-8">
          <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#8C7A58] block mb-2">
            Malli &amp; Co. Legal &amp; Governance
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-black uppercase tracking-tight text-[#121212]">
            Terms of Service
          </h1>
          <p className="mt-2 text-xs text-neutral-500 font-mono">
            Last Updated: {lastUpdated} • Effective Date: November 1, 2026
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-neutral max-w-none text-xs sm:text-sm leading-relaxed space-y-6 text-neutral-700">
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-serif font-bold text-neutral-900 uppercase tracking-wide border-b border-[#EAE3D4]/80 pb-1.5">
              1. Agreement to Terms
            </h2>
            <p>
              These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you and{" "}
              <strong>Malli &amp; Co. Luxury Apparel Pvt. Ltd.</strong> (&ldquo;Malli &amp; Co.&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), governing your access to and use of our website, e-commerce storefront, mobile interfaces, and digital services (collectively, the &ldquo;Platform&rdquo;).
            </p>
            <p>
              By accessing, browsing, registering an account, or placing an order on our Platform, you acknowledge that you have read, understood, and agreed to be bound by these Terms and our{" "}
              <Link href="/privacy" className="text-[#8C7A58] underline hover:text-black">
                Privacy Policy
              </Link>
              . If you do not agree to these Terms, you must refrain from using the Platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-serif font-bold text-neutral-900 uppercase tracking-wide border-b border-[#EAE3D4]/80 pb-1.5">
              2. Account Registration &amp; Authentication
            </h2>
            <p>
              To access personalized shopping features, order histories, and tailored sizes, you may create an account directly or authenticate via <strong>Google Sign-In</strong>.
            </p>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li>You represent that all information provided during registration or checkout is truthful, accurate, and complete.</li>
              <li>You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</li>
              <li>We reserve the right to suspend or terminate accounts that provide fraudulent information or engage in suspicious or unauthorized transactions.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-serif font-bold text-neutral-900 uppercase tracking-wide border-b border-[#EAE3D4]/80 pb-1.5">
              3. Products, Artisanal Craftsmanship &amp; Pricing
            </h2>
            <p>
              Malli &amp; Co. specializes in handcrafted luxury menswear and children&apos;s apparel woven from premium fabrics including French flax linen and Supima cotton.
            </p>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li>
                <strong>Currency &amp; Accuracy:</strong> All prices are displayed in Indian Rupees (INR) and are inclusive of applicable Goods and Services Tax (GST). All financial computations are strictly verified server-side.
              </li>
              <li>
                <strong>Visual Representation:</strong> We make every effort to display garment colors, textures, and tailoring cuts accurately. However, variations may occur depending on your device&apos;s screen calibration.
              </li>
              <li>
                <strong>Inventory &amp; Reservation:</strong> Initiating checkout reserves stock for a window of 15 minutes to allow payment completion. If payment is not finalized within this period, the reservation automatically releases back to inventory.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-serif font-bold text-neutral-900 uppercase tracking-wide border-b border-[#EAE3D4]/80 pb-1.5">
              4. Orders &amp; Payment Processing
            </h2>
            <p>
              All online payments are securely processed via <strong>Razorpay</strong>, supporting UPI, credit cards, debit cards, and net banking.
            </p>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li>An order is confirmed only after successful signature verification from our payment gateway and generation of a canonical Order Number.</li>
              <li>We reserve the right to refuse or cancel any order if fraudulent activity is flagged by security filters, or in the rare event of an unforeseen inventory stockout.</li>
              <li>If an order is cancelled by us after payment capture, the full transaction amount will be credited back to your original payment method within 5–7 business days.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-serif font-bold text-neutral-900 uppercase tracking-wide border-b border-[#EAE3D4]/80 pb-1.5">
              5. Shipping, Delivery &amp; Returns
            </h2>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li>
                <strong>Complimentary Delivery:</strong> Orders with a merchandise subtotal of ₹1,999 and above qualify for complimentary standard shipping across all serviceable PIN codes in India.
              </li>
              <li>
                <strong>Dispatch Timeline:</strong> Ready-to-wear items are typically dispatched within 24–48 business hours. Delivery timelines range from 2–5 business days depending on destination.
              </li>
              <li>
                <strong>14-Day Complimentary Returns:</strong> Unworn, unwashed garments in their original packaging with all security tags intact may be returned or exchanged within 14 calendar days of delivery.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-serif font-bold text-neutral-900 uppercase tracking-wide border-b border-[#EAE3D4]/80 pb-1.5">
              6. Intellectual Property Rights
            </h2>
            <p>
              All trademarks, logos, brand names, garment designs, photographic lookbooks, copy, 3D WebGL presentations, and code comprising the Platform are the exclusive intellectual property of Malli &amp; Co. Luxury Apparel Pvt. Ltd. Unauthorized reproduction, scraping, modification, or distribution is strictly prohibited.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-serif font-bold text-neutral-900 uppercase tracking-wide border-b border-[#EAE3D4]/80 pb-1.5">
              7. Governing Law &amp; Jurisdiction
            </h2>
            <p>
              These Terms and any dispute or claim arising out of or in connection with them shall be governed by and construed in accordance with the laws of India. Any legal proceedings shall be subject to the exclusive jurisdiction of the competent courts in <strong>Hyderabad, Telangana, India</strong>.
            </p>
          </section>

          <section className="space-y-3 border-t border-[#EAE3D4] pt-6">
            <h2 className="text-base sm:text-lg font-serif font-bold text-neutral-900 uppercase tracking-wide">
              8. Contact &amp; Legal Notices
            </h2>
            <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#EAE3D4] text-xs font-mono space-y-1">
              <p className="font-bold text-neutral-900">Malli &amp; Co. Luxury Apparel Pvt. Ltd.</p>
              <p>Near Vikas Pre School, Govt High School Road,</p>
              <p>Mallampet, Bachupally, Hyderabad, Telangana - 500090, India</p>
              <p>Corporate Email: <a href="mailto:concierge@malliandco.com" className="text-[#8C7A58] underline">concierge@malliandco.com</a></p>
              <p>GSTIN: 36AAECM5544J1Z8</p>
            </div>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="mt-10 pt-6 border-t border-[#EAE3D4] flex flex-wrap items-center justify-between gap-4 text-xs">
          <Link href="/" className="font-bold uppercase tracking-wider text-neutral-800 hover:text-[#8C7A58] transition">
            ← Return to Atelier Home
          </Link>
          <div className="flex gap-4">
            <Link href="/privacy" className="text-neutral-500 hover:text-neutral-800 underline">
              Privacy Policy
            </Link>
            <Link href="/login" className="text-neutral-500 hover:text-neutral-800 underline">
              Account Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

