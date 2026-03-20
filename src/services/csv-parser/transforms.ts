import { parsePenceFromString } from '../../utils/pence';
import { parseDDMonYYYY, parseUKDate } from '../../utils/dates';
import type { ColumnTransform } from '../../models/index';

/**
 * Strips £ and parses to pence. Returns 0 for empty or unparseable input.
 * Handles:
 *  - Proper UTF-8 £ (U+00A3)
 *  - Windows-1252 £ decoded as replacement character (U+FFFD)
 *  - Surrounding quotes PapaParse may not have fully stripped
 *  - Comma thousands separators
 */
export function stripPound(s: string): number {
  if (!s) return 0;
  // Strip surrounding quotes
  const unquoted = s.trim().replace(/^["']|["']$/g, '').trim();
  if (!unquoted) return 0;
  // Strip £ (U+00A3), U+FFFD (Windows-1252 £ mis-decoded as UTF-8), commas, whitespace
  const cleaned = unquoted.replace(/[£\uFFFD,\s]/g, '');
  if (!cleaned || cleaned === '-') return 0;
  const value = parseFloat(cleaned);
  if (isNaN(value)) return 0;
  return Math.round(value * 100);
}

/** Parses "15 Mar 2026" → "2026-03-15". Throws on invalid input. */
export function parseDDMonYYYYTransform(s: string): string {
  const result = parseDDMonYYYY(s);
  if (!result) throw new Error(`Cannot parse date: "${s}"`);
  return result;
}

/** Parses "15/03/2026" → "2026-03-15". Throws on invalid input. */
export function parseUKDateTransform(s: string): string {
  const result = parseUKDate(s);
  if (!result) throw new Error(`Cannot parse date: "${s}"`);
  return result;
}

/** Parses string as pence and returns the absolute value. */
export function absAmount(s: string): number {
  return Math.abs(parsePenceFromString(s));
}

/** Parses string as pence and negates the result. */
export function negateAmount(s: string): number {
  return -parsePenceFromString(s);
}

/**
 * Merges split paidOut/paidIn columns into a single signed amount with transactionType.
 * Convention: paidOut (expense) → negative amount; paidIn (income) → positive amount.
 */
export function mergeAmountColumns(opts: {
  paidOut: number;
  paidIn: number;
}): { amount: number; transactionType: 'expense' | 'income' } {
  if (opts.paidOut > 0) {
    return { amount: -opts.paidOut, transactionType: 'expense' };
  }
  return { amount: opts.paidIn, transactionType: 'income' };
}

/** Applies a named transform to a raw string CSV value. */
export function applyTransform(value: string, transform: ColumnTransform): string | number {
  switch (transform) {
    case 'stripPound':
      return stripPound(value);
    case 'parseDDMonYYYY':
      return parseDDMonYYYYTransform(value);
    case 'parseUKDate':
      return parseUKDateTransform(value);
    case 'absAmount':
      return absAmount(value);
    case 'negateAmount':
      return negateAmount(value);
  }
}
