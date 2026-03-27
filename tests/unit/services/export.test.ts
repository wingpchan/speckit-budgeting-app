import { describe, it, expect } from 'vitest';
import { buildExportCsv } from '../../../src/services/export/export.service';
import type { TransactionRecord, BudgetRecord } from '../../../src/models/index';

function makeTx(overrides: Partial<TransactionRecord> = {}): TransactionRecord {
  return {
    type: 'transaction',
    date: '2026-01-10',
    description: 'Tesco',
    amount: -2500,
    transactionType: 'expense',
    category: 'Groceries',
    account: 'Current',
    sourceFile: 'bank.csv',
    importedDate: '2026-01-11',
    contentHash: 'abc',
    personName: 'Alice',
    ...overrides,
  };
}

function makeBudget(overrides: Partial<BudgetRecord> = {}): BudgetRecord {
  return {
    type: 'budget',
    month: '2026-01',
    category: 'Groceries',
    amount: 30000,
    setDate: '2026-01-01T00:00:00.000Z',
    reason: 'Monthly grocery budget',
    ...overrides,
  };
}

const txs: TransactionRecord[] = [
  makeTx({ contentHash: 'a' }),
  makeTx({
    contentHash: 'b',
    date: '2026-01-15',
    description: 'Salary',
    amount: 300000,
    transactionType: 'income',
    category: 'Income',
    personName: 'Bob',
  }),
];

const budgets: BudgetRecord[] = [makeBudget()];

describe('buildExportCsv', () => {
  it('Section 1 contains correct transaction header and rows', () => {
    const csv = buildExportCsv(txs, [], { personBreakdown: false });
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('Date,Description,Amount,Type,Category,Account,Person');
    expect(lines[1]).toBe('2026-01-10,Tesco,-£25.00,expense,Groceries,Current,Alice');
    expect(lines[2]).toBe('2026-01-15,Salary,£3000.00,income,Income,Current,Bob');
  });

  it('Section 2 appears after a blank row separator with budget header and rows', () => {
    const csv = buildExportCsv(txs, budgets, { personBreakdown: false });
    const lines = csv.split('\r\n');
    const blankIdx = lines.findIndex((l, i) => i > 0 && l === '');
    expect(blankIdx).toBeGreaterThan(0);
    expect(lines[blankIdx + 1]).toBe('Category,Budget Amount,Effective Date,Reason');
    expect(lines[blankIdx + 2]).toContain('Groceries');
    expect(lines[blankIdx + 2]).toContain('£300.00');
  });

  it('Section 3 only appears when personBreakdown is true', () => {
    const csvNo = buildExportCsv(txs, [], { personBreakdown: false });
    const csvYes = buildExportCsv(txs, [], { personBreakdown: true });
    expect(csvNo).not.toContain('Person,Category,Total Spend');
    expect(csvYes).toContain('Person,Category,Total Spend');
  });

  it('Section 3 contains per-person per-category spend totals', () => {
    const csv = buildExportCsv(txs, [], { personBreakdown: true });
    expect(csv).toContain('Alice,Groceries,-£25.00');
    expect(csv).toContain('Bob,Income,£3000.00');
  });

  it('monetary values are formatted as pounds with two decimal places', () => {
    const csv = buildExportCsv(txs, budgets, { personBreakdown: false });
    expect(csv).toContain('-£25.00');
    expect(csv).toContain('£3000.00');
    expect(csv).toContain('£300.00');
  });

  it('handles empty transactions and budgets gracefully', () => {
    expect(() => buildExportCsv([], [], { personBreakdown: false })).not.toThrow();
    expect(() => buildExportCsv([], [], { personBreakdown: true })).not.toThrow();
    const csv = buildExportCsv([], [], { personBreakdown: false });
    expect(csv).toContain('Date,Description,Amount,Type,Category,Account,Person');
  });

  it('quotes fields containing commas per RFC 4180', () => {
    const tx = makeTx({ description: 'Tesco, Metro', contentHash: 'c' });
    const csv = buildExportCsv([tx], [], { personBreakdown: false });
    expect(csv).toContain('"Tesco, Metro"');
  });
});
