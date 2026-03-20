import type { TransactionRecord } from '../../models/index';
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
 * Serialises and appends all transaction records to the ledger.
 */
export async function commitImport(
  records: TransactionRecord[],
  dirHandle: FileSystemDirectoryHandle,
): Promise<void> {
  const rows = records.map((r) => serialiseRecord(r));
  await appendRecords(dirHandle, rows);
}
