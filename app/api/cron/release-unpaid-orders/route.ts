import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db.ts";
import { releaseExpiredOrders } from "../../../../lib/orders.ts";

export async function GET(req: NextRequest) {
  return handleRelease(req);
}

export async function POST(req: NextRequest) {
  return handleRelease(req);
}

async function handleRelease(req: NextRequest) {
  // Check authorization if CRON_SECRET is configured
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized cron execution" }, { status: 401 });
  }

  await connectDB();

  try {
    const result = await releaseExpiredOrders();
    return NextResponse.json({
      success: true,
      message: `Successfully released ${result.cancelledCount} expired unpaid order(s)`,
      cancelledCount: result.cancelledCount,
      orderNumbers: result.orderNumbers,
    });
  } catch (err) {
    console.error("Failed to release expired orders:", err);
    return NextResponse.json(
      {
        error: "Failed to release expired orders",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

