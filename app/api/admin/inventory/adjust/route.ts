import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "../../../../../lib/db.ts";
import { adjustStock, InsufficientStockError } from "../../../../../lib/inventory.ts";
import { AdjustStockSchema } from "../../../../../lib/validations/inventory.ts";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Admin role required" },
      { status: 403 },
    );
  }

  await connectDB();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = AdjustStockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { variantId, change, reason, note } = parsed.data;

  try {
    const result = await adjustStock({
      variantId,
      change,
      reason,
      note,
    });

    return NextResponse.json({
      success: true,
      variantId: result.variant._id.toString(),
      sku: result.variant.sku,
      previousStock: result.previousStock,
      newStock: result.newStock,
      change,
      reason,
    });
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return NextResponse.json(
        {
          error: err.message,
          available: err.available,
          requested: err.requested,
        },
        { status: 400 },
      );
    }
    const message = err instanceof Error ? err.message : "Failed to adjust stock";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

