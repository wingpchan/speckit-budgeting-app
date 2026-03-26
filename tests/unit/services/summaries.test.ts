import { describe, it, expect } from 'vitest';
import {
  aggregateByPeriod,
  getComparablePeriods,
} from '../../../src/services/summaries/summary.service';
import type { TransactionRecord } from '../../../src/models/index';

// ── Helpers ────────────────────────────────────────────────────────────────

function tx(
  date: string,
  amount: number,
  category: string,
  personName = 'Household',
): TransactionRecord {
  return {
    type: 'transaction',
    date,
    description: `Transaction on ${date}`,
    amount,
    transactionType: amount >= 0 ? 'income' : 'expense',
    category,
    account: 'Current',
    sourceFile: 'test.csv',
    importedDate: '2026-01-01T00:00:00.000Z',
    contentHash: `${date}-${amount}-${category}`,
    personName,
  };
}

// ── aggregateByPeriod — monthly ───────────────────────────────────────────

describe('aggregateByPeriod monthly', () => {
  const records = [
    tx('2026-03-15', -5000, 'Groceries'),
    tx('2026-03-20', -3000, 'Dining'),
    tx('2026-03-25', 10000, 'Salary'),
    tx('2026-02-10', -4000, 'Groceries'),
  ];

  const summaries = aggregateByPeriod(records, 'monthly');

  it('produces one bucket per month', () => {
    expect(summaries).toHaveLength(2);
  });

  it('uses YYYY-MM as periodKey', () => {
    const keys = summaries.map((s) => s.periodKey);
    expect(keys).toContain('2026-02');
    expect(keys).toContain('2026-03');
  });

  it('sums totalIncome (positive amounts only)', () => {
    const mar = summaries.find((s) => s.periodKey === '2026-03')!;
    expect(mar.totalIncome).toBe(10000);
    const feb = summaries.find((s) => s.periodKey === '2026-02')!;
    expect(feb.totalIncome).toBe(0);
  });

  it('sums totalExpenses (sum of negative amounts, stored as negative)', () => {
    const mar = summaries.find((s) => s.periodKey === '2026-03')!;
    expect(mar.totalExpenses).toBe(-8000);
    const feb = summaries.find((s) => s.periodKey === '2026-02')!;
    expect(feb.totalExpenses).toBe(-4000);
  });

  it('netPosition = totalIncome + totalExpenses', () => {
    const mar = summaries.find((s) => s.periodKey === '2026-03')!;
    expect(mar.netPosition).toBe(mar.totalIncome + mar.totalExpenses);
    expect(mar.netPosition).toBe(2000);
  });

  it('groups spend by category name (absolute values)', () => {
    const mar = summaries.find((s) => s.periodKey === '2026-03')!;
    expect(mar.byCategory['Groceries']).toBe(5000);
    expect(mar.byCategory['Dining']).toBe(3000);
    expect(mar.byCategory['Salary']).toBeUndefined();
  });

  it('returns summaries sorted by periodKey ascending', () => {
    expect(summaries[0].periodKey).toBe('2026-02');
    expect(summaries[1].periodKey).toBe('2026-03');
  });
});

// ── aggregateByPeriod — weekly ──────────────────────────────────────────

describe('aggregateByPeriod weekly', () => {
  // 2026-03-09 is Monday of ISO week 11
  // 2026-03-10 is Tuesday of ISO week 11
  // 2026-03-16 is Monday of ISO week 12
  const records = [
    tx('2026-03-09', -2000, 'Groceries'),
    tx('2026-03-10', -1000, 'Dining'),
    tx('2026-03-16', -3000, 'Groceries'),
  ];

  const summaries = aggregateByPeriod(records, 'weekly');

  it('groups Mon-Sun UTC dates into the same ISO week bucket', () => {
    expect(summaries).toHaveLength(2);
  });

  it('uses YYYY-Wnn as periodKey', () => {
    const keys = summaries.map((s) => s.periodKey);
    expect(keys).toContain('2026-W11');
    expect(keys).toContain('2026-W12');
  });

  it('correctly sums amounts within a week', () => {
    const w11 = summaries.find((s) => s.periodKey === '2026-W11')!;
    expect(w11.totalExpenses).toBe(-3000);
    expect(w11.byCategory['Groceries']).toBe(2000);
    expect(w11.byCategory['Dining']).toBe(1000);
  });
});

// ── aggregateByPeriod — yearly ──────────────────────────────────────────

describe('aggregateByPeriod yearly', () => {
  const records = [
    tx('2025-06-01', -8000, 'Groceries'),
    tx('2026-01-15', 50000, 'Salary'),
    tx('2026-03-20', -12000, 'Dining'),
  ];

  const summaries = aggregateByPeriod(records, 'yearly');

  it('groups by YYYY', () => {
    expect(summaries).toHaveLength(2);
    expect(summaries.map((s) => s.periodKey)).toEqual(['2025', '2026']);
  });

  it('correctly totals income and expenses per year', () => {
    const y2026 = summaries.find((s) => s.periodKey === '2026')!;
    expect(y2026.totalIncome).toBe(50000);
    expect(y2026.totalExpenses).toBe(-12000);
    expect(y2026.netPosition).toBe(38000);
  });
});

// ── aggregateByPeriod — edge cases ─────────────────────────────────────

describe('aggregateByPeriod edge cases', () => {
  it('returns empty array for empty records', () => {
    expect(aggregateByPeriod([], 'monthly')).toEqual([]);
  });

  it('income-only period has totalExpenses === 0', () => {
    const [summary] = aggregateByPeriod([tx('2026-03-01', 5000, 'Salary')], 'monthly');
    expect(summary.totalExpenses).toBe(0);
    expect(summary.byCategory).toEqual({});
  });
});

// ── getComparablePeriods ─────────────────────────────────────────────────

describe('getComparablePeriods monthly', () => {
  it('returns null when records are empty', () => {
    expect(getComparablePeriods([], 'monthly')).toBeNull();
  });

  it('returns null when all records fall within a single year', () => {
    const records = [
      tx('2026-01-15', -5000, 'Groceries'),
      tx('2026-03-10', -4000, 'Dining'),
    ];
    expect(getComparablePeriods(records, 'monthly')).toBeNull();
  });

  it('returns non-null when same month exists in two different years', () => {
    const records = [
      tx('2026-03-15', -5000, 'Groceries'),
      tx('2025-03-10', -4000, 'Groceries'),
    ];
    const result = getComparablePeriods(records, 'monthly');
    expect(result).not.toBeNull();
    expect(result!.length).toBeGreaterThanOrEqual(1);
  });

  it('returns ComparablePeriod with current/previous PeriodSummary and label', () => {
    const records = [
      tx('2026-03-15', -5000, 'Groceries'),
      tx('2025-03-10', -4000, 'Groceries'),
    ];
    const result = getComparablePeriods(records, 'monthly')!;
    const pair = result[0];
    expect(pair.current.periodKey).toBe('2026-03');
    expect(pair.previous.periodKey).toBe('2025-03');
    expect(pair.label).toContain('2026');
    expect(pair.label).toContain('2025');
  });
});

describe('getComparablePeriods yearly', () => {
  it('returns null when only one year of data', () => {
    const records = [tx('2026-03-01', -5000, 'Groceries')];
    expect(getComparablePeriods(records, 'yearly')).toBeNull();
  });

  it('returns non-null when two years of data exist', () => {
    const records = [
      tx('2026-03-01', -5000, 'Groceries'),
      tx('2025-03-01', -4000, 'Groceries'),
    ];
    const result = getComparablePeriods(records, 'yearly');
    expect(result).not.toBeNull();
    const pair = result![0];
    expect(pair.current.periodKey).toBe('2026');
    expect(pair.previous.periodKey).toBe('2025');
    expect(pair.label).toBe('2026 vs 2025');
  });
});

describe('getComparablePeriods weekly', () => {
  it('returns non-null when same ISO week exists in two years', () => {
    // 2026-03-09 = W11 2026, 2025-03-10 = W11 2025
    const records = [
      tx('2026-03-09', -2000, 'Groceries'),
      tx('2025-03-10', -1800, 'Groceries'),
    ];
    const result = getComparablePeriods(records, 'weekly');
    expect(result).not.toBeNull();
    const pair = result![0];
    expect(pair.current.periodKey).toBe('2026-W11');
    expect(pair.previous.periodKey).toBe('2025-W11');
  });

  it('returns null when weeks do not overlap across years', () => {
    // Only one year's worth of weekly data
    const records = [
      tx('2026-03-09', -2000, 'Groceries'),
      tx('2026-03-16', -1800, 'Dining'),
    ];
    expect(getComparablePeriods(records, 'weekly')).toBeNull();
  });
});
