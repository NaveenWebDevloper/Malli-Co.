"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatCurrency, paiseToRupees } from "@/lib/currency";
import { COMPANY_GST_INFO } from "@/lib/constants";
import {
  calculateGSTBreakdown,
  amountInWordsINR,
} from "@/lib/order-transitions";

interface InvoiceData {
  _id: string;
  orderNumber: string;
  items: {
    nameSnapshot: string;
    skuSnapshot: string;
    basePricePaise?: number;
    compareAtPricePaise?: number;
    finalPricePaise?: number;
    discountAmountPaise?: number;
    campaignId?: string;
    campaignName?: string;
    priceSnapshotPaise: number;
    qty: number;
    optionsSnapshot?: Record<string, string>;
  }[];
  totals: {
    subtotalPaise: number;
    discountPaise: number;
    shippingPaise: number;
    taxPaise: number;
    totalPaise: number;
  };
  shippingAddress: {
    name: string;
    phone: string;
    street: string;
    landmark?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  paymentStatus: string;
  paymentDetails?: {
    razorpayPaymentId?: string;
  };
  createdAt: string;
}

export function InvoiceView({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<InvoiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`);
      if (!res.ok) {
        throw new Error("Failed to load invoice details");
      }
      const data = await res.json();
      setOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching order");
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-neutral-400">
        <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin mb-3" />
        <p className="text-sm">Preparing printable GST Tax Invoice...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-8 text-center text-red-500">
        <p>{error || "Invoice not found"}</p>
        <Link href="/admin/orders" className="text-xs font-semibold underline mt-2 inline-block">
          Return to Orders
        </Link>
      </div>
    );
  }

  const gst = calculateGSTBreakdown(
    order.shippingAddress.state,
    order.totals.taxPaise,
    order.totals.subtotalPaise,
  );

  const amountInWords = amountInWordsINR(paiseToRupees(order.totals.totalPaise));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Action Bar (Hidden in Print) */}
      <div className="print:hidden flex items-center justify-between bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl shadow-sm">
        <Link
          href={`/admin/orders/${order._id}`}
          className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          ← Back to Order #{order.orderNumber}
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 shadow-sm"
        >
          <span>🖨️ Print / Save as PDF</span>
        </button>
      </div>

      {/* Invoice Document Box */}
      <div className="bg-white text-neutral-900 border border-neutral-300 shadow-lg p-8 sm:p-12 print:p-0 print:border-none print:shadow-none print:text-black font-sans">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-neutral-900 pb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight uppercase">
              {COMPANY_GST_INFO.brandName}
            </h1>
            <p className="text-xs font-semibold text-neutral-700 mt-0.5">
              {COMPANY_GST_INFO.legalName}
            </p>
            <p className="text-[11px] text-neutral-600 max-w-sm mt-1">
              {COMPANY_GST_INFO.address}
            </p>
            <div className="mt-2 text-[11px] text-neutral-700 space-y-0.5 font-mono">
              <p>
                <strong>GSTIN:</strong> {COMPANY_GST_INFO.gstin}
              </p>
              <p>
                <strong>State & Code:</strong> {COMPANY_GST_INFO.state} ({COMPANY_GST_INFO.stateCode})
              </p>
              <p>
                <strong>CIN:</strong> {COMPANY_GST_INFO.cin}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-neutral-900 text-white font-bold text-xs uppercase tracking-widest rounded print:bg-black print:text-white">
              TAX INVOICE
            </span>
            <p className="text-[10px] text-neutral-500 italic mt-1">
              (Under Section 31 of CGST Act, 2017)
            </p>
            <div className="mt-3 text-xs space-y-1">
              <p>
                <span className="text-neutral-500">Invoice No:</span>{" "}
                <strong className="font-mono">INV-{order.orderNumber}</strong>
              </p>
              <p>
                <span className="text-neutral-500">Invoice Date:</span>{" "}
                <strong>
                  {new Date(order.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </strong>
              </p>
              <p>
                <span className="text-neutral-500">Order No:</span>{" "}
                <strong className="font-mono">#{order.orderNumber}</strong>
              </p>
              <p>
                <span className="text-neutral-500">Place of Supply:</span>{" "}
                <strong>{order.shippingAddress.state}</strong>
              </p>
              <p>
                <span className="text-neutral-500">Reverse Charge:</span>{" "}
                <strong>No</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Billed To / Shipped To Grid */}
        <div className="grid grid-cols-2 gap-8 py-6 border-b border-neutral-300 text-xs">
          <div>
            <h2 className="font-bold uppercase tracking-wider text-neutral-500 text-[10px] mb-2">
              Billed To & Shipped To:
            </h2>
            <p className="font-bold text-sm text-neutral-900">
              {order.shippingAddress.name}
            </p>
            <p className="text-neutral-700 mt-1">{order.shippingAddress.street}</p>
            {order.shippingAddress.landmark && (
              <p className="text-neutral-600">Landmark: {order.shippingAddress.landmark}</p>
            )}
            <p className="text-neutral-700">
              {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}
            </p>
            <p className="text-neutral-700">{order.shippingAddress.country || "India"}</p>
            <p className="mt-2 text-neutral-800 font-mono">
              <strong>Phone:</strong> {order.shippingAddress.phone}
            </p>
            <p className="text-neutral-500 font-mono text-[11px] mt-0.5">
              <strong>Customer GSTIN:</strong> URP (Unregistered Person)
            </p>
          </div>

          <div className="border-l border-neutral-200 pl-6">
            <h2 className="font-bold uppercase tracking-wider text-neutral-500 text-[10px] mb-2">
              Payment & Dispatch Info:
            </h2>
            <div className="space-y-1.5 text-neutral-700">
              <p>
                <span className="text-neutral-500">Payment Status:</span>{" "}
                <span className="font-bold uppercase text-emerald-700">
                  {order.paymentStatus}
                </span>
              </p>
              <p>
                <span className="text-neutral-500">Payment Gateway:</span> Razorpay Secure
              </p>
              {order.paymentDetails?.razorpayPaymentId && (
                <p>
                  <span className="text-neutral-500">Transaction ID:</span>{" "}
                  <span className="font-mono text-[11px]">
                    {order.paymentDetails.razorpayPaymentId}
                  </span>
                </p>
              )}
              <p>
                <span className="text-neutral-500">Dispatch Hub:</span> Central Warehouse, Hyderabad
              </p>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="py-6">
          <table className="w-full text-left text-xs border border-neutral-300">
            <thead className="bg-neutral-100 border-b border-neutral-300 text-[10px] font-bold uppercase tracking-wider text-neutral-700">
              <tr>
                <th className="p-2 w-7">#</th>
                <th className="p-2">Item Description & SKU</th>
                <th className="p-2 w-16 text-center">HSN</th>
                <th className="p-2 w-10 text-center">Qty</th>
                <th className="p-2 w-20 text-right">Base Price</th>
                <th className="p-2 w-20 text-right">Discount</th>
                <th className="p-2 w-20 text-right">Net Price</th>
                <th className="p-2 w-20 text-right">Taxable Val</th>
                <th className="p-2 w-20 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {order.items.map((item, idx) => {
                const basePricePaise = item.basePricePaise || item.priceSnapshotPaise;
                const finalPricePaise = item.finalPricePaise ?? item.priceSnapshotPaise;
                const discountPaise =
                  item.discountAmountPaise || Math.max(0, basePricePaise - finalPricePaise);
                const lineTotalPaise = finalPricePaise * item.qty;
                const lineTaxablePaise = Math.round((lineTotalPaise * 100) / 105);

                const optionsStr = item.optionsSnapshot
                  ? Object.entries(item.optionsSnapshot)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(", ")
                  : "";

                return (
                  <tr key={idx} className="align-top">
                    <td className="p-2 text-neutral-500">{idx + 1}</td>
                    <td className="p-2">
                      <p className="font-bold text-neutral-900">{item.nameSnapshot}</p>
                      <p className="font-mono text-[10px] text-neutral-500">
                        SKU: {item.skuSnapshot}
                        {optionsStr ? ` | ${optionsStr}` : ""}
                      </p>
                      {item.campaignName && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                          {item.campaignName}
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-center font-mono text-[11px] text-neutral-600">
                      {COMPANY_GST_INFO.defaultHsn}
                    </td>
                    <td className="p-2 text-center font-bold text-neutral-900">
                      {item.qty}
                    </td>
                    <td className="p-2 text-right font-mono">
                      {formatCurrency(basePricePaise)}
                    </td>
                    <td className="p-2 text-right font-mono text-emerald-700">
                      {discountPaise > 0 ? `-${formatCurrency(discountPaise)}` : "—"}
                    </td>
                    <td className="p-2 text-right font-mono font-medium text-neutral-900">
                      {formatCurrency(finalPricePaise)}
                    </td>
                    <td className="p-2 text-right font-mono">
                      {formatCurrency(lineTaxablePaise)}
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-neutral-900">
                      {formatCurrency(lineTotalPaise)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Tax Summary & Totals Breakdown */}
        <div className="grid grid-cols-2 gap-8 pt-2 pb-6 border-b border-neutral-300 text-xs">
          {/* Tax Breakup Table */}
          <div>
            <h3 className="font-bold uppercase tracking-wider text-[10px] text-neutral-500 mb-2">
              GST Tax Computation ({gst.isInterState ? "Inter-State / IGST" : "Intra-State / CGST + SGST"})
            </h3>
            <table className="w-full text-[11px] border border-neutral-200">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600">
                <tr>
                  <th className="p-1.5 text-left">Tax Component</th>
                  <th className="p-1.5 text-center">Rate</th>
                  <th className="p-1.5 text-right">Tax Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 font-mono">
                {gst.isInterState ? (
                  <tr>
                    <td className="p-1.5">Integrated GST (IGST)</td>
                    <td className="p-1.5 text-center">{gst.igstRate}%</td>
                    <td className="p-1.5 text-right">{formatCurrency(gst.igstPaise)}</td>
                  </tr>
                ) : (
                  <>
                    <tr>
                      <td className="p-1.5">Central GST (CGST)</td>
                      <td className="p-1.5 text-center">{gst.cgstRate}%</td>
                      <td className="p-1.5 text-right">{formatCurrency(gst.cgstPaise)}</td>
                    </tr>
                    <tr>
                      <td className="p-1.5">State GST (SGST)</td>
                      <td className="p-1.5 text-center">{gst.sgstRate}%</td>
                      <td className="p-1.5 text-right">{formatCurrency(gst.sgstPaise)}</td>
                    </tr>
                  </>
                )}
                <tr className="bg-neutral-50 font-bold">
                  <td className="p-1.5" colSpan={2}>
                    Total Tax Value
                  </td>
                  <td className="p-1.5 text-right">{formatCurrency(gst.totalTaxPaise)}</td>
                </tr>
              </tbody>
            </table>

            {/* Amount in words */}
            <div className="mt-4 p-3 bg-neutral-50 rounded border border-neutral-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                Invoice Total in Words:
              </span>
              <p className="font-serif italic font-bold text-neutral-800 text-xs mt-0.5">
                {amountInWords}
              </p>
            </div>
          </div>

          {/* Grand Totals */}
          <div className="space-y-2 text-right">
            <div className="flex justify-between text-neutral-600">
              <span>Gross Taxable Value:</span>
              <span className="font-mono">{formatCurrency(gst.taxablePaise)}</span>
            </div>
            {order.totals.discountPaise > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Promotional Discount:</span>
                <span className="font-mono">-{formatCurrency(order.totals.discountPaise)}</span>
              </div>
            )}
            <div className="flex justify-between text-neutral-600">
              <span>Shipping & Packaging:</span>
              <span className="font-mono">
                {order.totals.shippingPaise === 0
                  ? "FREE"
                  : formatCurrency(order.totals.shippingPaise)}
              </span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>GST Total (5% Included):</span>
              <span className="font-mono">{formatCurrency(order.totals.taxPaise)}</span>
            </div>
            <div className="flex justify-between text-base font-black text-neutral-900 border-t-2 border-neutral-900 pt-3">
              <span>Total Invoice Value:</span>
              <span className="font-mono">{formatCurrency(order.totals.totalPaise)}</span>
            </div>
          </div>
        </div>

        {/* Footer Declarations & Signatures */}
        <div className="pt-6 grid grid-cols-2 gap-8 text-[11px] text-neutral-600">
          <div>
            <h4 className="font-bold uppercase tracking-wider text-[10px] text-neutral-700 mb-1">
              Declaration
            </h4>
            <p className="leading-relaxed">
              We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. Goods once sold can be returned within 14 days subject to company terms.
            </p>
            <p className="mt-2 text-[10px] text-neutral-400">
              This is a computer generated invoice and requires no physical signature.
            </p>
          </div>

          <div className="text-right flex flex-col justify-between items-end">
            <div>
              <p className="font-bold text-neutral-800">
                For {COMPANY_GST_INFO.legalName}
              </p>
            </div>
            <div className="pt-8">
              <div className="border-t border-neutral-400 w-44 pt-1 text-center font-medium text-neutral-700">
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

