import { NextResponse } from "next/server";
import { getStorePaymentSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getStorePaymentSettings();
    return NextResponse.json({
      success: true,
      settings: {
        manualUpiEnabled: settings.manualUpiEnabled,
        storeUpiId: settings.storeUpiId,
        storeUpiName: settings.storeUpiName,
        storeUpiQrImage: settings.storeUpiQrImage,
        storeUpiInstructions: settings.storeUpiInstructions,
        razorpayAvailable: settings.razorpayAvailable,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch payment settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

