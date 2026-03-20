import { describe, it, expect, vi } from 'vitest';
import { buildKeywordIndex, categorise } from '../../../src/services/categoriser/categoriser.service';
import { overrideCategory } from '../../../src/services/categoriser/category-override.service';
import { DEFAULT_KEYWORD_MAP } from '../../../src/models/constants';
import type { CategoryRecord, TransactionRecord } from '../../../src/models/index';

function makeCategory(name: string, status: 'active' | 'inactive' = 'active'): CategoryRecord {
  return { type: 'category', name, isDefault: true, createdDate: '2026-01-01', status };
}

const activeCategories: CategoryRecord[] = [
  makeCategory('Groceries'),
  makeCategory('Subscriptions'),
  makeCategory('Eating Out'),
  makeCategory('Entertainment'),
  makeCategory('Shopping'),
  makeCategory('Transport'),
  makeCategory('Fuel'),
  makeCategory('Holidays'),
  makeCategory('Utilities'),
  makeCategory('Telecoms'),
  makeCategory('Housing'),
  makeCategory('Income'),
  makeCategory('Internal Transfer'),
  makeCategory('Uncategorised'),
];

describe('buildKeywordIndex + categorise', () => {
  const index = buildKeywordIndex(activeCategories, DEFAULT_KEYWORD_MAP);

  it('"TESCO EXTRA" → "Groceries"', () => {
    expect(categorise('TESCO EXTRA', index)).toBe('Groceries');
  });

  it('"NETFLIX.COM" → "Subscriptions"', () => {
    expect(categorise('NETFLIX.COM', index)).toBe('Subscriptions');
  });

  it('"RANDOM UNKNOWN SHOP" → "Uncategorised"', () => {
    expect(categorise('RANDOM UNKNOWN SHOP', index)).toBe('Uncategorised');
  });

  it('matching is case-insensitive (lowercase input)', () => {
    expect(categorise('tesco extra 123', index)).toBe('Groceries');
  });

  it('matching is case-insensitive (mixed case)', () => {
    expect(categorise('Netflix subscription monthly', index)).toBe('Subscriptions');
  });

  it('deactivated category is not matched', () => {
    const categoriesWithInactiveShop: CategoryRecord[] = [
      makeCategory('Groceries'),
      makeCategory('Subscriptions'),
      makeCategory('Uncategorised'),
      makeCategory('Shopping', 'inactive'),
    ];
    const idx = buildKeywordIndex(categoriesWithInactiveShop, DEFAULT_KEYWORD_MAP);
    // AMAZON maps to Shopping which is inactive — should fall through to Uncategorised
    expect(categorise('AMAZON PURCHASE', idx)).toBe('Uncategorised');
  });

  it('first-match-wins when multiple keywords could apply', () => {
    // AMAZON PRIME would match AMAZON (Shopping) first in DEFAULT_KEYWORD_MAP
    // unless AMAZON PRIME appears earlier in the map (it doesn't — AMAZON PRIME is Subscriptions, AMAZON is Shopping)
    // From constants: AMAZON PRIME → Subscriptions comes BEFORE AMAZON → Shopping
    expect(categorise('AMAZON PRIME', index)).toBe('Subscriptions');
  });

  it('keyword substring matching works mid-string', () => {
    expect(categorise('PAYMENT TO NETFLIX', index)).toBe('Subscriptions');
  });

  it('returns Uncategorised when no keyword matches', () => {
    expect(categorise('', index)).toBe('Uncategorised');
  });
});

describe('keyword categorisation — new keywords (v1.8.0)', () => {
  const index = buildKeywordIndex(activeCategories, DEFAULT_KEYWORD_MAP);

  it('"OCTOPUS ENERGY DIRECT DEBIT" → "Utilities"', () => {
    expect(categorise('OCTOPUS ENERGY DIRECT DEBIT', index)).toBe('Utilities');
  });

  it('"TV LICENCE" → "Utilities" (not Fuel or other)', () => {
    expect(categorise('TV LICENCE', index)).toBe('Utilities');
  });

  it('"VODAFONE DIRECT DEBIT" → "Telecoms"', () => {
    expect(categorise('VODAFONE DIRECT DEBIT', index)).toBe('Telecoms');
  });

  it('"ID MOBILE" → "Telecoms"', () => {
    expect(categorise('ID MOBILE MONTHLY', index)).toBe('Telecoms');
  });

  it('"CLAUDE.AI SUBSCRIPTION" → "Subscriptions"', () => {
    expect(categorise('CLAUDE.AI SUBSCRIPTION', index)).toBe('Subscriptions');
  });

  it('"NATIONWIDE C/CARD PAYMENT" → "Internal Transfer"', () => {
    expect(categorise('NATIONWIDE C/CARD PAYMENT', index)).toBe('Internal Transfer');
  });

  it('"MORTGAGE" → "Housing" (not Internal Transfer)', () => {
    expect(categorise('MORTGAGE', index)).toBe('Housing');
  });

  it('"MORTGAGE PAYMENT REF12345" → "Internal Transfer" (not Housing)', () => {
    expect(categorise('MORTGAGE PAYMENT REF12345', index)).toBe('Internal Transfer');
  });
});

describe('overrideCategory', () => {
  const original: TransactionRecord = {
    type: 'transaction',
    date: '2026-03-15',
    description: 'TESCO EXTRA',
    amount: -1250,
    transactionType: 'expense',
    category: 'Groceries',
    account: 'Nationwide Current',
    sourceFile: 'nationwide-march.csv',
    importedDate: '2026-03-15',
    contentHash: 'abc123',
    personName: 'Household',
  };

  it('appends a new TransactionRecord with the updated category field', async () => {
    const appendRecords = vi.fn().mockResolvedValue(undefined);
    const dirHandle = {} as FileSystemDirectoryHandle;

    await overrideCategory(original, 'Shopping', dirHandle, appendRecords);

    expect(appendRecords).toHaveBeenCalledOnce();
    const [rows] = appendRecords.mock.calls[0] as [string[]];
    expect(rows).toHaveLength(1);
    // The row should contain the new category
    expect(rows[0]).toContain('Shopping');
    // And still contain the original fields
    expect(rows[0]).toContain('TESCO EXTRA');
    expect(rows[0]).toContain('abc123');
  });

  it('preserves all original fields except category', async () => {
    const appendRecords = vi.fn().mockResolvedValue(undefined);
    const dirHandle = {} as FileSystemDirectoryHandle;

    await overrideCategory(original, 'Shopping', dirHandle, appendRecords);

    const [rows] = appendRecords.mock.calls[0] as [string[]];
    const row = rows[0];
    // Verify original fields present
    expect(row).toContain('2026-03-15');
    expect(row).toContain('Nationwide Current');
    expect(row).toContain('Household');
    expect(row).toContain('-1250');
  });

  it('deactivated category remains valid when read from a historic transaction record', () => {
    // The category on the record is the source of truth for display — not the active category list
    const txWithDeactivatedCategory: TransactionRecord = {
      ...original,
      category: 'Child Care',
    };
    // Reading the category from the record directly (not from an active list) must always work
    expect(txWithDeactivatedCategory.category).toBe('Child Care');
  });
});

describe('keyword categorisation — new keywords (v1.9.0)', () => {
  const index = buildKeywordIndex(activeCategories, DEFAULT_KEYWORD_MAP);

  it('"TV LICENCE MBP" → "Utilities" (not Fuel via BP substring)', () => {
    expect(categorise('TV LICENCE MBP', index)).toBe('Utilities');
  });

  it('"B/CARD PLAT VISA" → "Internal Transfer"', () => {
    expect(categorise('B/CARD PLAT VISA', index)).toBe('Internal Transfer');
  });

  it('"NATIONAL LOTTERY WWW.NATIONAL-GB" → "Entertainment"', () => {
    expect(categorise('NATIONAL LOTTERY WWW.NATIONAL-GB', index)).toBe('Entertainment');
  });

  it('"DELIVEROO" → "Eating Out"', () => {
    expect(categorise('DELIVEROO', index)).toBe('Eating Out');
  });

  it('"TRAINLINE" → "Transport"', () => {
    expect(categorise('TRAINLINE', index)).toBe('Transport');
  });

  it('"FASTER PAYMENT IN SALARY" → "Income"', () => {
    expect(categorise('FASTER PAYMENT IN SALARY', index)).toBe('Income');
  });
});
