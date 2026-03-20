import type { AccountPersonMappingRecord, TransactionRecord } from '../../models/index';
import type { ParsedRow } from '../csv-parser/types';
import { serialiseRecord } from './ledger-writer';
import { appendRecords } from './ledger-writer';

interface TransactionMeta {
  account: string;
  sourceFile: string;
  contentHash: string;
  importedDate: string;
  personName: string;
  category: string;
}

/**
 * Builds a TransactionRecord from a parsed row and import metadata.
 */
export function buildTransactionRecord(
  row: ParsedRow,
  meta: TransactionMeta,
): TransactionRecord {
  return {
    type: 'transaction',
    date: row.date,
    description: row.description,
    amount: row.amount,
    transactionType: row.transactionType,
    category: meta.category,
    account: meta.account,
    sourceFile: meta.sourceFile,
    importedDate: meta.importedDate,
    contentHash: meta.contentHash,
    personName: meta.personName,
  };
}

/**
 * Serialises and appends all transaction records to the ledger, optionally
 * preceded by a pending account-person mapping that was held in memory during
 * the import session.
 */
export async function commitImport(
  records: TransactionRecord[],
  dirHandle: FileSystemDirectoryHandle,
  pendingMapping: AccountPersonMappingRecord | null = null,
): Promise<void> {
  const rows: string[] = [];
  if (pendingMapping) rows.push(serialiseRecord(pendingMapping));
  for (const r of records) rows.push(serialiseRecord(r));
  await appendRecords(dirHandle, rows);
}
