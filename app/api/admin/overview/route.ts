import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();

  // Re-verify session and role in route handler (Rule 7)
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized: Authentication required" },
      { status: 401 },
    );
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Admin role required" },
      { status: 403 },
    );
  }

  return NextResponse.json({
    status: "ok",
    data: {
      metrics: {
        totalRevenuePaise: 12450000,
        totalOrders: 48,
        activeProducts: 26,
        lowStockAlerts: 3,
      },
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
      },
    },
  });
}
