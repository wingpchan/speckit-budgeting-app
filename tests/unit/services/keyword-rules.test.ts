import { describe, it, expect, vi } from 'vitest';
import {
  isDuplicateRule,
  saveKeywordRule,
  resolveKeywordRules,
  setKeywordRuleStatus,
} from '../../../src/services/categoriser/keyword-rules.service';
import type { KeywordRuleRecord, ResolvedKeywordRule } from '../../../src/models/index';

// ── isDuplicateRule ──────────────────────────────────────────────────────────

describe('isDuplicateRule', () => {
  const existing: ResolvedKeywordRule[] = [
    {
      pattern: 'AMAZON',
      category: 'Shopping',
      createdDate: '2026-03-21T10:00:00Z',
      status: 'active',
      categoryIsInactive: false,
    },
    {
      pattern: 'NETFLIX',
      category: 'Subscriptions',
      createdDate: '2026-03-21T11:00:00Z',
      status: 'inactive',
      categoryIsInactive: false,
    },
  ];

  it('returns true for exact-match active rule (same pattern, same category)', () => {
    expect(isDuplicateRule('AMAZON', 'Shopping', existing)).toBe(true);
  });

  it('is case-insensitive when comparing patterns', () => {
    expect(isDuplicateRule('amazon', 'Shopping', existing)).toBe(true);
    expect(isDuplicateRule('Amazon', 'Shopping', existing)).toBe(true);
  });

  it('returns false when category differs', () => {
    expect(isDuplicateRule('AMAZON', 'Electronics', existing)).toBe(false);
  });

  it('returns false for inactive rule even when pattern and category match', () => {
    expect(isDuplicateRule('NETFLIX', 'Subscriptions', existing)).toBe(false);
  });

  it('returns false when no rules exist', () => {
    expect(isDuplicateRule('TESCO', 'Groceries', [])).toBe(false);
  });
});

// ── saveKeywordRule ──────────────────────────────────────────────────────────

describe('saveKeywordRule', () => {
  it('appends a keywordRule record to the ledger via appendFn', async () => {
    const appendFn = vi.fn().mockResolvedValue(undefined);
    const dirHandle = {} as FileSystemDirectoryHandle;

    await saveKeywordRule('TESCO', 'Groceries', dirHandle, appendFn);

    expect(appendFn).toHaveBeenCalledOnce();
    const [rows] = appendFn.mock.calls[0] as [string[]];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain('keywordRule');
    expect(rows[0]).toContain('TESCO');
    expect(rows[0]).toContain('Groceries');
    expect(rows[0]).toContain('active');
  });

  it('saves a rule with status active', async () => {
    const appendFn = vi.fn().mockResolvedValue(undefined);
    const dirHandle = {} as FileSystemDirectoryHandle;

    await saveKeywordRule('AMAZON', 'Shopping', dirHandle, appendFn);

    const [rows] = appendFn.mock.calls[0] as [string[]];
    // The row should include 'active' (status) and 'keywordRule' (type)
    expect(rows[0]).toContain('active');
  });
});

// ── setKeywordRuleStatus ─────────────────────────────────────────────────────

describe('setKeywordRuleStatus', () => {
  it('appends a new record with inactive status without touching prior records', async () => {
    const appendFn = vi.fn().mockResolvedValue(undefined);
    const dirHandle = {} as FileSystemDirectoryHandle;

    await setKeywordRuleStatus('AMAZON', 'Shopping', 'inactive', dirHandle, appendFn);

    expect(appendFn).toHaveBeenCalledOnce();
    const [rows] = appendFn.mock.calls[0] as [string[]];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain('inactive');
    expect(rows[0]).toContain('AMAZON');
    expect(rows[0]).toContain('Shopping');
  });

  it('appends a new record with active status when reactivating', async () => {
    const appendFn = vi.fn().mockResolvedValue(undefined);
    const dirHandle = {} as FileSystemDirectoryHandle;

    await setKeywordRuleStatus('NETFLIX', 'Subscriptions', 'active', dirHandle, appendFn);

    const [rows] = appendFn.mock.calls[0] as [string[]];
    expect(rows[0]).toContain('active');
    expect(rows[0]).toContain('NETFLIX');
  });
});

// ── resolveKeywordRules ──────────────────────────────────────────────────────

describe('resolveKeywordRules', () => {
  it('returns empty array for no records', () => {
    expect(resolveKeywordRules([])).toEqual([]);
  });

  it('returns one resolved rule per unique lowercase pattern', () => {
    const records: KeywordRuleRecord[] = [
      { type: 'keywordRule', pattern: 'AMAZON', category: 'Shopping', createdDate: '2026-03-21T10:00:00Z', status: 'active' },
      { type: 'keywordRule', pattern: 'amazon', category: 'Shopping', createdDate: '2026-03-21T11:00:00Z', status: 'inactive' },
    ];
    const result = resolveKeywordRules(records);
    expect(result).toHaveLength(1);
  });

  it('most-recent createdDate wins within a pattern group', () => {
    const records: KeywordRuleRecord[] = [
      { type: 'keywordRule', pattern: 'AMAZON', category: 'Shopping', createdDate: '2026-03-21T10:00:00Z', status: 'active' },
      { type: 'keywordRule', pattern: 'AMAZON', category: 'Shopping', createdDate: '2026-03-21T11:00:00Z', status: 'inactive' },
    ];
    const result = resolveKeywordRules(records);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('inactive');
  });

  it('preserves the winning record pattern (not lowercased)', () => {
    const records: KeywordRuleRecord[] = [
      { type: 'keywordRule', pattern: 'TESCO', category: 'Groceries', createdDate: '2026-03-21T10:00:00Z', status: 'active' },
    ];
    const result = resolveKeywordRules(records);
    expect(result[0].pattern).toBe('TESCO');
  });

  it('returns correct status for the authoritative record', () => {
    const records: KeywordRuleRecord[] = [
      { type: 'keywordRule', pattern: 'NETFLIX', category: 'Subscriptions', createdDate: '2026-03-20T09:00:00Z', status: 'active' },
      { type: 'keywordRule', pattern: 'NETFLIX', category: 'Subscriptions', createdDate: '2026-03-21T12:00:00Z', status: 'inactive' },
    ];
    const result = resolveKeywordRules(records);
    expect(result[0].status).toBe('inactive');
  });

  it('handles multiple distinct patterns independently', () => {
    const records: KeywordRuleRecord[] = [
      { type: 'keywordRule', pattern: 'AMAZON', category: 'Shopping', createdDate: '2026-03-21T10:00:00Z', status: 'active' },
      { type: 'keywordRule', pattern: 'NETFLIX', category: 'Subscriptions', createdDate: '2026-03-21T11:00:00Z', status: 'inactive' },
      { type: 'keywordRule', pattern: 'TESCO', category: 'Groceries', createdDate: '2026-03-21T09:00:00Z', status: 'active' },
    ];
    const result = resolveKeywordRules(records);
    expect(result).toHaveLength(3);
  });

  it('sets categoryIsInactive to false (caller is responsible for category status enrichment)', () => {
    const records: KeywordRuleRecord[] = [
      { type: 'keywordRule', pattern: 'AMAZON', category: 'Shopping', createdDate: '2026-03-21T10:00:00Z', status: 'active' },
    ];
    const result = resolveKeywordRules(records);
    expect(result[0].categoryIsInactive).toBe(false);
  });
});
