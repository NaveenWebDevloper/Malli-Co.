import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthForm } from "@/components/store/AuthForm";

export const metadata: Metadata = {
  title: "Client Portal | Malli & Co. Luxury Apparel",
  description: "Sign in or create an account to manage your orders, shipping details, and bespoke wardrobe preferences.",
  robots: { index: false, follow: false },
};

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
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-[#FBF9F5]">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-[#EAE3D4] bg-white p-8 sm:p-10 shadow-sm">
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="text-2xl font-serif font-black tracking-tight text-[#121212] hover:opacity-80 transition-opacity"
          >
            MALLI &amp; CO.
          </Link>
          <p className="text-xs font-serif italic text-neutral-500">
            Artisanal Menswear &amp; Tailoring Atelier
          </p>
        </div>

        {params.error && (
          <div className="rounded-xl bg-red-50 p-3 text-center text-xs font-medium text-red-700 border border-red-100">
            {params.error}
          </div>
        )}

        <AuthForm
          defaultTab={initialTab}
          callbackUrl={targetCallbackUrl}
        />

        <div className="pt-4 border-t border-[#EAE3D4] text-center">
          <Link
            href="/men"
            className="text-xs font-serif text-[#8C7A58] hover:text-[#121212] transition-colors uppercase tracking-wider"
          >
            ← Return to Collections
          </Link>
        </div>
      </div>
    </div>
  );
}
