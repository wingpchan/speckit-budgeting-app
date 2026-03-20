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

export function parseLedgerCsv(csvText: string): {
  version: number;
  records: AllRecordTypes[];
} {
  const result = Papa.parse<RawRow>(csvText, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
  });

  const records: AllRecordTypes[] = [];
  let version = 0;

  for (const raw of result.data) {
    const record = parseRecord(raw);
    if (record === null) continue;
    if (record.type === 'meta') {
      version = record.version;
    }
    records.push(record);
  }

  return { version, records };
}
