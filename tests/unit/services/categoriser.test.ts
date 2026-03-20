import { describe, it, expect } from 'vitest';
import { buildKeywordIndex, categorise } from '../../../src/services/categoriser/categoriser.service';
import { DEFAULT_KEYWORD_MAP } from '../../../src/models/constants';
import type { CategoryRecord } from '../../../src/models/index';

function makeCategory(name: string, status: 'active' | 'inactive' = 'active'): CategoryRecord {
  return { type: 'category', name, isDefault: true, createdDate: '2026-01-01', status };
}

const activeCategories: CategoryRecord[] = [
  makeCategory('Groceries'),
  makeCategory('Subscriptions'),
  makeCategory('Eating Out'),
  makeCategory('Shopping'),
  makeCategory('Transport'),
  makeCategory('Holidays'),
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
