import type { TransactionRecord } from '../../models/index';
import type { ParsedRow } from '../csv-parser/types';

export interface ExactDuplicateResult {
  isDuplicate: boolean;
  priorImportDate: string | null;
}

export interface DateRangeOverlapResult {
  hasOverlap: boolean;
  overlapRange: { start: string; end: string } | null;
}

/**
 * Checks whether the given file hash matches any existing TransactionRecord.
 * Returns the importedDate of the first matching record.
 */
export function detectExactDuplicate(
  hash: string,
  records: TransactionRecord[],
): ExactDuplicateResult {
  const match = records.find((r) => r.contentHash === hash);
  if (match) {
    return { isDuplicate: true, priorImportDate: match.importedDate };
  }
  return { isDuplicate: false, priorImportDate: null };
}

/**
 * Checks whether the date range of the incoming batch overlaps with dates of
 * existing TransactionRecords for the same account.
 *
 * Overlap is defined as the intersection of:
 *   [min(newRows.date), max(newRows.date)]
 *   [min(existing.date), max(existing.date)]
 */
export function detectDateRangeOverlap(
  newRows: ParsedRow[],
  account: string,
  records: TransactionRecord[],
): DateRangeOverlapResult {
  if (newRows.length === 0) return { hasOverlap: false, overlapRange: null };

  const existingForAccount = records.filter((r) => r.account === account);
  if (existingForAccount.length === 0) return { hasOverlap: false, overlapRange: null };

  const newDates = newRows.map((r) => r.date).sort();
  const newStart = newDates[0];
  const newEnd = newDates[newDates.length - 1];

  const existingDates = existingForAccount.map((r) => r.date).sort();
  const existingStart = existingDates[0];
  const existingEnd = existingDates[existingDates.length - 1];

  // Compute intersection
  const overlapStart = newStart > existingStart ? newStart : existingStart;
  const overlapEnd = newEnd < existingEnd ? newEnd : existingEnd;

  if (overlapStart <= overlapEnd) {
    return {
      hasOverlap: true,
      overlapRange: { start: overlapStart, end: overlapEnd },
    };
  }

  return { hasOverlap: false, overlapRange: null };
}
