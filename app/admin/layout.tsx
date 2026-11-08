import Link from "next/link";
import { auth, signOut } from "@/auth";
import { AdminBreadcrumbs } from "@/components/admin/AdminBreadcrumbs";
import { AdminSidebarNav } from "@/components/admin/AdminSidebarNav";
import { IconSignOut, IconStorefront } from "@/components/admin/AdminIcons";

export const metadata = {
  title: "Admin Console | Malli & Co.",
  description: "Management dashboard for Malli & Co.",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="flex min-h-screen bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
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

        {/* Professional Navigation List */}
        <AdminSidebarNav />

        {/* User Profile & Sign Out Footer */}
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

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
            >
              <IconSignOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Shell (with left margin for fixed sidebar) */}
      <div className="flex flex-1 flex-col pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-neutral-200 bg-white/80 px-8 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/80">
          <AdminBreadcrumbs />

          <div className="flex items-center gap-4">
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 transition hover:text-black dark:text-neutral-400 dark:hover:text-white"
            >
              <span>View Storefront</span>
              <IconStorefront className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
