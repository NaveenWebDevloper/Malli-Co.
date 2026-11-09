import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Malli & Co. Luxury Menswear & Kids",
  description:
    "Privacy Policy for Malli & Co. Learn how we collect, protect, and manage your personal data, including our Google OAuth compliance and user data protection.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPolicyPage() {
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
            Privacy Policy
          </h1>
          <p className="mt-2 text-xs text-neutral-500 font-mono">
            Last Updated: {lastUpdated} • Effective Date: November 1, 2026
          </p>
        </div>

        {/* Introduction */}
        <div className="prose prose-neutral max-w-none text-xs sm:text-sm leading-relaxed space-y-6 text-neutral-700">
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-serif font-bold text-neutral-900 uppercase tracking-wide border-b border-[#EAE3D4]/80 pb-1.5">
              1. Introduction &amp; Scope
            </h2>
            <p>
              Welcome to <strong>Malli &amp; Co.</strong> (operated by <strong>Malli &amp; Co. Luxury Apparel Pvt. Ltd.</strong>, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;). We design and deliver artisanal luxury menswear and celebratory children&apos;s apparel across India. We are committed to safeguarding your personal data and respecting your privacy rights.
            </p>
            <p>
              This Privacy Policy explains how we collect, use, store, process, and disclose your information when you visit our website (
              <Link href="/" className="text-[#8C7A58] underline hover:text-black">
                https://malli-co-one.vercel.app
              </Link>
              ), create an account, authenticate via Google Sign-In, or purchase our luxury garments.
            </p>
          </section>

          {/* Google OAuth & User Data */}
          <section className="space-y-3 bg-[#FAF8F5] p-5 rounded-xl border border-[#EAE3D4]">
            <h2 className="text-base sm:text-lg font-serif font-bold text-neutral-900 uppercase tracking-wide border-b border-[#EAE3D4] pb-1.5 flex items-center gap-2">
              <span>2. Google OAuth &amp; Social Sign-In Data</span>
            </h2>
            <p>
              To offer a seamless and secure sign-in experience, Malli &amp; Co. allows you to log in using <strong>Google Sign-In (Google OAuth 2.0)</strong>. When you authenticate using your Google account:
            </p>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li>
                <strong>Data Collected:</strong> We access only basic profile information provided by Google with your explicit permission: your full name, primary email address, profile avatar image, and verified Google account identifier.
              </li>
              <li>
                <strong>Purpose of Use:</strong> This information is strictly utilized to authenticate your identity, create your unique customer account, pre-fill your order shipping records, and provide order tracking updates.
              </li>
              <li>
                <strong>No Data Selling or Advertising:</strong> We <strong>never sell, lease, or monetize</strong> your Google user data to data brokers, advertising networks, or any third parties.
              </li>
              <li>
                <strong>Google API Services Compliance:</strong> Malli &amp; Co.&apos;s use and transfer to any other app of information received from Google APIs will adhere to the{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#8C7A58] underline font-semibold hover:text-black"
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements.
              </li>
            </ul>
          </section>

          {/* Personal Information We Collect */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-serif font-bold text-neutral-900 uppercase tracking-wide border-b border-[#EAE3D4]/80 pb-1.5">
              3. Information We Collect Directly
            </h2>
            <p>When you interact with our platform, we may collect the following categories of information:</p>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li>
                <strong>Contact &amp; Identity Data:</strong> Name, email address, telephone/mobile number.
              </li>
              <li>
                <strong>Delivery &amp; Billing Addresses:</strong> Street address, landmark, city, state, postal code (PIN), and country for physical fulfillment of your orders.
              </li>
              <li>
                <strong>Order &amp; Transaction History:</strong> Garments purchased, sizes, tailored variant snapshots, invoice numbers, order totals in integer paise (INR), and delivery status.
              </li>
              <li>
                <strong>Payment Information:</strong> All payment transactions are securely handled by our PCI-DSS compliant payment gateway partner, <strong>Razorpay</strong>. We never store credit/debit card numbers, CVVs, or net banking passwords on our servers.
              </li>
              <li>
                <strong>Technical &amp; Device Information:</strong> IP address, browser type, operating system, and session cookies necessary for shopping cart functionality.
              </li>
            </ul>
          </section>

          {/* How We Use Information */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-serif font-bold text-neutral-900 uppercase tracking-wide border-b border-[#EAE3D4]/80 pb-1.5">
              4. How We Use Your Information
            </h2>
            <p>We process your data strictly for legitimate operational and business purposes, including:</p>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li>Processing, fulfilling, packaging, and dispatching your garment orders.</li>
              <li>Issuing GST-compliant tax invoices and managing complimentary returns or exchanges.</li>
              <li>Sending transactional communications (order confirmation, dispatch alerts, OTPs).</li>
              <li>Preventing fraudulent transactions and ensuring inventory integrity.</li>
              <li>Complying with statutory tax, accounting, and consumer protection laws under Indian jurisdiction.</li>
            </ul>
          </section>

          {/* Third-Party Service Providers */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-serif font-bold text-neutral-900 uppercase tracking-wide border-b border-[#EAE3D4]/80 pb-1.5">
              5. Third-Party Service Providers
            </h2>
            <p>
              We only share personal data with trusted service providers who adhere to strict data security standards and confidentiality obligations:
            </p>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li>
                <strong>Payment Gateways:</strong> Razorpay Software Pvt. Ltd. for processing authorized INR transactions.
              </li>
              <li>
                <strong>Shipping &amp; Logistics Partners:</strong> Registered courier partners (e.g. BlueDart, Delhivery) strictly to deliver garments to your shipping address.
              </li>
              <li>
                <strong>Cloud &amp; Media Infrastructure:</strong> Vercel (hosting), MongoDB Atlas (database storage), and ImageKit/Cloudflare (optimized visual assets).
              </li>
            </ul>
          </section>

          {/* Data Retention & Deletion */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-serif font-bold text-neutral-900 uppercase tracking-wide border-b border-[#EAE3D4]/80 pb-1.5">
              6. Data Retention &amp; User Rights (Account &amp; Data Deletion)
            </h2>
            <p>
              You possess full control over your personal data. You have the right to access, rectify, or request the complete deletion of your customer profile and personal details at any time.
            </p>
            <p>
              To request account termination or data erasure, email our Data Protection Desk at{" "}
              <a href="mailto:concierge@malliandco.com" className="text-[#8C7A58] underline font-semibold">
                concierge@malliandco.com
              </a>{" "}
              with the subject line &ldquo;Data Deletion Request&rdquo;. Upon verification, we will purge your user profile within 30 days, retaining only statutory financial records required by Indian taxation law (GST/Income Tax Act).
            </p>
          </section>

          {/* Security */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-serif font-bold text-neutral-900 uppercase tracking-wide border-b border-[#EAE3D4]/80 pb-1.5">
              7. Security Measures
            </h2>
            <p>
              We employ strict industry-standard security safeguards: 256-bit TLS/SSL encryption for all data in transit, tokenized authentication via Auth.js, role-based access control (RBAC), and continuous monitoring against unauthorized access or breaches.
            </p>
          </section>

          {/* Contact & Grievance */}
          <section className="space-y-3 border-t border-[#EAE3D4] pt-6">
            <h2 className="text-base sm:text-lg font-serif font-bold text-neutral-900 uppercase tracking-wide">
              8. Grievance Officer &amp; Contact Information
            </h2>
            <p>
              In accordance with the Information Technology Act, 2000 and rules made thereunder, the contact details of our Grievance Officer are:
            </p>
            <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#EAE3D4] text-xs font-mono space-y-1">
              <p className="font-bold text-neutral-900">Grievance &amp; Compliance Officer</p>
              <p>Malli &amp; Co. Luxury Apparel Pvt. Ltd.</p>
              <p>Near Vikas Pre School, Govt High School Road,</p>
              <p>Mallampet, Bachupally, Hyderabad, Telangana - 500090, India</p>
              <p>Email: <a href="mailto:concierge@malliandco.com" className="text-[#8C7A58] underline">concierge@malliandco.com</a></p>
              <p>Customer Support: +91 99099 00000</p>
            </div>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="mt-10 pt-6 border-t border-[#EAE3D4] flex flex-wrap items-center justify-between gap-4 text-xs">
          <Link href="/" className="font-bold uppercase tracking-wider text-neutral-800 hover:text-[#8C7A58] transition">
            ← Return to Atelier Home
          </Link>
          <div className="flex gap-4">
            <Link href="/terms" className="text-neutral-500 hover:text-neutral-800 underline">
              Terms of Service
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
