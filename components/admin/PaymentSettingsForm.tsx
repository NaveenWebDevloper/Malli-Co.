"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { QrCode } from "@/lib/qrcode";

interface PaymentSettings {
  manualUpiEnabled: boolean;
  storeUpiId: string;
  storeUpiName: string;
  storeUpiQrImage: string;
  storeUpiInstructions: string;
  razorpayAvailable: boolean;
}

export function PaymentSettingsForm() {
  const [settings, setSettings] = useState<PaymentSettings>({
    manualUpiEnabled: true,
    storeUpiId: "malliandco@okaxis",
    storeUpiName: "Malli & Co.",
    storeUpiQrImage: "",
    storeUpiInstructions:
      "1. Scan the QR code or copy the UPI ID into your GPay, PhonePe, Paytm, or BHIM app.\n2. Pay the exact order total.\n3. Enter the 12-digit UTR number or Transaction ID below to verify your order.",
    razorpayAvailable: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/admin/settings/payment");
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setSettings(data.settings);
          }
        }
      } catch (err) {
        console.error("Failed to load payment settings:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/settings/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manualUpiEnabled: settings.manualUpiEnabled,
          storeUpiId: settings.storeUpiId,
          storeUpiName: settings.storeUpiName,
          storeUpiQrImage: settings.storeUpiQrImage,
          storeUpiInstructions: settings.storeUpiInstructions,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update settings");
      }

      setFeedback({ type: "success", message: "Payment settings saved successfully!" });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save settings",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Image upload failed");
      }

      const imageUrl = data.url || data.asset?.url;
      if (imageUrl) {
        setSettings((prev) => ({ ...prev, storeUpiQrImage: imageUrl }));
        setFeedback({
          type: "success",
          message: "QR code image uploaded! Click 'Save Changes' to apply.",
        });
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to upload image",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Generate dynamic QR preview
  let previewSvg = "";
  try {
    const sampleUri = `upi://pay?pa=${settings.storeUpiId}&pn=${encodeURIComponent(
      settings.storeUpiName,
    )}&am=1499.00&cu=INR&tn=${encodeURIComponent("Sample Order")}`;
    const qr = QrCode.encodeText(sampleUri, "M");
    previewSvg = qr.toSvg(180, 2);
  } catch {
    previewSvg = "";
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900 animate-pulse">
        <div className="h-6 w-48 bg-neutral-200 rounded dark:bg-neutral-800 mb-4" />
        <div className="h-4 w-72 bg-neutral-100 rounded dark:bg-neutral-800 mb-6" />
        <div className="space-y-4">
          <div className="h-10 bg-neutral-100 rounded dark:bg-neutral-800" />
          <div className="h-10 bg-neutral-100 rounded dark:bg-neutral-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
      <div className="border-b border-neutral-100 px-6 py-5 dark:border-neutral-800 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <span>📲</span> Manual UPI Payment &amp; Scanner Settings
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Configure your store&apos;s UPI ID, QR scanner standee, and instructions for customer checkout.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.manualUpiEnabled}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, manualUpiEnabled: e.target.checked }))
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-emerald-600"></div>
          </label>
          <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            {settings.manualUpiEnabled ? "Active" : "Disabled"}
          </span>
        </div>
      </div>

      <form onSubmit={handleSave} className="p-6 space-y-6">
        {feedback && (
          <div
            className={`p-3.5 rounded-xl text-xs font-medium border ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800"
                : "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800"
            }`}
          >
            {feedback.message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Input Fields */}
          <div className="lg:col-span-7 space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                Primary UPI ID / VPA <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. malliandco@okaxis or your-mobile@paytm"
                value={settings.storeUpiId}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, storeUpiId: e.target.value }))
                }
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 focus:border-black focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 font-mono"
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                The Virtual Payment Address where customers will transfer funds.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                Payee / Store Business Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Malli & Co."
                value={settings.storeUpiName}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, storeUpiName: e.target.value }))
                }
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 focus:border-black focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                The name displayed on customer UPI confirmation screens (Google Pay, PhonePe, Paytm).
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                Physical Standee QR Scanner Image (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://... or upload below"
                  value={settings.storeUpiQrImage}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, storeUpiQrImage: e.target.value }))
                  }
                  className="flex-1 rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-xs text-neutral-900 focus:border-black focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 font-mono"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold transition dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50"
                >
                  {isUploading ? "Uploading..." : "Upload Photo"}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">
                If provided, customers can view your official printed scanner standee. If blank, a dynamic NPCI QR code is auto-generated.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-1.5">
                Customer Checkout Instructions
              </label>
              <textarea
                rows={3}
                value={settings.storeUpiInstructions}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, storeUpiInstructions: e.target.value }))
                }
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs text-neutral-900 focus:border-black focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>
          </div>

          {/* Right: Live Checkout Preview Card */}
          <div className="lg:col-span-5">
            <div className="rounded-xl border border-neutral-200 bg-[#FBF9F5] p-5 dark:border-neutral-800 dark:bg-neutral-800/40 space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                Live Storefront Preview
              </span>

              <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm text-center space-y-3 dark:border-neutral-700 dark:bg-neutral-900">
                <div className="inline-block p-2 bg-white rounded-xl shadow-inner border border-neutral-100">
                  {settings.storeUpiQrImage ? (
                    <div className="relative w-44 h-44 mx-auto rounded-lg overflow-hidden bg-neutral-100">
                      <Image
                        src={settings.storeUpiQrImage}
                        alt="Store QR Scanner"
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : previewSvg ? (
                    <div
                      className="w-44 h-44 mx-auto flex items-center justify-center"
                      dangerouslySetInnerHTML={{ __html: previewSvg }}
                    />
                  ) : (
                    <div className="w-44 h-44 bg-neutral-100 rounded-lg flex items-center justify-center text-xs text-neutral-400">
                      QR Preview
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    {settings.storeUpiName || "Malli & Co."}
                  </p>
                  <p className="text-[11px] font-mono text-neutral-500 mt-0.5">
                    {settings.storeUpiId || "malliandco@okaxis"}
                  </p>
                </div>

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-[10px] font-mono text-neutral-400 border border-dashed border-neutral-300 dark:border-neutral-700">
                    Enter 12-digit UTR / Ref No.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-xl bg-neutral-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-black transition dark:bg-white dark:text-black dark:hover:bg-neutral-200 disabled:opacity-50"
          >
            {isSaving ? "Saving Settings..." : "Save Payment Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}

