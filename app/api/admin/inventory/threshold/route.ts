import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "../../../../../lib/db.ts";
import { Variant } from "../../../../../models/Variant.ts";
import { UpdateThresholdSchema } from "../../../../../lib/validations/inventory.ts";

export async function PATCH(req: NextRequest) {
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

  const parsed = UpdateThresholdSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { variantId, lowStockThreshold } = parsed.data;

  const variant = await Variant.findByIdAndUpdate(
    variantId,
    { lowStockThreshold },
    { new: true },
  );

  if (!variant) {
    return NextResponse.json({ error: "Variant not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    variantId: variant._id.toString(),
    lowStockThreshold: variant.lowStockThreshold,
  });
}

