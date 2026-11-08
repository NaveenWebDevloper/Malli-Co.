/**
 * Order Status Transitions and GST Calculations.
 * Pure business logic with zero database/server dependencies (safe for client and server).
 */

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "CONFIRMED"
  | "PACKED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURNED";

/**
 * Validated Order Status Transitions.
 * PENDING -> PAID / CONFIRMED / CANCELLED
 * PAID / CONFIRMED -> PACKED / CANCELLED
 * PACKED -> SHIPPED / CANCELLED
 * SHIPPED -> DELIVERED / CANCELLED / RETURNED
 * DELIVERED -> RETURNED
 * CANCELLED -> [] (Terminal)
 * RETURNED -> [] (Terminal)
 */
export const VALID_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PAID", "CONFIRMED", "CANCELLED"],
  PAID: ["PACKED", "CANCELLED"],
  CONFIRMED: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  CANCELLED: [],
  RETURNED: [],
};

export function isValidStatusTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus,
): boolean {
  if (currentStatus === newStatus) return false;
  const allowed = VALID_STATUS_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(newStatus) : false;
}

export function getAllowedNextStatuses(currentStatus: OrderStatus): OrderStatus[] {
  return VALID_STATUS_TRANSITIONS[currentStatus] || [];
}

export interface GSTBreakdown {
  taxablePaise: number;
  isInterState: boolean;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  totalTaxPaise: number;
}

/**
 * Computes GST breakdown (CGST+SGST for Intra-state Telangana; IGST for Inter-state)
 * Apparel GST is standard 5% (2.5% CGST + 2.5% SGST or 5% IGST) applied to discounted subtotal.
 */
export function calculateGSTBreakdown(
  customerState: string,
  totalTaxPaise: number,
  subtotalPaise: number,
): GSTBreakdown {
  const normalizedState = (customerState || "").trim().toLowerCase();
  const isInterState =
    normalizedState !== "telangana" &&
    normalizedState !== "ts" &&
    normalizedState !== "36";

  const effectiveTaxPaise =
    totalTaxPaise > 0 ? totalTaxPaise : Math.round(subtotalPaise * 0.05);

  if (isInterState) {
    return {
      taxablePaise: subtotalPaise,
      isInterState: true,
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: effectiveTaxPaise,
      cgstRate: 0,
      sgstRate: 0,
      igstRate: 5.0,
      totalTaxPaise: effectiveTaxPaise,
    };
  }

  const halfTax = Math.floor(effectiveTaxPaise / 2);
  const otherHalf = effectiveTaxPaise - halfTax;

  return {
    taxablePaise: subtotalPaise,
    isInterState: false,
    cgstPaise: halfTax,
    sgstPaise: otherHalf,
    igstPaise: 0,
    cgstRate: 2.5,
    sgstRate: 2.5,
    igstRate: 0,
    totalTaxPaise: effectiveTaxPaise,
  };
}

/**
 * Calculates refund amount for returned or cancelled order items.
 * Strictly refunds the price actually paid (finalPricePaise), never the current catalog price (Rule 1 & Rule 2).
 */
export function calculateItemRefundPaise(
  item: { finalPricePaise?: number; priceSnapshotPaise: number },
  qty: number,
): number {
  const unitPaidPaise = item.finalPricePaise ?? item.priceSnapshotPaise;
  return Math.max(0, unitPaidPaise * qty);
}

/**
 * Converts Indian Rupee amounts to Words (e.g. 2499 -> "Two Thousand Four Hundred Ninety Nine Rupees Only")
 */
export function amountInWordsINR(rupees: number): string {
  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = [
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertTwoDigits(n: number): string {
    if (n === 0) return "";
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    const unitPart = units[n % 10];
    return `${tens[Math.floor(n / 10)]}${unitPart ? ` ${unitPart}` : ""}`;
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = "";
    if (hundred > 0) res += `${units[hundred]} Hundred`;
    if (rest > 0) {
      if (res) res += " ";
      res += convertTwoDigits(rest);
    }
    return res;
  }

  const num = Math.floor(rupees);
  if (num === 0) return "Zero Rupees Only";

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const rest = num % 1000;

  const parts: string[] = [];
  if (crore > 0) parts.push(`${convertTwoDigits(crore)} Crore`);
  if (lakh > 0) parts.push(`${convertTwoDigits(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${convertTwoDigits(thousand)} Thousand`);
  if (rest > 0) parts.push(convertThreeDigits(rest));

  return `${parts.join(" ")} Rupees Only`;
}
