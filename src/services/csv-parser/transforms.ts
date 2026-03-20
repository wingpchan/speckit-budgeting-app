import { parsePenceFromString } from '../../utils/pence';
import { parseDDMonYYYY, parseUKDate } from '../../utils/dates';
import type { ColumnTransform } from '../../models/index';

/** Strips £ and parses to pence. Empty string → 0. */
export function stripPound(s: string): number {
  if (!s || s.trim() === '') return 0;
  return parsePenceFromString(s);
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
