"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const ROUTE_LABELS: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/campaigns": "Sales & Offers",
  "/admin/collections": "Collections",
  "/admin/banners": "Banners",
  "/admin/products": "Products",
  "/admin/categories": "Categories",
  "/admin/brands": "Brands",
  "/admin/inventory": "Inventory",
  "/admin/orders": "Orders",
  "/admin/customers": "Customers",
  "/admin/hero": "Hero Lookbook",
  "/admin/settings": "Settings",
};

export function AdminBreadcrumbs() {
  const pathname = usePathname();

  const label = ROUTE_LABELS[pathname] || (
    pathname.startsWith("/admin/campaigns")
      ? "Sales & Offers"
      : pathname.split("/").pop() || "Management"
  );

  return (
    <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
      <Link href="/admin" className="hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors">
        Admin
      </Link>
      <span>/</span>
      <span className="font-medium text-neutral-900 dark:text-neutral-100 capitalize">
        {label}
      </span>
    </div>
  );
}

