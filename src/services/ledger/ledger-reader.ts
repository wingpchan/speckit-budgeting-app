import Papa from 'papaparse';
import type {
  AllRecordTypes,
  MetaRecord,
  TransactionRecord,
  BudgetRecord,
  CategoryRecord,
  FormatProfileRecord,
  PersonRecord,
  AccountPersonMappingRecord,
} from '../../models/index';

interface RawRow {
  type: string;
  version: string;
  date: string;
  description: string;
  amount: string;
  transactionType: string;
  category: string;
  account: string;
  sourceFile: string;
  importedDate: string;
  contentHash: string;
  personName: string;
  month: string;
  setDate: string;
  reason: string;
  name: string;
  isDefault: string;
  createdDate: string;
  status: string;
  profileName: string;
  columnMappings: string;
  detectionHints: string;
  accountName: string;
  effectiveDate: string;
}

function parseBoolean(s: string): boolean {
  return s === 'true';
}

function parseRecord(raw: RawRow): AllRecordTypes | null {
  switch (raw.type) {
    case 'meta':
      return {
        type: 'meta',
        version: parseInt(raw.version, 10),
      } as MetaRecord;

    case 'transaction':
      return {
        type: 'transaction',
        date: raw.date,
        description: raw.description,
        amount: parseInt(raw.amount, 10),
        transactionType: raw.transactionType as 'expense' | 'income',
        category: raw.category,
        account: raw.account,
        sourceFile: raw.sourceFile,
        importedDate: raw.importedDate,
        contentHash: raw.contentHash,
        personName: raw.personName,
      } as TransactionRecord;

    case 'budget':
      return {
        type: 'budget',
        month: raw.month,
        category: raw.category,
        amount: parseInt(raw.amount, 10),
        setDate: raw.setDate,
        ...(raw.reason ? { reason: raw.reason } : {}),
      } as BudgetRecord;

    case 'category':
      return {
        type: 'category',
        name: raw.name,
        isDefault: parseBoolean(raw.isDefault),
        createdDate: raw.createdDate,
        status: raw.status as 'active' | 'inactive',
      } as CategoryRecord;

    case 'formatProfile':
      return {
        type: 'formatProfile',
        profileName: raw.profileName,
        columnMappings: JSON.parse(raw.columnMappings),
        detectionHints: JSON.parse(raw.detectionHints),
        createdDate: raw.createdDate,
      } as FormatProfileRecord;

    case 'person':
      return {
        type: 'person',
        name: raw.name,
        isDefault: parseBoolean(raw.isDefault),
        createdDate: raw.createdDate,
        status: raw.status as 'active' | 'inactive',
      } as PersonRecord;

    case 'accountPersonMapping':
      return {
        type: 'accountPersonMapping',
        accountName: raw.accountName,
        personName: raw.personName,
        effectiveDate: raw.effectiveDate,
      } as AccountPersonMappingRecord;

    default:
      return null;
  }
}

/**
 * Applies last-record-wins supersession for TransactionRecords.
 *
 * The composite key is `date + description + amount + account`.
 * `contentHash` is intentionally excluded: it is a SHA-256 of the entire imported
 * file, so every row from the same import batch shares the same hash and it cannot
 * serve as a per-row identifier.
 *
 * Later records in the append-only log (e.g. category overrides) supersede earlier
 * ones with the same key. Non-transaction records are returned unchanged and in
 * original order.
 */
function applyTransactionSupersession(records: AllRecordTypes[]): AllRecordTypes[] {
  // Pass 1: build a map from composite key → last-seen TransactionRecord
  const latestTx = new Map<string, TransactionRecord>();
  for (const record of records) {
    if (record.type === 'transaction') {
      const key = `${record.date}\0${record.description}\0${record.amount}\0${record.account}`;
      latestTx.set(key, record);
    }
  }

  // Pass 2: rebuild the list, replacing each transaction with the latest version
  // and skipping superseded duplicates (keep first occurrence slot, replace value)
  const seen = new Set<string>();
  const out: AllRecordTypes[] = [];

  for (const record of records) {
    if (record.type !== 'transaction') {
      out.push(record);
      continue;
    }
    const key = `${record.date}\0${record.description}\0${record.amount}\0${record.account}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(latestTx.get(key)!);
    }
    // subsequent rows with the same key are superseded — skip them
  }

  return out;
}

export function parseLedgerCsv(csvText: string): {
  version: number;
  records: AllRecordTypes[];
} {
  const result = Papa.parse<RawRow>(csvText, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
  });

  const rawRecords: AllRecordTypes[] = [];
  let version = 0;

  for (const raw of result.data) {
    const record = parseRecord(raw);
    if (record === null) continue;
    if (record.type === 'meta') {
      version = record.version;
    }
    rawRecords.push(record);
  }

  return { version, records: applyTransactionSupersession(rawRecords) };
}
