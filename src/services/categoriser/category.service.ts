import type { CategoryRecord } from '../../models/index';
import { serialiseRecord } from '../ledger/ledger-writer';

function latestPerName(records: CategoryRecord[]): CategoryRecord[] {
  const map = new Map<string, CategoryRecord>();
  for (const r of records) {
    const key = r.name.toLowerCase();
    const current = map.get(key);
    if (!current || r.createdDate >= current.createdDate) {
      map.set(key, r);
    }
  }
  return Array.from(map.values());
}

export function getActiveCategories(records: CategoryRecord[]): CategoryRecord[] {
  return latestPerName(records).filter((c) => c.status === 'active');
}

export function getAllCategories(records: CategoryRecord[]): CategoryRecord[] {
  return latestPerName(records);
}

export function getCategoryStatus(
  name: string,
  records: CategoryRecord[],
): 'active' | 'inactive' {
  const key = name.toLowerCase();
  let latest: CategoryRecord | undefined;
  for (const r of records) {
    if (r.name.toLowerCase() === key) {
      if (!latest || r.createdDate >= latest.createdDate) {
        latest = r;
      }
    }
  }
  return latest?.status ?? 'active';
}

export async function addCategory(
  name: string,
  _dirHandle: FileSystemDirectoryHandle,
  existingRecords: CategoryRecord[],
  appendRecords: (rows: string[]) => Promise<void>,
): Promise<void> {
  if (name.trim() === '') {
    throw new Error('Category name cannot be empty or whitespace only');
  }
  const all = getAllCategories(existingRecords);
  const nameLower = name.toLowerCase().trim();
  const conflict = all.find((c) => c.name.toLowerCase() === nameLower);
  if (conflict) {
    throw new Error('A category with this name already exists');
  }

  const record: CategoryRecord = {
    type: 'category',
    name: name.trim(),
    isDefault: false,
    createdDate: new Date().toISOString(),
    status: 'active',
  };
  await appendRecords([serialiseRecord(record)]);
}

export async function deactivateCategory(
  name: string,
  _dirHandle: FileSystemDirectoryHandle,
  existingRecords: CategoryRecord[],
  appendRecords: (rows: string[]) => Promise<void>,
): Promise<void> {
  const latest = getAllCategories(existingRecords).find(
    (c) => c.name.toLowerCase() === name.toLowerCase(),
  );
  if (!latest) throw new Error(`Category "${name}" not found.`);

  const record: CategoryRecord = {
    type: 'category',
    name: latest.name,
    isDefault: latest.isDefault,
    createdDate: new Date().toISOString(),
    status: 'inactive',
  };
  await appendRecords([serialiseRecord(record)]);
}

export async function reactivateCategory(
  name: string,
  _dirHandle: FileSystemDirectoryHandle,
  existingRecords: CategoryRecord[],
  appendRecords: (rows: string[]) => Promise<void>,
): Promise<void> {
  const latest = getAllCategories(existingRecords).find(
    (c) => c.name.toLowerCase() === name.toLowerCase(),
  );
  if (!latest) throw new Error(`Category "${name}" not found.`);

  const record: CategoryRecord = {
    type: 'category',
    name: latest.name,
    isDefault: latest.isDefault,
    createdDate: new Date().toISOString(),
    status: 'active',
  };
  await appendRecords([serialiseRecord(record)]);
}
