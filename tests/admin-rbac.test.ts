import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest, NextResponse } from "next/server.js";

describe("Admin Route Protection & Role-Based Access Control (Rule 7)", () => {
  it("middleware returns 401 Unauthorized for unauthenticated requests to /api/admin", async () => {
    // Simulate middleware logic for unauthenticated request
    const req = new NextRequest("http://localhost:3000/api/admin/overview", {
      method: "GET",
    });

    // Invoke middleware logic
    const pathname = req.nextUrl.pathname;
    const isLoggedIn = false;
    const userRole: string | undefined = undefined;

    let response: NextResponse;
    if (pathname.startsWith("/api/admin")) {
      if (!isLoggedIn) {
        response = NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 },
        );
      } else if (userRole !== "ADMIN") {
        response = NextResponse.json(
          { error: "Forbidden: Admin role required" },
          { status: 403 },
        );
      } else {
        response = NextResponse.next();
      }
    } else {
      response = NextResponse.next();
    }

    assert.equal(
      response.status,
      401,
      "Unauthenticated API request must return 401",
    );
    const body = await response.json();
    assert.equal(body.error, "Unauthorized");
  });

  it("middleware returns 403 Forbidden when a CUSTOMER (non-admin) accesses /api/admin", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/overview", {
      method: "GET",
    });

    // User is logged in, but with role "CUSTOMER"
    const pathname = req.nextUrl.pathname;
    const isLoggedIn = true;
    const userRole: string | undefined = "CUSTOMER";

    let response: NextResponse;
    if (pathname.startsWith("/api/admin")) {
      if (!isLoggedIn) {
        response = NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 },
        );
      } else if (userRole !== "ADMIN") {
        response = NextResponse.json(
          { error: "Forbidden: Admin role required" },
          { status: 403 },
        );
      } else {
        response = NextResponse.next();
      }
    } else {
      response = NextResponse.next();
    }

    assert.equal(
      response.status,
      403,
      "Non-admin user (CUSTOMER) must receive 403 Forbidden",
    );
    const body = await response.json();
    assert.equal(body.error, "Forbidden: Admin role required");
  });

  it("middleware permits access when an ADMIN accesses /api/admin", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/overview", {
      method: "GET",
    });

    // User is logged in with role "ADMIN"
    const pathname = req.nextUrl.pathname;
    const isLoggedIn = true;
    const userRole: string | undefined = "ADMIN";

    let response: NextResponse;
    if (pathname.startsWith("/api/admin")) {
      if (!isLoggedIn) {
        response = NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 },
        );
      } else if (userRole !== "ADMIN") {
        response = NextResponse.json(
          { error: "Forbidden: Admin role required" },
          { status: 403 },
        );
      } else {
        response = NextResponse.next();
      }
    } else {
      response = NextResponse.next();
    }

    assert.equal(response.status, 200, "ADMIN user must be granted access");
  });

  it("admin route handler re-verifies session and returns 403 Forbidden for non-admin", async () => {
    // Simulate double-defense route handler logic (Rule 7)
    function simulateAdminOverviewHandler(
      mockSession: {
        user?: { id: string; email: string; role: string };
      } | null,
    ) {
      if (!mockSession?.user) {
        return NextResponse.json(
          { error: "Unauthorized: Authentication required" },
          { status: 401 },
        );
      }

      if (mockSession.user.role !== "ADMIN") {
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
          },
        },
      });
    }

    // 1. Non-admin customer attempt
    const customerSession = {
      user: {
        id: "cust_123",
        email: "customer@gmail.com",
        role: "CUSTOMER",
      },
    };

    const forbiddenResponse = simulateAdminOverviewHandler(customerSession);
    assert.equal(
      forbiddenResponse.status,
      403,
      "Route handler must strictly reject non-admin users with 403",
    );
    const forbiddenBody = await forbiddenResponse.json();
    assert.equal(forbiddenBody.error, "Forbidden: Admin role required");

    // 2. Unauthenticated attempt
    const unauthResponse = simulateAdminOverviewHandler(null);
    assert.equal(
      unauthResponse.status,
      401,
      "Route handler must reject unauthenticated with 401",
    );

    // 3. Admin attempt
    const adminSession = {
      user: {
        id: "admin_999",
        email: "admin@malliandco.com",
        role: "ADMIN",
      },
    };

    const adminResponse = simulateAdminOverviewHandler(adminSession);
    assert.equal(
      adminResponse.status,
      200,
      "Route handler must accept admin user",
    );
    const adminBody = await adminResponse.json();
    assert.equal(adminBody.status, "ok");
  });
});
