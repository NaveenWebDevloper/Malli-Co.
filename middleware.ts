import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;

  // Protect /admin pages and /api/admin routes (Rule 7)
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  if (isAdminPage || isAdminApi) {
    if (!isLoggedIn) {
      if (isAdminApi) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const loginUrl = new URL("/login", req.nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (userRole !== "ADMIN") {
      if (isAdminApi) {
        return NextResponse.json(
          { error: "Forbidden: Admin role required" },
          { status: 403 },
        );
      }
      return new NextResponse(
        "Forbidden: Access restricted to administrators",
        { status: 403 },
      );
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
