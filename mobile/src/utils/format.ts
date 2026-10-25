/**
 * Formatting utilities for Indian Rupees (INR) and money handling.
 * All internal money values are integers in paise (1 INR = 100 paise).
 */

/**
 * Format an integer amount in paise to Indian Rupee text format (e.g., ₹1,500 or ₹1,50,000).
 * Uses the Indian numbering system (lakhs, crores).
 */
export function formatINR(paise: number, showSign: boolean = false): string {
  if (isNaN(paise) || paise === null || paise === undefined) {
    return '₹0';
  }

  const isNegative = paise < 0;
  const absPaise = Math.abs(Math.round(paise));
  const rupees = Math.floor(absPaise / 100);
  const remainderPaise = absPaise % 100;

  // Format integer rupees with Indian comma grouping (XX,XX,XXX)
  const rupeesStr = rupees.toString();
  let formattedRupees = '';

  if (rupeesStr.length <= 3) {
    formattedRupees = rupeesStr;
  } else {
    const lastThree = rupeesStr.substring(rupeesStr.length - 3);
    const otherDigits = rupeesStr.substring(0, rupeesStr.length - 3);
    const withCommas = otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    formattedRupees = `${withCommas},${lastThree}`;
  }

  let result = `₹${formattedRupees}`;
  if (remainderPaise > 0) {
    result += `.${remainderPaise.toString().padStart(2, '0')}`;
  }

  if (isNegative) {
    return `-${result}`;
  } else if (showSign && paise > 0) {
    return `+${result}`;
  }

  return result;
}

/**
 * Parses user rupee input (e.g., "5000" or "5000.50" or "5,000") into integer paise.
 */
export function parseINRToPaise(input: string): number {
  if (!input) return 0;
  // Remove currency symbols, spaces, commas
  const clean = input.replace(/[₹\s,]/g, '');
  const parsed = parseFloat(clean);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

/**
 * Formats an ISO or YYYY-MM-DD date into readable display text (e.g. "25 Oct 2026")
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString.includes('T') ? dateString : `${dateString}T00:00:00`);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}
