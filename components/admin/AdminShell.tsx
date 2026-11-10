"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminBreadcrumbs } from "@/components/admin/AdminBreadcrumbs";
import { AdminSidebarNav } from "@/components/admin/AdminSidebarNav";
import {
  IconMenu,
  IconClose,
  IconSignOut,
  IconStorefront,
} from "@/components/admin/AdminIcons";

export interface AdminUser {
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

interface AdminShellProps {
  user?: AdminUser;
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
}

export function AdminShell({ user, signOutAction, children }: AdminShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();

  // Automatically close mobile drawer whenever route changes
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // Close mobile drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileNavOpen) {
        setMobileNavOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileNavOpen]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileNavOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [mobileNavOpen]);

  // Reusable User Profile & Sign Out Footer
  const renderSidebarFooter = () => (
    <div className="border-t border-neutral-200 p-4 dark:border-neutral-800">
      <div className="mb-3 flex items-center justify-between">
        <div className="min-w-0 flex-1 pr-2">
          <p className="truncate text-xs font-semibold text-neutral-900 dark:text-neutral-100">
            {user?.name || "Malli Admin"}
          </p>
          <p className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">
            {user?.email || "admin@malliandco.com"}
          </p>
        </div>
        <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
          {user?.role || "ADMIN"}
        </span>
      </div>

      <form action={signOutAction}>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white cursor-pointer"
        >
          <IconSignOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </form>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      {/* =========================================================================
          1. DESKTOP SIDEBAR (Static Fixed Left on Large Screens >= 1024px)
      ========================================================================= */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        {/* Brand Header */}
        <div className="flex h-16 items-center border-b border-neutral-200 px-6 dark:border-neutral-800">
          <Link href="/admin" className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-neutral-900 dark:text-white">
              Malli &amp; Co.
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8C7A58]">
              Admin Console
            </span>
          </Link>
        </div>

        {/* Navigation List */}
        <AdminSidebarNav />

        {/* Footer */}
        {renderSidebarFooter()}
      </aside>

      {/* =========================================================================
          2. MOBILE DRAWER (< 1024px)
      ========================================================================= */}
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity duration-300 lg:hidden ${
          mobileNavOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileNavOpen(false)}
        aria-hidden="true"
      />

      {/* Off-canvas sliding panel */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-neutral-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:border-neutral-800 dark:bg-neutral-900 lg:hidden ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Admin Navigation Menu"
      >
        {/* Brand Header with Close Button */}
        <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-5 dark:border-neutral-800">
          <Link
            href="/admin"
            onClick={() => setMobileNavOpen(false)}
            className="flex flex-col"
          >
            <span className="text-base font-bold tracking-tight text-neutral-900 dark:text-white">
              Malli &amp; Co.
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8C7A58]">
              Admin Console
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation menu"
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List (Auto-closes drawer on item click) */}
        <AdminSidebarNav onNavigate={() => setMobileNavOpen(false)} />

        {/* User Profile & Sign Out Footer */}
        {renderSidebarFooter()}
      </div>

      {/* =========================================================================
          3. MAIN CONTENT SHELL (Responsive pl-0 lg:pl-64)
      ========================================================================= */}
      <div className="flex flex-1 flex-col pl-0 lg:pl-64 min-w-0 overflow-x-hidden">
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-neutral-200 bg-white/80 px-4 sm:px-6 lg:px-8 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/80">
          <div className="flex items-center gap-2 min-w-0 mr-2">
            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden -ml-1 p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white transition-colors"
            >
              <IconMenu className="w-5 h-5" />
            </button>

            {/* Breadcrumbs Navigation */}
            <AdminBreadcrumbs />
          </div>

          {/* View Storefront Link */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50/80 px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 hover:text-black dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
            >
              <span className="hidden sm:inline">View Storefront</span>
              <span className="sm:hidden font-medium">Store</span>
              <IconStorefront className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {/* Responsive Page Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AdminShell;
