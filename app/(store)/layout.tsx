import { Suspense } from "react";
import { StoreHeader } from "@/components/store/StoreHeader";
import { AnnouncementBar } from "@/components/store/AnnouncementBar";
import { StoreFooter } from "@/components/store/StoreFooter";
import { CartProvider } from "@/components/store/CartContext";
import { CartDrawer } from "@/components/store/CartDrawer";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { PageTransitionProvider } from "@/components/providers/PageTransitionProvider";
import { StorePreloader } from "@/components/store/StorePreloader";
import { NavigationProgressBar } from "@/components/store/NavigationProgressBar";
import { auth } from "@/auth";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <CartProvider>
      <SmoothScrollProvider>
        <Suspense fallback={null}>
          <NavigationProgressBar />
        </Suspense>
        <StorePreloader />
        <div className="min-h-screen flex flex-col bg-[#FBF9F5] text-[#121212] selection:bg-neutral-900 selection:text-[#FBF9F5] overflow-x-clip">
          <AnnouncementBar />
          <StoreHeader isAdmin={isAdmin} />
          <main className="flex-1 pt-[var(--header-offset)]">
            <PageTransitionProvider>{children}</PageTransitionProvider>
          </main>
          <StoreFooter />
          <CartDrawer />
        </div>
      </SmoothScrollProvider>
    </CartProvider>
  );
}
