import { auth, signOut } from "@/auth";
import { AdminShell } from "@/components/admin/AdminShell";

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

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <AdminShell
      user={
        user
          ? {
              name: user.name,
              email: user.email,
              role: user.role,
            }
          : undefined
      }
      signOutAction={handleSignOut}
    >
      {children}
    </AdminShell>
  );
}
