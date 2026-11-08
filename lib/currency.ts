/**
 * Currency utilities for Malli & Co.
 * Complies with Rule 2:
 * - All monetary amounts stored strictly as integer paise.
 * - Zero floating-point math in database and business logic.
 * - UI formatting boundary only.
 */

/**
 * Converts a rupee amount (number or string e.g. "1499.50" or 1499) to integer paise.
 */
export function rupeesToPaise(rupees: number | string): number {
  if (typeof rupees === "string") {
    const sanitized = rupees.replace(/[^\d.]/g, "");
    const parsed = parseFloat(sanitized);
    if (isNaN(parsed)) return 0;
    return Math.round(parsed * 100);
  }
  if (isNaN(rupees)) return 0;
  return Math.round(rupees * 100);
}

/**
 * Converts integer paise to rupee floating representation for display.
 */
export function paiseToRupees(paise: number): number {
  if (isNaN(paise)) return 0;
  return paise / 100;
}

/**
 * Formats an integer paise amount into an Indian Rupee string (e.g. 149900 -> "₹1,499.00").
 */
export function formatCurrency(
  paise: number,
  options?: { includeDecimals?: boolean },
): string {
  const { includeDecimals = true } = options || {};
  const rupees = paiseToRupees(paise);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(rupees);
}
