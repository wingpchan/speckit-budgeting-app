const MONTH_ABBREVS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04',
  may: '05', jun: '06', jul: '07', aug: '08',
  sep: '09', oct: '10', nov: '11', dec: '12',
};

const MONTH_NAMES: Record<string, string> = {
  '01': 'January', '02': 'February', '03': 'March', '04': 'April',
  '05': 'May', '06': 'June', '07': 'July', '08': 'August',
  '09': 'September', '10': 'October', '11': 'November', '12': 'December',
};

/**
 * Parses "15 Mar 2026" → "2026-03-15". Returns null on invalid input.
 */
export function parseDDMonYYYY(s: string): string | null {
  if (!s) return null;
  const match = s.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (!match) return null;
  const day = match[1].padStart(2, '0');
  const month = MONTH_ABBREVS[match[2].toLowerCase()];
  if (!month) return null;
  const year = match[3];
  const iso = `${year}-${month}-${day}`;
  if (!isValidDate(iso)) return null;
  return iso;
}

/**
 * Parses "15/03/2026" → "2026-03-15". Returns null on invalid input.
 */
export function parseUKDate(s: string): string | null {
  if (!s) return null;
  const match = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const day = match[1].padStart(2, '0');
  const month = match[2].padStart(2, '0');
  const year = match[3];
  const iso = `${year}-${month}-${day}`;
  if (!isValidDate(iso)) return null;
  return iso;
}

/**
 * Returns the previous month string given "YYYY-MM". E.g. "2026-01" → "2025-12".
 */
export function getPrevMonth(yyyyMm: string): string {
  const [year, month] = yyyyMm.split('-').map(Number);
  if (month === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(month - 1).padStart(2, '0')}`;
}

/**
 * Formats "2026-03" → "March 2026".
 */
export function toMonthLabel(yyyyMm: string): string {
  const [year, month] = yyyyMm.split('-');
  const name = MONTH_NAMES[month];
  if (!name) return yyyyMm;
  return `${name} ${year}`;
}

/**
 * Validates a YYYY-MM-DD ISO date string.
 */
export function isValidDate(s: string): boolean {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s);
  if (isNaN(d.getTime())) return false;
  // Check the date didn't overflow (e.g. 2026-13-01)
  return d.toISOString().slice(0, 10) === s;
}

/**
 * Converts a Date object to "YYYY-MM-DD" using UTC.
 */
export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
