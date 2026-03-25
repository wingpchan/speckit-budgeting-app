import { describe, it, expect, vi } from 'vitest';
import {
  getActiveCategories,
  getAllCategories,
  getCategoryStatus,
  addCategory,
  deactivateCategory,
  reactivateCategory,
} from '../../../src/services/categoriser/category.service';
import type { CategoryRecord } from '../../../src/models/index';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCat(overrides: Partial<CategoryRecord> = {}): CategoryRecord {
  return {
    type: 'category',
    name: 'Groceries',
    isDefault: true,
    createdDate: '2026-01-01',
    status: 'active',
    ...overrides,
  };
}

// ── getActiveCategories ───────────────────────────────────────────────────────

describe('getActiveCategories', () => {
  it('returns only categories with current status active', () => {
    const records: CategoryRecord[] = [
      makeCat({ name: 'Groceries', status: 'active' }),
      makeCat({ name: 'Child Care', status: 'inactive' }),
    ];
    const result = getActiveCategories(records);
    expect(result.map((c) => c.name)).toContain('Groceries');
    expect(result.map((c) => c.name)).not.toContain('Child Care');
  });

  it('uses most-recent-record logic: latest record for name wins', () => {
    const records: CategoryRecord[] = [
      makeCat({ name: 'Groceries', status: 'active', createdDate: '2026-01-01' }),
      makeCat({ name: 'Groceries', status: 'inactive', createdDate: '2026-03-01' }),
    ];
    const result = getActiveCategories(records);
    expect(result.map((c) => c.name)).not.toContain('Groceries');
  });

  it('includes category reactivated after deactivation', () => {
    const records: CategoryRecord[] = [
      makeCat({ name: 'Shopping', status: 'active', createdDate: '2026-01-01' }),
      makeCat({ name: 'Shopping', status: 'inactive', createdDate: '2026-02-01' }),
      makeCat({ name: 'Shopping', status: 'active', createdDate: '2026-03-01' }),
    ];
    const result = getActiveCategories(records);
    expect(result.map((c) => c.name)).toContain('Shopping');
  });
});

// ── getAllCategories ──────────────────────────────────────────────────────────

describe('getAllCategories', () => {
  it('returns one entry per category name regardless of status', () => {
    const records: CategoryRecord[] = [
      makeCat({ name: 'Groceries', status: 'active', createdDate: '2026-01-01' }),
      makeCat({ name: 'Groceries', status: 'inactive', createdDate: '2026-03-01' }),
      makeCat({ name: 'Child Care', status: 'inactive', isDefault: false }),
    ];
    const result = getAllCategories(records);
    const names = result.map((c) => c.name);
    expect(names).toContain('Groceries');
    expect(names).toContain('Child Care');
    expect(names.filter((n) => n === 'Groceries').length).toBe(1);
  });
});

// ── getCategoryStatus ─────────────────────────────────────────────────────────

describe('getCategoryStatus', () => {
  it('returns status from the most recent record for the name', () => {
    const records: CategoryRecord[] = [
      makeCat({ name: 'Groceries', status: 'active', createdDate: '2026-01-01' }),
      makeCat({ name: 'Groceries', status: 'inactive', createdDate: '2026-03-01' }),
    ];
    expect(getCategoryStatus('Groceries', records)).toBe('inactive');
  });

  it('is case-insensitive for name lookup', () => {
    const records: CategoryRecord[] = [makeCat({ name: 'Groceries', status: 'active' })];
    expect(getCategoryStatus('groceries', records)).toBe('active');
  });
});

// ── addCategory ───────────────────────────────────────────────────────────────

describe('addCategory', () => {
  it('appends a CategoryRecord via appendRecords', async () => {
    const appendRecords = vi.fn().mockResolvedValue(undefined);
    const existing: CategoryRecord[] = [makeCat({ name: 'Groceries' })];

    await addCategory('Child Care', {} as FileSystemDirectoryHandle, existing, appendRecords);

    expect(appendRecords).toHaveBeenCalledOnce();
    const [row] = appendRecords.mock.calls[0][0] as string[];
    expect(row).toContain('category');
    expect(row).toContain('Child Care');
    expect(row).toContain('false'); // isDefault — custom categories are not default
    expect(row).toContain('active');
  });

  it('rejects a name identical case-insensitively to an existing category', async () => {
    const appendRecords = vi.fn();
    const existing: CategoryRecord[] = [makeCat({ name: 'Groceries', isDefault: true })];

    await expect(
      addCategory('groceries', {} as FileSystemDirectoryHandle, existing, appendRecords),
    ).rejects.toThrow('A category with this name already exists');
    expect(appendRecords).not.toHaveBeenCalled();
  });

  it('rejects a name matching a default category (case-insensitive)', async () => {
    const appendRecords = vi.fn();
    const existing: CategoryRecord[] = [makeCat({ name: 'Shopping', isDefault: true })];

    await expect(
      addCategory('SHOPPING', {} as FileSystemDirectoryHandle, existing, appendRecords),
    ).rejects.toThrow('A category with this name already exists');
    expect(appendRecords).not.toHaveBeenCalled();
  });

  it('rejects a name matching an inactive existing category', async () => {
    const appendRecords = vi.fn();
    const existing: CategoryRecord[] = [
      makeCat({ name: 'Child Care', isDefault: false, status: 'inactive' }),
    ];

    await expect(
      addCategory('child care', {} as FileSystemDirectoryHandle, existing, appendRecords),
    ).rejects.toThrow('A category with this name already exists');
    expect(appendRecords).not.toHaveBeenCalled();
  });
});

// ── deactivateCategory ────────────────────────────────────────────────────────

describe('deactivateCategory', () => {
  it('appends a CategoryRecord with status inactive', async () => {
    const appendRecords = vi.fn().mockResolvedValue(undefined);
    const existing: CategoryRecord[] = [
      makeCat({ name: 'Child Care', status: 'active', isDefault: false }),
    ];

    await deactivateCategory('Child Care', {} as FileSystemDirectoryHandle, existing, appendRecords);

    expect(appendRecords).toHaveBeenCalledOnce();
    const [row] = appendRecords.mock.calls[0][0] as string[];
    expect(row).toContain('category');
    expect(row).toContain('Child Care');
    expect(row).toContain('inactive');
  });

  it('throws when category not found', async () => {
    const appendRecords = vi.fn();
    await expect(
      deactivateCategory('Unknown', {} as FileSystemDirectoryHandle, [], appendRecords),
    ).rejects.toThrow();
    expect(appendRecords).not.toHaveBeenCalled();
  });
});

// ── reactivateCategory ────────────────────────────────────────────────────────

describe('reactivateCategory', () => {
  it('appends a CategoryRecord with status active', async () => {
    const appendRecords = vi.fn().mockResolvedValue(undefined);
    const existing: CategoryRecord[] = [
      makeCat({ name: 'Child Care', status: 'inactive', isDefault: false }),
    ];

    await reactivateCategory('Child Care', {} as FileSystemDirectoryHandle, existing, appendRecords);

    expect(appendRecords).toHaveBeenCalledOnce();
    const [row] = appendRecords.mock.calls[0][0] as string[];
    expect(row).toContain('category');
    expect(row).toContain('Child Care');
    expect(row).toContain('active');
  });
});

// ── no deleteCategory ─────────────────────────────────────────────────────────

import * as categoryServiceModule from '../../../src/services/categoriser/category.service';

describe('no deleteCategory function', () => {
  it('deleteCategory is not exported from the service', () => {
    expect((categoryServiceModule as Record<string, unknown>)['deleteCategory']).toBeUndefined();
  });
});
