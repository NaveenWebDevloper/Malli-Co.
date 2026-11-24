import { connectDB } from "./db.ts";
import { Setting } from "../models/Setting.ts";

export interface StorePaymentSettings {
  manualUpiEnabled: boolean;
  storeUpiId: string;
  storeUpiName: string;
  storeUpiQrImage: string;
  storeUpiInstructions: string;
  razorpayAvailable: boolean;
}

export const DEFAULT_PAYMENT_SETTINGS: StorePaymentSettings = {
  manualUpiEnabled: true,
  storeUpiId: "malliandco@okaxis",
  storeUpiName: "Malli & Co.",
  storeUpiQrImage: "",
  storeUpiInstructions:
    "1. Scan the QR code or copy the UPI ID into your GPay, PhonePe, Paytm, or BHIM app.\n2. Pay the exact order total.\n3. Enter the 12-digit UTR number or Transaction ID below to verify your order.",
  razorpayAvailable: false,
};

/**
 * Reads payment settings from MongoDB `Setting` collection,
 * returning defaults for any missing keys.
 */
export async function getStorePaymentSettings(): Promise<StorePaymentSettings> {
  await connectDB();

  const keys = [
    "MANUAL_UPI_ENABLED",
    "STORE_UPI_ID",
    "STORE_UPI_NAME",
    "STORE_UPI_QR_IMAGE",
    "STORE_UPI_INSTRUCTIONS",
  ];

  const docs = await Setting.find({ key: { $in: keys } }).lean();
  const map = new Map<string, string>();
  for (const doc of docs) {
    map.set(doc.key, doc.value);
  }

  const razorpayKeyId = process.env.RAZORPAY_KEY_ID?.trim();
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  const razorpayAvailable = Boolean(
    razorpayKeyId &&
      razorpayKeySecret &&
      !razorpayKeyId.includes("your_key_id") &&
      !razorpayKeySecret.includes("your_razorpay_key_secret"),
  );

  return {
    manualUpiEnabled: map.has("MANUAL_UPI_ENABLED")
      ? map.get("MANUAL_UPI_ENABLED") !== "false"
      : DEFAULT_PAYMENT_SETTINGS.manualUpiEnabled,
    storeUpiId: map.get("STORE_UPI_ID")?.trim() || DEFAULT_PAYMENT_SETTINGS.storeUpiId,
    storeUpiName: map.get("STORE_UPI_NAME")?.trim() || DEFAULT_PAYMENT_SETTINGS.storeUpiName,
    storeUpiQrImage: map.get("STORE_UPI_QR_IMAGE")?.trim() || "",
    storeUpiInstructions:
      map.get("STORE_UPI_INSTRUCTIONS")?.trim() ||
      DEFAULT_PAYMENT_SETTINGS.storeUpiInstructions,
    razorpayAvailable,
  };
}

/**
 * Updates payment settings in the `Setting` collection with upsert.
 */
export async function updateStorePaymentSettings(
  updates: Partial<Omit<StorePaymentSettings, "razorpayAvailable">>,
): Promise<void> {
  await connectDB();

  const operations: Array<{
    updateOne: {
      filter: { key: string };
      update: { $set: { value: string; description?: string } };
      upsert: true;
    };
  }> = [];

  if (updates.manualUpiEnabled !== undefined) {
    operations.push({
      updateOne: {
        filter: { key: "MANUAL_UPI_ENABLED" },
        update: {
          $set: {
            value: updates.manualUpiEnabled ? "true" : "false",
            description: "Toggle whether manual UPI payment method is active at checkout",
          },
        },
        upsert: true,
      },
    });
  }

  if (updates.storeUpiId !== undefined) {
    operations.push({
      updateOne: {
        filter: { key: "STORE_UPI_ID" },
        update: {
          $set: {
            value: updates.storeUpiId.trim(),
            description: "Store primary UPI ID / Virtual Payment Address (e.g. malliandco@okaxis)",
          },
        },
        upsert: true,
      },
    });
  }

  if (updates.storeUpiName !== undefined) {
    operations.push({
      updateOne: {
        filter: { key: "STORE_UPI_NAME" },
        update: {
          $set: {
            value: updates.storeUpiName.trim(),
            description: "Store payee business name displayed in UPI apps",
          },
        },
        upsert: true,
      },
    });
  }

  if (updates.storeUpiQrImage !== undefined) {
    operations.push({
      updateOne: {
        filter: { key: "STORE_UPI_QR_IMAGE" },
        update: {
          $set: {
            value: updates.storeUpiQrImage.trim(),
            description: "Optional URL to store physical standee / scanner QR code image",
          },
        },
        upsert: true,
      },
    });
  }

  if (updates.storeUpiInstructions !== undefined) {
    operations.push({
      updateOne: {
        filter: { key: "STORE_UPI_INSTRUCTIONS" },
        update: {
          $set: {
            value: updates.storeUpiInstructions.trim(),
            description: "Instructions shown to customers at checkout for manual UPI payment",
          },
        },
        upsert: true,
      },
    });
  }

  if (operations.length > 0) {
    await Setting.bulkWrite(operations);
  }
}

