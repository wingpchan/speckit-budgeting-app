import type { TransactionRecord } from '../../models/index';
import { serialiseRecord } from '../ledger/ledger-writer';

/**
 * Appends corrected TransactionRecords for every record in `allTransactions`
 * whose description matches `description` (case-insensitive), setting each to
 * `newCategory`. All other fields are preserved unchanged.
 *
 * Batches all rows into a single append call for efficiency.
 */
export async function overrideCategoryAll(
  description: string,
  newCategory: string,
  allTransactions: TransactionRecord[],
  dirHandle: FileSystemDirectoryHandle,
  appendFn?: (rows: string[]) => Promise<void>,
): Promise<void> {
  const descLower = description.toLowerCase();
  const matching = allTransactions.filter(
    (tx) => tx.description.toLowerCase() === descLower,
  );
  if (matching.length === 0) return;
  const rows = matching.map((tx) => serialiseRecord({ ...tx, category: newCategory }));
  if (appendFn) {
    await appendFn(rows);
  } else {
    const { appendRecords } = await import('../ledger/ledger-writer');
    await appendRecords(dirHandle, rows);
  }
}

/**
 * Appends a new TransactionRecord to the ledger with an updated category.
 * All fields are copied from the original record; only `category` is replaced.
 *
 * Later records for the same transaction (matched by date + description + amount + account)
 * supersede earlier ones in all read operations.
 *
 * @param original       The original TransactionRecord to override
 * @param newCategory    The new category name to assign
 * @param dirHandle      FileSystem directory handle for the ledger
 * @param appendFn       Optional injection for ledger append (receives serialised rows)
 */
export async function overrideCategory(
  original: TransactionRecord,
  newCategory: string,
  dirHandle: FileSystemDirectoryHandle,
  appendFn?: (rows: string[]) => Promise<void>,
): Promise<void> {
  const overridden: TransactionRecord = {
    ...original,
    category: newCategory,
  };

  const row = serialiseRecord(overridden);

  if (appendFn) {
    await appendFn([row]);
  } else {
    const { appendRecords } = await import('../ledger/ledger-writer');
    await appendRecords(dirHandle, [row]);
  }
}
