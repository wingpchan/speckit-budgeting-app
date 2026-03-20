export type RecordType =
  | 'meta'
  | 'transaction'
  | 'budget'
  | 'category'
  | 'formatProfile'
  | 'person'
  | 'accountPersonMapping';

export interface MetaRecord {
  type: 'meta';
  version: number;
}

export interface TransactionRecord {
  type: 'transaction';
  date: string;
  description: string;
  amount: number;
  transactionType: 'expense' | 'income';
  category: string;
  account: string;
  sourceFile: string;
  importedDate: string;
  contentHash: string;
  personName: string;
}

export interface BudgetRecord {
  type: 'budget';
  month: string;
  category: string;
  amount: number;
  setDate: string;
  reason?: string;
}

export interface CategoryRecord {
  type: 'category';
  name: string;
  isDefault: boolean;
  createdDate: string;
  status: 'active' | 'inactive';
}

export type CanonicalField =
  | 'date'
  | 'description'
  | 'amount'
  | 'paidOut'
  | 'paidIn'
  | 'balance'
  | 'transactionType'
  | 'ignore';

export type ColumnTransform =
  | 'stripPound'
  | 'negateAmount'
  | 'absAmount'
  | 'parseDDMonYYYY'
  | 'parseUKDate'
  | 'parseISODate';

export interface ColumnMapping {
  sourceHeader: string;
  canonicalField: CanonicalField;
  transform?: ColumnTransform;
}

export interface DetectionHints {
  metadataRowCount: number;
  dateFormat: string;
  headerSignatures: string[];
  confidenceThreshold: number;
}

export interface FormatProfileRecord {
  type: 'formatProfile';
  profileName: string;
  columnMappings: ColumnMapping[];
  detectionHints: DetectionHints;
  createdDate: string;
}

export interface PersonRecord {
  type: 'person';
  name: string;
  isDefault: boolean;
  createdDate: string;
  status: 'active' | 'inactive';
}

export interface AccountPersonMappingRecord {
  type: 'accountPersonMapping';
  accountName: string;
  personName: string;
  effectiveDate: string;
}

export interface SessionState {
  dirHandle: FileSystemDirectoryHandle | null;
  ledgerHandleKey: string | null;
  dateFilter: {
    preset: 'weekly' | 'monthly' | 'yearly' | 'custom';
    start: string;
    end: string;
  };
  personFilter: string | null;
}

export type AllRecordTypes =
  | MetaRecord
  | TransactionRecord
  | BudgetRecord
  | CategoryRecord
  | FormatProfileRecord
  | PersonRecord
  | AccountPersonMappingRecord;
