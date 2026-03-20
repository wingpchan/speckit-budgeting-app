import { describe, it, expect } from 'vitest';
import { parseLedgerCsv } from '../../../src/services/ledger/ledger-reader';
import { serialiseRecord, LEDGER_HEADER } from '../../../src/services/ledger/ledger-writer';
import type {
  MetaRecord,
  TransactionRecord,
  BudgetRecord,
  CategoryRecord,
  FormatProfileRecord,
  PersonRecord,
  AccountPersonMappingRecord,
} from '../../../src/models/index';

function buildCsv(...records: ReturnType<typeof serialiseRecord>[]): string {
  return LEDGER_HEADER + '\r\n' + records.join('');
}

describe('parseLedgerCsv', () => {
  it('parses the meta record and extracts version', () => {
    const meta: MetaRecord = { type: 'meta', version: 2 };
    const csv = buildCsv(serialiseRecord(meta));
    const result = parseLedgerCsv(csv);
    expect(result.version).toBe(2);
    expect(result.records).toHaveLength(1);
    const parsed = result.records[0] as MetaRecord;
    expect(parsed.type).toBe('meta');
    expect(parsed.version).toBe(2);
  });

  it('parses a transaction record', () => {
    const tx: TransactionRecord = {
      type: 'transaction',
      date: '2026-03-15',
      description: 'TESCO EXTRA',
      amount: -1250,
      transactionType: 'expense',
      category: 'Groceries',
      account: 'My Nationwide',
      sourceFile: 'march.csv',
      importedDate: '2026-03-20',
      contentHash: 'abc123def456',
      personName: 'Household',
    };
    const csv = buildCsv(serialiseRecord(tx));
    const result = parseLedgerCsv(csv);
    const parsed = result.records[0] as TransactionRecord;
    expect(parsed.type).toBe('transaction');
    expect(parsed.date).toBe('2026-03-15');
    expect(parsed.description).toBe('TESCO EXTRA');
    expect(parsed.amount).toBe(-1250);
    expect(parsed.transactionType).toBe('expense');
    expect(parsed.category).toBe('Groceries');
    expect(parsed.account).toBe('My Nationwide');
    expect(parsed.sourceFile).toBe('march.csv');
    expect(parsed.importedDate).toBe('2026-03-20');
    expect(parsed.contentHash).toBe('abc123def456');
    expect(parsed.personName).toBe('Household');
  });

  it('parses a budget record', () => {
    const budget: BudgetRecord = {
      type: 'budget',
      month: '2026-03',
      category: 'Housing',
      amount: 150000,
      setDate: '2026-03-01',
    };
    const csv = buildCsv(serialiseRecord(budget));
    const result = parseLedgerCsv(csv);
    const parsed = result.records[0] as BudgetRecord;
    expect(parsed.type).toBe('budget');
    expect(parsed.month).toBe('2026-03');
    expect(parsed.category).toBe('Housing');
    expect(parsed.amount).toBe(150000);
    expect(parsed.setDate).toBe('2026-03-01');
  });

  it('parses a category record', () => {
    const cat: CategoryRecord = {
      type: 'category',
      name: 'Groceries',
      isDefault: true,
      createdDate: '2026-03-19',
      status: 'active',
    };
    const csv = buildCsv(serialiseRecord(cat));
    const result = parseLedgerCsv(csv);
    const parsed = result.records[0] as CategoryRecord;
    expect(parsed.type).toBe('category');
    expect(parsed.name).toBe('Groceries');
    expect(parsed.isDefault).toBe(true);
    expect(parsed.createdDate).toBe('2026-03-19');
    expect(parsed.status).toBe('active');
  });

  it('parses a person record', () => {
    const person: PersonRecord = {
      type: 'person',
      name: 'Household',
      isDefault: true,
      createdDate: '2026-03-19',
      status: 'active',
    };
    const csv = buildCsv(serialiseRecord(person));
    const result = parseLedgerCsv(csv);
    const parsed = result.records[0] as PersonRecord;
    expect(parsed.type).toBe('person');
    expect(parsed.name).toBe('Household');
    expect(parsed.isDefault).toBe(true);
    expect(parsed.status).toBe('active');
  });

  it('parses an accountPersonMapping record', () => {
    const mapping: AccountPersonMappingRecord = {
      type: 'accountPersonMapping',
      accountName: 'My Nationwide',
      personName: 'Household',
      effectiveDate: '2026-03-01',
    };
    const csv = buildCsv(serialiseRecord(mapping));
    const result = parseLedgerCsv(csv);
    const parsed = result.records[0] as AccountPersonMappingRecord;
    expect(parsed.type).toBe('accountPersonMapping');
    expect(parsed.accountName).toBe('My Nationwide');
    expect(parsed.personName).toBe('Household');
    expect(parsed.effectiveDate).toBe('2026-03-01');
  });

  it('parses a formatProfile record with JSON fields', () => {
    const profile: FormatProfileRecord = {
      type: 'formatProfile',
      profileName: 'Test Profile',
      createdDate: '2026-03-19',
      columnMappings: [
        { sourceHeader: 'Date', canonicalField: 'date', transform: 'parseDDMonYYYY' },
      ],
      detectionHints: {
        metadataRowCount: 3,
        dateFormat: 'DD Mon YYYY',
        headerSignatures: ['Paid out'],
        confidenceThreshold: 0.8,
      },
    };
    const csv = buildCsv(serialiseRecord(profile));
    const result = parseLedgerCsv(csv);
    const parsed = result.records[0] as FormatProfileRecord;
    expect(parsed.type).toBe('formatProfile');
    expect(parsed.profileName).toBe('Test Profile');
    expect(parsed.createdDate).toBe('2026-03-19');
    expect(Array.isArray(parsed.columnMappings)).toBe(true);
    expect(parsed.columnMappings[0].sourceHeader).toBe('Date');
    expect(parsed.columnMappings[0].transform).toBe('parseDDMonYYYY');
    expect(parsed.detectionHints.metadataRowCount).toBe(3);
    expect(parsed.detectionHints.headerSignatures).toEqual(['Paid out']);
  });

  it('handles empty cells represented as consecutive delimiters', () => {
    const meta: MetaRecord = { type: 'meta', version: 2 };
    const csv = buildCsv(serialiseRecord(meta));
    // Verify the meta row has empty cells (commas without values between them)
    const rows = csv.split('\r\n').filter(Boolean);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toContain('meta,2,');
  });

  it('parses multiple record types from a single CSV', () => {
    const meta: MetaRecord = { type: 'meta', version: 2 };
    const person: PersonRecord = {
      type: 'person',
      name: 'Household',
      isDefault: true,
      createdDate: '2026-03-19',
      status: 'active',
    };
    const cat: CategoryRecord = {
      type: 'category',
      name: 'Groceries',
      isDefault: true,
      createdDate: '2026-03-19',
      status: 'active',
    };
    const csv = buildCsv(serialiseRecord(meta), serialiseRecord(person), serialiseRecord(cat));
    const result = parseLedgerCsv(csv);
    expect(result.records).toHaveLength(3);
    expect(result.version).toBe(2);
    expect(result.records[0].type).toBe('meta');
    expect(result.records[1].type).toBe('person');
    expect(result.records[2].type).toBe('category');
  });
});

describe('serialiseRecord round-trip', () => {
  it('round-trips a transaction record', () => {
    const tx: TransactionRecord = {
      type: 'transaction',
      date: '2026-03-15',
      description: 'TESCO EXTRA',
      amount: -1250,
      transactionType: 'expense',
      category: 'Groceries',
      account: 'My Nationwide',
      sourceFile: 'march.csv',
      importedDate: '2026-03-20',
      contentHash: 'abc123',
      personName: 'Household',
    };
    const row = serialiseRecord(tx);
    const csv = buildCsv(row);
    const result = parseLedgerCsv(csv);
    const parsed = result.records[0] as TransactionRecord;
    expect(parsed).toMatchObject(tx);
  });

  it('round-trips a formatProfile record with JSON fields', () => {
    const profile: FormatProfileRecord = {
      type: 'formatProfile',
      profileName: 'Test Profile',
      createdDate: '2026-03-19',
      columnMappings: [
        { sourceHeader: 'Date', canonicalField: 'date', transform: 'parseDDMonYYYY' },
        { sourceHeader: 'Amount', canonicalField: 'paidOut', transform: 'stripPound' },
      ],
      detectionHints: {
        metadataRowCount: 3,
        dateFormat: 'DD Mon YYYY',
        headerSignatures: ['Paid out', 'Paid in'],
        confidenceThreshold: 0.8,
      },
    };
    const row = serialiseRecord(profile);
    const csv = buildCsv(row);
    const result = parseLedgerCsv(csv);
    const parsed = result.records[0] as FormatProfileRecord;
    expect(parsed.profileName).toBe('Test Profile');
    expect(parsed.columnMappings).toHaveLength(2);
    expect(parsed.columnMappings[0].transform).toBe('parseDDMonYYYY');
    expect(parsed.detectionHints.headerSignatures).toEqual(['Paid out', 'Paid in']);
  });

  it('round-trips a category record', () => {
    const cat: CategoryRecord = {
      type: 'category',
      name: 'Groceries',
      isDefault: true,
      createdDate: '2026-03-19',
      status: 'active',
    };
    const row = serialiseRecord(cat);
    const csv = buildCsv(row);
    const result = parseLedgerCsv(csv);
    const parsed = result.records[0] as CategoryRecord;
    expect(parsed).toMatchObject(cat);
  });

  it('round-trips a transaction with commas in description (RFC 4180 quoting)', () => {
    const tx: TransactionRecord = {
      type: 'transaction',
      date: '2026-03-15',
      description: 'PAYMENT, REF 12345',
      amount: -500,
      transactionType: 'expense',
      category: 'Shopping',
      account: 'Card',
      sourceFile: 'file.csv',
      importedDate: '2026-03-20',
      contentHash: 'abc',
      personName: 'Household',
    };
    const row = serialiseRecord(tx);
    expect(row).toContain('"PAYMENT, REF 12345"');
    const csv = buildCsv(row);
    const result = parseLedgerCsv(csv);
    const parsed = result.records[0] as TransactionRecord;
    expect(parsed.description).toBe('PAYMENT, REF 12345');
  });

  it('serialised rows end with CRLF', () => {
    const meta: MetaRecord = { type: 'meta', version: 2 };
    const row = serialiseRecord(meta);
    expect(row.endsWith('\r\n')).toBe(true);
  });
});
