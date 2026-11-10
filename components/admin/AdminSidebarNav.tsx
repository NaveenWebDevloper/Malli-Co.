"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconDashboard,
  IconSales,
  IconCollections,
  IconBanners,
  IconProducts,
  IconCategories,
  IconBrands,
  IconInventory,
  IconOrders,
  IconCustomers,
  IconLookbook,
  IconSettings,
} from "./AdminIcons";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { name: "Dashboard", href: "/admin", icon: IconDashboard },
  { name: "Sales & Offers", href: "/admin/campaigns", icon: IconSales },
  { name: "Collections", href: "/admin/collections", icon: IconCollections },
  { name: "Banners", href: "/admin/banners", icon: IconBanners },
  { name: "Products", href: "/admin/products", icon: IconProducts },
  { name: "Categories", href: "/admin/categories", icon: IconCategories },
  { name: "Brands", href: "/admin/brands", icon: IconBrands },
  { name: "Inventory", href: "/admin/inventory", icon: IconInventory },
  { name: "Orders", href: "/admin/orders", icon: IconOrders },
  { name: "Customers", href: "/admin/customers", icon: IconCustomers },
  { name: "Hero Lookbook", href: "/admin/hero", icon: IconLookbook },
  { name: "Settings", href: "/admin/settings", icon: IconSettings },
];

interface AdminSidebarNavProps {
  onNavigate?: () => void;
}

export function AdminSidebarNav({ onNavigate }: AdminSidebarNavProps = {}) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => onNavigate?.()}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all ${
              isActive
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800/70"
            }`}
          >
            <span
              className={`flex items-center justify-center transition-colors ${
                isActive
                  ? "text-white dark:text-neutral-900"
                  : "text-neutral-400 group-hover:text-neutral-700 dark:text-neutral-500 dark:group-hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            </span>
            <span className="truncate">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default AdminSidebarNav;

