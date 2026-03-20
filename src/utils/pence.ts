/**
 * Parses a GBP string (e.g. "£12.50", "-£5.00", "12.50") into pence integer.
 * Strips £ symbol and commas before parsing.
 */
export function parsePenceFromString(s: string): number {
  const cleaned = s.replace(/[£,\s]/g, '');
  const value = parseFloat(cleaned);
  return Math.round(value * 100);
}

/**
 * Formats a pence integer as a GBP string (e.g. 1250 → "£12.50", -500 → "-£5.00").
 */
export function formatPence(pence: number): string {
  if (pence < 0) {
    return `-£${(-pence / 100).toFixed(2)}`;
  }
  return `£${(pence / 100).toFixed(2)}`;
}
