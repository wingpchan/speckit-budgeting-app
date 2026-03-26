import type { BudgetRecord } from '../../models/index';
import { serialiseRecord, appendRecords } from '../ledger/ledger-writer';

/**
 * Returns the previous YYYY-MM string (e.g. '2026-03' → '2026-02').
 */
function prevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

/**
 * Returns the current calendar month as YYYY-MM (UTC).
 */
function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Resolves the effective budget amount for a given month and category.
 * Resolution order:
 *   1. Latest record for (month, category)
 *   2. Latest record for (prevMonth, category)
 *   3. 0
 */
export function resolveBudget(
  month: string,
  category: string,
  records: BudgetRecord[],
): number {
  const forCategory = records.filter((r) => r.category === category);
  if (forCategory.length === 0) return 0;

  // Walk backwards month by month until we find a record or exhaust all records.
  // The furthest back we ever need to look is the oldest record's month.
  const oldestMonth = forCategory.reduce(
    (min, r) => (r.month < min ? r.month : min),
    forCategory[0].month,
  );

  let cursor = month;
  while (cursor >= oldestMonth) {
    const matches = forCategory.filter((r) => r.month === cursor);
    if (matches.length > 0) {
      const latest = matches.reduce((a, b) => (a.setDate >= b.setDate ? a : b));
      return latest.amount;
    }
    cursor = prevMonth(cursor);
  }

  return 0;
}

/**
 * Compares actual spend vs budget.
 */
export function getBudgetState(
  actual: number,
  budget: number,
): 'over' | 'under' | 'exact' {
  if (actual > budget) return 'over';
  if (actual < budget) return 'under';
  return 'exact';
}

/**
 * Appends a BudgetRecord to the master ledger.
 * Enforces non-empty reason for any month prior to the current calendar month.
 */
export async function saveBudget(
  month: string,
  category: string,
  amount: number,
  reason: string,
  dirHandle: FileSystemDirectoryHandle,
  appendFn?: (rows: string[]) => Promise<void>,
): Promise<void> {
  const cur = currentMonth();
  const isPast = month < cur;

  if (isPast && reason.trim() === '') {
    throw new Error(
      `A reason is required when editing the budget for a past month (${month}).`,
    );
  }

  const record: BudgetRecord = {
    type: 'budget',
    month,
    category,
    amount,
    setDate: new Date().toISOString(),
    ...(reason.trim() !== '' ? { reason: reason.trim() } : {}),
  };

  const row = serialiseRecord(record);
  if (appendFn) {
    await appendFn([row]);
  } else {
    await appendRecords(dirHandle, [row]);
  }
}

/**
 * Returns all BudgetRecords for a given category, sorted chronologically by setDate.
 */
export function getBudgetChanges(
  category: string,
  records: BudgetRecord[],
): BudgetRecord[] {
  return records
    .filter((r) => r.category === category)
    .sort((a, b) => a.setDate.localeCompare(b.setDate));
}
