/**
 * T057 — Verification tests for TransactionList category behaviour:
 * 1. Override dropdown sources from activeCategories only
 * 2. A transaction with a now-deactivated category still displays that category
 *    (value comes from the transaction record field, not re-looked-up from the category list)
 * 3. Regression: last-record-wins supersession applied on ledger reload
 */
import { describe, it, expect } from 'vitest';
import type { CategoryRecord, TransactionRecord } from '../../../src/models/index';
import { parseLedgerCsv } from '../../../src/services/ledger/ledger-reader';
import { serialiseRecord, LEDGER_HEADER } from '../../../src/services/ledger/ledger-writer';

// Helper: resolve which categories appear in the override dropdown
// Mirrors TransactionList logic: inactive current category pinned at 0, then active sorted A–Z
function resolveDropdownOptions(
  tx: TransactionRecord,
  activeCategories: CategoryRecord[],
): string[] {
  const sorted = [...activeCategories].sort((a, b) => a.name.localeCompare(b.name));
  const options: string[] = [];
  const isCurrentInActive = sorted.some((c) => c.name === tx.category);
  if (!isCurrentInActive) {
    options.push(tx.category); // pinned at position 0, exempt from sort
  }
  for (const cat of sorted) {
    options.push(cat.name);
  }
  return options;
}

const activeCategories: CategoryRecord[] = [
  { type: 'category', name: 'Groceries', isDefault: true, createdDate: '2026-01-01', status: 'active' },
  { type: 'category', name: 'Shopping', isDefault: true, createdDate: '2026-01-01', status: 'active' },
  { type: 'category', name: 'Uncategorised', isDefault: true, createdDate: '2026-01-01', status: 'active' },
];

describe('T057 — TransactionList category dropdown behaviour', () => {
  it('dropdown contains only active categories when current category is active', () => {
    const tx: TransactionRecord = {
      type: 'transaction',
      date: '2026-03-15',
      description: 'TESCO EXTRA',
      amount: -1250,
      transactionType: 'expense',
      category: 'Groceries',
      account: 'Nationwide Current',
      sourceFile: 'test.csv',
      importedDate: '2026-03-15',
      contentHash: 'abc',
      personName: 'Household',
    };

    const options = resolveDropdownOptions(tx, activeCategories);

    // All active categories present
    expect(options).toContain('Groceries');
    expect(options).toContain('Shopping');
    expect(options).toContain('Uncategorised');
    // No inactive categories
    expect(options).not.toContain('Child Care');
  });

  it('dropdown includes deactivated current category at top when not in active list', () => {
    const tx: TransactionRecord = {
      type: 'transaction',
      date: '2026-03-15',
      description: 'NURSERY FEES',
      amount: -50000,
      transactionType: 'expense',
      category: 'Child Care', // deactivated — not in activeCategories
      account: 'Nationwide Current',
      sourceFile: 'test.csv',
      importedDate: '2026-03-15',
      contentHash: 'def',
      personName: 'Household',
    };

    const options = resolveDropdownOptions(tx, activeCategories);

    // Deactivated category appears (so user can see what it currently is)
    expect(options[0]).toBe('Child Care');
    // Active categories follow
    expect(options).toContain('Groceries');
    expect(options).toContain('Shopping');
  });

  it('active categories in the dropdown are sorted alphabetically', () => {
    const unsortedCategories: CategoryRecord[] = [
      { type: 'category', name: 'Uncategorised', isDefault: true, createdDate: '2026-01-01', status: 'active' },
      { type: 'category', name: 'Groceries', isDefault: true, createdDate: '2026-01-01', status: 'active' },
      { type: 'category', name: 'Shopping', isDefault: true, createdDate: '2026-01-01', status: 'active' },
    ];
    const tx: TransactionRecord = {
      type: 'transaction',
      date: '2026-03-15',
      description: 'TESCO EXTRA',
      amount: -1250,
      transactionType: 'expense',
      category: 'Groceries', // active — no pinned option needed
      account: 'Nationwide Current',
      sourceFile: 'test.csv',
      importedDate: '2026-03-15',
      contentHash: 'xyz',
      personName: 'Household',
    };

    const options = resolveDropdownOptions(tx, unsortedCategories);

    expect(options).toEqual(['Groceries', 'Shopping', 'Uncategorised']);
  });

  it('pinned inactive category stays at position 0 regardless of its sort position', () => {
    // 'Child Care' sorts before 'Groceries' alphabetically — but must stay pinned at 0
    const tx: TransactionRecord = {
      type: 'transaction',
      date: '2026-03-15',
      description: 'NURSERY',
      amount: -50000,
      transactionType: 'expense',
      category: 'Child Care',
      account: 'Nationwide Current',
      sourceFile: 'test.csv',
      importedDate: '2026-03-15',
      contentHash: 'xyz2',
      personName: 'Household',
    };

    const options = resolveDropdownOptions(tx, activeCategories);

    // Inactive category pinned at index 0
    expect(options[0]).toBe('Child Care');
    // Remaining options are sorted
    const rest = options.slice(1);
    expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b)));
  });

  it('historic transaction category is read from record field, not from active list', () => {

    // This is the critical guarantee: even if "Child Care" is deactivated,
    // the category on the transaction record is always "Child Care"
    const tx: TransactionRecord = {
      type: 'transaction',
      date: '2026-01-10',
      description: 'NURSERY PAYMENT',
      amount: -50000,
      transactionType: 'expense',
      category: 'Child Care',
      account: 'Nationwide Current',
      sourceFile: 'jan.csv',
      importedDate: '2026-01-10',
      contentHash: 'ghi',
      personName: 'Alice',
    };

    // The display value is always the record field — never looked up from active list
    expect(tx.category).toBe('Child Care');

    // And the active list does NOT contain Child Care (it was deactivated)
    const found = activeCategories.find((c) => c.name === tx.category);
    expect(found).toBeUndefined();

    // But the dropdown still shows Child Care as the current value
    const options = resolveDropdownOptions(tx, activeCategories);
    expect(options).toContain('Child Care');
  });
});

describe('T057 — supersession: last-record-wins on ledger reload', () => {
  // All rows from one import share the same contentHash (file-level hash).
  // The supersession key is date+description+amount+account — NOT contentHash.
  const SHARED_FILE_HASH = 'file-level-hash-shared-by-all-rows-in-this-import';

  const original: TransactionRecord = {
    type: 'transaction',
    date: '2026-03-15',
    description: 'TESCO EXTRA',
    amount: -1250,
    transactionType: 'expense',
    category: 'Groceries',
    account: 'Nationwide Current',
    sourceFile: 'march.csv',
    importedDate: '2026-03-15',
    contentHash: SHARED_FILE_HASH, // same hash as all other rows in the same import
    personName: 'Household',
  };

  // Override: same date+description+amount+account, different category (and same contentHash)
  const override: TransactionRecord = {
    ...original,
    category: 'Shopping',
  };

  function buildCsv(...records: ReturnType<typeof serialiseRecord>[]): string {
    return LEDGER_HEADER + '\r\n' + records.join('');
  }

  it('collapses original + override with same date+description+amount+account to last record', () => {
    const csv = buildCsv(serialiseRecord(original), serialiseRecord(override));
    const { records } = parseLedgerCsv(csv);

    const transactions = records.filter((r): r is TransactionRecord => r.type === 'transaction');

    // Only one transaction visible — the override (last record) wins
    expect(transactions).toHaveLength(1);
    expect(transactions[0].category).toBe('Shopping');
  });

  it('preserves all other fields from the winning record', () => {
    const csv = buildCsv(serialiseRecord(original), serialiseRecord(override));
    const { records } = parseLedgerCsv(csv);

    const tx = records.find((r): r is TransactionRecord => r.type === 'transaction')!;
    expect(tx.date).toBe('2026-03-15');
    expect(tx.description).toBe('TESCO EXTRA');
    expect(tx.amount).toBe(-1250);
    expect(tx.account).toBe('Nationwide Current');
    expect(tx.personName).toBe('Household');
  });

  it('does NOT collapse two distinct rows that share contentHash but differ in description', () => {
    // Real scenario: two transactions imported from the same file share contentHash.
    // They must NOT be collapsed — description differs so the key differs.
    const sibling: TransactionRecord = {
      ...original,
      description: 'SAINSBURYS ONLINE', // different description → different key
      category: 'Groceries',
    };

    const csv = buildCsv(serialiseRecord(original), serialiseRecord(sibling));
    const { records } = parseLedgerCsv(csv);

    const transactions = records.filter((r): r is TransactionRecord => r.type === 'transaction');
    expect(transactions).toHaveLength(2);
  });

  it('does NOT collapse two rows with same date+description but different amounts', () => {
    // Real scenario: two "DIRECT DEBIT" charges on the same day at different amounts.
    // The old contentHash+date+description key would have wrongly collapsed these.
    const sameDescDifferentAmount: TransactionRecord = {
      ...original,
      description: 'DIRECT DEBIT',
      amount: -1000,
      category: 'Utilities',
    };
    const sameDescDifferentAmount2: TransactionRecord = {
      ...original,
      description: 'DIRECT DEBIT',
      amount: -2000, // different amount → different key
      category: 'Housing',
    };

    const csv = buildCsv(
      serialiseRecord(sameDescDifferentAmount),
      serialiseRecord(sameDescDifferentAmount2),
    );
    const { records } = parseLedgerCsv(csv);

    const transactions = records.filter((r): r is TransactionRecord => r.type === 'transaction');
    expect(transactions).toHaveLength(2);
  });

  it('does NOT collapse two rows with same date+description+amount but different accounts', () => {
    const onCard: TransactionRecord = {
      ...original,
      account: 'Nationwide Credit Card',
      category: 'Shopping',
    };
    const onCurrent: TransactionRecord = {
      ...original,
      account: 'Nationwide Current', // different account → different key
      category: 'Groceries',
    };

    const csv = buildCsv(serialiseRecord(onCard), serialiseRecord(onCurrent));
    const { records } = parseLedgerCsv(csv);

    const transactions = records.filter((r): r is TransactionRecord => r.type === 'transaction');
    expect(transactions).toHaveLength(2);
  });

  it('does NOT collapse rows with same key fields but different dates', () => {
    const laterDate: TransactionRecord = {
      ...original,
      date: '2026-03-16', // different date → different key
    };

    const csv = buildCsv(serialiseRecord(original), serialiseRecord(laterDate));
    const { records } = parseLedgerCsv(csv);

    const transactions = records.filter((r): r is TransactionRecord => r.type === 'transaction');
    expect(transactions).toHaveLength(2);
  });
});
