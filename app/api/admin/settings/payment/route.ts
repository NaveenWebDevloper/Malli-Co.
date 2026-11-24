import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  getStorePaymentSettings,
  updateStorePaymentSettings,
} from "@/lib/settings";

export const dynamic = "force-dynamic";

const UpdatePaymentSettingsSchema = z.object({
  manualUpiEnabled: z.boolean().optional(),
  storeUpiId: z.string().trim().min(3, "UPI ID is required").optional(),
  storeUpiName: z.string().trim().min(2, "Payee Name is required").optional(),
  storeUpiQrImage: z.string().trim().optional(),
  storeUpiInstructions: z.string().trim().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Admin role required" },
      { status: 403 },
    );
  }

  try {
    const settings = await getStorePaymentSettings();
    return NextResponse.json({ success: true, settings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load payment settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Admin role required" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = UpdatePaymentSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    await updateStorePaymentSettings(parsed.data);
    const updated = await getStorePaymentSettings();
    return NextResponse.json({
      success: true,
      message: "Payment settings updated successfully",
      settings: updated,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save payment settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

