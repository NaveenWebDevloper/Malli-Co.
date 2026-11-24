import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthForm } from "@/components/store/AuthForm";

export const metadata: Metadata = {
  title: "Login & Register | Malli & Co. Fashion Hub",
  description: "Sign in or create an account with Malli & Co. to track orders, save favorites, and enjoy express checkout.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string; mode?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  const targetCallbackUrl = params.callbackUrl || "/account";

  // If already logged in, redirect directly to callbackUrl or customer account
  if (session?.user) {
    if (params.callbackUrl) {
      redirect(params.callbackUrl);
    } else if (session.user.role === "ADMIN") {
      redirect("/admin");
    } else {
      redirect("/account");
    }
  }

  const initialTab = params.mode === "register" ? "register" : "signin";

  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#F8F7F4]/60 py-8 sm:py-14 px-4 sm:px-6 lg:px-8 flex flex-col justify-center font-sans">
      <div className="max-w-4xl mx-auto w-full space-y-4">
        
        {/* Navigation Breadcrumb / Return */}
        <div className="flex items-center justify-between text-xs text-neutral-500 px-2">
          <Link
            href="/"
            className="hover:text-[#10264B] transition-colors flex items-center gap-1.5 font-medium"
          >
            <span>←</span> Return to Storefront
          </Link>
          <span className="font-medium text-neutral-400">Malli &amp; Co. Secure Authentication</span>
        </div>

        {params.error && (
          <div className="rounded-2xl bg-red-50 p-3.5 text-center text-xs font-semibold text-red-700 border border-red-200">
            {params.error}
          </div>
        )}

        {/* Unified Split Auth Form */}
        <AuthForm
          defaultTab={initialTab}
          callbackUrl={targetCallbackUrl}
        />
      </div>
    </div>
  );
}
