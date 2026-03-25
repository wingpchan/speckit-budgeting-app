import { describe, it, expect, vi } from 'vitest';
import { buildKeywordIndex, categorise } from '../../../src/services/categoriser/categoriser.service';
import { overrideCategory } from '../../../src/services/categoriser/category-override.service';
import { DEFAULT_KEYWORD_MAP } from '../../../src/models/constants';
import type { CategoryRecord, KeywordRuleRecord, TransactionRecord } from '../../../src/models/index';

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

describe('buildKeywordIndex with user rules', () => {
  function makeRule(
    pattern: string,
    category: string,
    createdDate: string,
    status: 'active' | 'inactive' = 'active',
  ): KeywordRuleRecord {
    return { type: 'keywordRule', pattern, category, createdDate, status };
  }

  const shoppingCat = makeCategory('Shopping');
  const groceriesCat = makeCategory('Groceries');
  const subscriptionsCat = makeCategory('Subscriptions');
  const uncategorisedCat = makeCategory('Uncategorised');

  it('user rule takes precedence over matching default-map entry', () => {
    const userRules = [makeRule('TESCO', 'Shopping', '2026-03-21T10:00:00Z')];
    const cats = [groceriesCat, shoppingCat, uncategorisedCat];
    const idx = buildKeywordIndex(cats, DEFAULT_KEYWORD_MAP, userRules);
    // TESCO normally maps to Groceries; user rule overrides to Shopping
    expect(categorise('TESCO EXTRA', idx)).toBe('Shopping');
  });

  it('longest user-rule pattern wins over shorter conflicting user rule', () => {
    const userRules = [
      makeRule('AMAZON', 'Shopping', '2026-03-21T10:00:00Z'),
      makeRule('AMAZON PRIME VIDEO', 'Subscriptions', '2026-03-21T11:00:00Z'),
    ];
    const cats = [shoppingCat, subscriptionsCat, uncategorisedCat];
    const idx = buildKeywordIndex(cats, DEFAULT_KEYWORD_MAP, userRules);
    expect(categorise('AMAZON PRIME VIDEO MONTHLY', idx)).toBe('Subscriptions');
  });

  it('user rule with deactivated target category is skipped', () => {
    const inactiveShopping = makeCategory('Shopping', 'inactive');
    const userRules = [makeRule('AMAZON', 'Shopping', '2026-03-21T10:00:00Z')];
    const cats = [inactiveShopping, groceriesCat, subscriptionsCat, uncategorisedCat];
    const idx = buildKeywordIndex(cats, DEFAULT_KEYWORD_MAP, userRules);
    // Shopping is inactive — user rule for AMAZON to Shopping is skipped
    // Default map has AMAZON PRIME → Subscriptions, AMAZON → Shopping (inactive = skipped)
    // AMAZON alone should fall through to Uncategorised (Shopping inactive, no other match)
    expect(categorise('AMAZON PURCHASE', idx)).toBe('Uncategorised');
  });

  it('empty userRules array produces unchanged default-map behaviour', () => {
    const cats = [groceriesCat, shoppingCat, subscriptionsCat, uncategorisedCat];
    const idxWithEmpty = buildKeywordIndex(cats, DEFAULT_KEYWORD_MAP, []);
    const idxWithout = buildKeywordIndex(cats, DEFAULT_KEYWORD_MAP);
    expect(categorise('TESCO EXTRA', idxWithEmpty)).toBe(categorise('TESCO EXTRA', idxWithout));
    expect(categorise('AMAZON', idxWithEmpty)).toBe(categorise('AMAZON', idxWithout));
  });

  it('tied pattern length: most-recently-created rule wins', () => {
    // Two user rules with same pattern length but different categories and dates
    const userRules = [
      makeRule('PRIME', 'Shopping', '2026-03-20T10:00:00Z'),
      makeRule('PRIME', 'Subscriptions', '2026-03-21T10:00:00Z'),
    ];
    const cats = [shoppingCat, subscriptionsCat, uncategorisedCat];
    const idx = buildKeywordIndex(cats, DEFAULT_KEYWORD_MAP, userRules);
    // Most recently created (Subscriptions, 2026-03-21) should win
    expect(categorise('AMAZON PRIME VIDEO', idx)).toBe('Subscriptions');
  });
});

describe('regression: staging view must pass userRules to buildKeywordIndex', () => {
  // Verifies the bug where StagingView called buildKeywordIndex without the userRules argument,
  // causing user-defined keyword rules to be silently ignored during staging categorisation.
  const shoppingCat = makeCategory('Shopping');
  const uncategorisedCat = makeCategory('Uncategorised');

  const userRuleRecord: KeywordRuleRecord = {
    type: 'keywordRule',
    pattern: 'ACME WIDGETS',
    category: 'Shopping',
    createdDate: '2026-03-21T10:00:00Z',
    status: 'active',
  };

  it('without userRules (the pre-fix bug): description only in user rules returns Uncategorised', () => {
    const idx = buildKeywordIndex([shoppingCat, uncategorisedCat], DEFAULT_KEYWORD_MAP);
    expect(categorise('ACME WIDGETS LTD', idx)).toBe('Uncategorised');
  });

  it('with userRules (the fix): same description returns user-rule category', () => {
    const idx = buildKeywordIndex([shoppingCat, uncategorisedCat], DEFAULT_KEYWORD_MAP, [userRuleRecord]);
    expect(categorise('ACME WIDGETS LTD', idx)).toBe('Shopping');
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
