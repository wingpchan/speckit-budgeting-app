import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  resolveBudget,
  getBudgetState,
  saveBudget,
  getBudgetChanges,
} from '../../../src/services/budget/budget.service';
import type { BudgetRecord } from '../../../src/models/index';

// ── resolveBudget ──────────────────────────────────────────────────────────

describe('resolveBudget', () => {
  const records: BudgetRecord[] = [
    {
      type: 'budget',
      month: '2026-02',
      category: 'Groceries',
      amount: 20000,
      setDate: '2026-02-01T10:00:00.000Z',
    },
    {
      type: 'budget',
      month: '2026-02',
      category: 'Groceries',
      amount: 22000,
      setDate: '2026-02-15T10:00:00.000Z',
    },
    {
      type: 'budget',
      month: '2026-03',
      category: 'Dining',
      amount: 15000,
      setDate: '2026-03-01T10:00:00.000Z',
    },
  ];

  it('returns the latest record amount for the exact month and category', () => {
    expect(resolveBudget('2026-02', 'Groceries', records)).toBe(22000);
  });

  it('uses latest setDate when multiple records exist for same month+category', () => {
    // The record with setDate '2026-02-15' wins over '2026-02-01'
    expect(resolveBudget('2026-02', 'Groceries', records)).toBe(22000);
  });

  it('falls back to previous month when no current-month record exists', () => {
    // No 2026-03 Groceries record → fall back to 2026-02 Groceries → 22000
    expect(resolveBudget('2026-03', 'Groceries', records)).toBe(22000);
  });

  it('returns 0 when no record exists for month or previous month', () => {
    expect(resolveBudget('2026-01', 'Groceries', records)).toBe(0);
  });

  it('returns 0 when records array is empty', () => {
    expect(resolveBudget('2026-03', 'Groceries', [])).toBe(0);
  });

  it('returns 0 for a category with no records at all', () => {
    expect(resolveBudget('2026-03', 'Shopping', records)).toBe(0);
  });

  it('does not bleed across categories', () => {
    // Dining has a 2026-03 record; Groceries should not pick it up
    expect(resolveBudget('2026-03', 'Dining', records)).toBe(15000);
    expect(resolveBudget('2026-03', 'Groceries', records)).toBe(22000); // fallback from Feb
  });

  it('walks back more than one month to find the nearest prior record', () => {
    // Only a Dec record exists; Jan has none; Feb should still find Dec
    const sparse: BudgetRecord[] = [
      {
        type: 'budget',
        month: '2025-12',
        category: 'Groceries',
        amount: 19000,
        setDate: '2025-12-01T10:00:00.000Z',
      },
    ];
    expect(resolveBudget('2026-01', 'Groceries', sparse)).toBe(19000); // one hop
    expect(resolveBudget('2026-02', 'Groceries', sparse)).toBe(19000); // two hops
    expect(resolveBudget('2026-06', 'Groceries', sparse)).toBe(19000); // six hops
  });

  it('returns 0 when no record exists anywhere before the requested month', () => {
    const sparse: BudgetRecord[] = [
      {
        type: 'budget',
        month: '2026-05',
        category: 'Groceries',
        amount: 20000,
        setDate: '2026-05-01T10:00:00.000Z',
      },
    ];
    // Requesting a month before the only record → nothing to fall back to
    expect(resolveBudget('2026-03', 'Groceries', sparse)).toBe(0);
  });
});

// ── getBudgetState ──────────────────────────────────────────────────────────

describe('getBudgetState', () => {
  it("returns 'over' when actual > budget", () => {
    expect(getBudgetState(22000, 20000)).toBe('over');
  });

  it("returns 'under' when actual < budget", () => {
    expect(getBudgetState(18000, 20000)).toBe('under');
  });

  it("returns 'exact' when actual === budget", () => {
    expect(getBudgetState(20000, 20000)).toBe('exact');
  });

  it("returns 'exact' when budget is 0 and actual is 0", () => {
    expect(getBudgetState(0, 0)).toBe('exact');
  });

  it("returns 'over' when actual is 1 pence over budget", () => {
    expect(getBudgetState(20001, 20000)).toBe('over');
  });

  it("returns 'under' when actual is 1 pence under budget", () => {
    expect(getBudgetState(19999, 20000)).toBe('under');
  });
});

// ── saveBudget ──────────────────────────────────────────────────────────────

describe('saveBudget', () => {
  const mockDirHandle = {} as FileSystemDirectoryHandle;
  const mockAppendFn = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-26T12:00:00.000Z'));
    mockAppendFn.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('saves a budget record for the current month without requiring a reason', async () => {
    await saveBudget('2026-03', 'Groceries', 25000, '', mockDirHandle, mockAppendFn);
    expect(mockAppendFn).toHaveBeenCalledOnce();
    const row: string = mockAppendFn.mock.calls[0][0][0];
    expect(row).toContain('budget');
    expect(row).toContain('2026-03');
    expect(row).toContain('Groceries');
    expect(row).toContain('25000');
  });

  it('saves a budget record for a future month without requiring a reason', async () => {
    await saveBudget('2026-04', 'Groceries', 25000, '', mockDirHandle, mockAppendFn);
    expect(mockAppendFn).toHaveBeenCalledOnce();
  });

  it('throws validation error when saving a past month with empty reason', async () => {
    await expect(
      saveBudget('2026-02', 'Groceries', 25000, '', mockDirHandle, mockAppendFn),
    ).rejects.toThrow();
    expect(mockAppendFn).not.toHaveBeenCalled();
  });

  it('throws validation error when past-month reason is whitespace only', async () => {
    await expect(
      saveBudget('2026-02', 'Groceries', 25000, '   ', mockDirHandle, mockAppendFn),
    ).rejects.toThrow();
    expect(mockAppendFn).not.toHaveBeenCalled();
  });

  it('saves a past-month budget record when a non-empty reason is provided', async () => {
    await saveBudget(
      '2026-02',
      'Groceries',
      20000,
      'Correcting entry',
      mockDirHandle,
      mockAppendFn,
    );
    expect(mockAppendFn).toHaveBeenCalledOnce();
    const row: string = mockAppendFn.mock.calls[0][0][0];
    expect(row).toContain('Correcting entry');
  });

  it('includes reason in the serialised row when provided for current month', async () => {
    await saveBudget('2026-03', 'Groceries', 25000, 'Revised upward', mockDirHandle, mockAppendFn);
    const row: string = mockAppendFn.mock.calls[0][0][0];
    expect(row).toContain('Revised upward');
  });

  it('falls back to appendRecords when no appendFn provided', async () => {
    // This test verifies the call signature only — actual FS calls are skipped in unit tests.
    // We simply confirm the promise rejects gracefully with a mock-free dirHandle.
    await expect(
      saveBudget('2026-03', 'Groceries', 25000, '', {} as FileSystemDirectoryHandle),
    ).rejects.toThrow(); // FS API not available in Node
  });
});

// ── getBudgetChanges ──────────────────────────────────────────────────────────

describe('getBudgetChanges', () => {
  const records: BudgetRecord[] = [
    {
      type: 'budget',
      month: '2026-01',
      category: 'Groceries',
      amount: 18000,
      setDate: '2026-01-01T10:00:00.000Z',
      reason: 'Initial',
    },
    {
      type: 'budget',
      month: '2026-02',
      category: 'Groceries',
      amount: 20000,
      setDate: '2026-02-01T10:00:00.000Z',
    },
    {
      type: 'budget',
      month: '2026-03',
      category: 'Dining',
      amount: 15000,
      setDate: '2026-03-01T10:00:00.000Z',
    },
    {
      type: 'budget',
      month: '2026-03',
      category: 'Groceries',
      amount: 25000,
      setDate: '2026-03-15T10:00:00.000Z',
    },
  ];

  it('returns all records for the given category in chronological order', () => {
    const changes = getBudgetChanges('Groceries', records);
    expect(changes).toHaveLength(3);
    expect(changes[0].month).toBe('2026-01');
    expect(changes[1].month).toBe('2026-02');
    expect(changes[2].month).toBe('2026-03');
  });

  it('does not include records for other categories', () => {
    const changes = getBudgetChanges('Groceries', records);
    expect(changes.every((r) => r.category === 'Groceries')).toBe(true);
  });

  it('returns empty array when category has no records', () => {
    expect(getBudgetChanges('Shopping', records)).toHaveLength(0);
  });

  it('returns empty array for empty records', () => {
    expect(getBudgetChanges('Groceries', [])).toHaveLength(0);
  });
});
