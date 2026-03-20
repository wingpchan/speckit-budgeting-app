import type { PersonRecord } from '../../models/index';
import { serialiseRecord } from '../ledger/ledger-writer';

/**
 * Returns the most recent PersonRecord for each unique name.
 * "Most recent" = latest by createdDate; ties broken by last appearance in array.
 */
function latestPerName(records: PersonRecord[]): PersonRecord[] {
  const map = new Map<string, PersonRecord>();
  for (const r of records) {
    const key = r.name.toLowerCase();
    const current = map.get(key);
    if (!current || r.createdDate >= current.createdDate) {
      map.set(key, r);
    }
  }
  return Array.from(map.values());
}

export function getActivePeople(records: PersonRecord[]): PersonRecord[] {
  return latestPerName(records).filter((r) => r.status === 'active');
}

export function getAllPeople(records: PersonRecord[]): PersonRecord[] {
  return latestPerName(records);
}

export function getPersonStatus(
  name: string,
  records: PersonRecord[],
): 'active' | 'inactive' {
  const key = name.toLowerCase();
  let latest: PersonRecord | undefined;
  for (const r of records) {
    if (r.name.toLowerCase() === key) {
      if (!latest || r.createdDate >= latest.createdDate) {
        latest = r;
      }
    }
  }
  return latest?.status ?? 'active';
}

export async function addPerson(
  name: string,
  _dirHandle: FileSystemDirectoryHandle,
  existingRecords: PersonRecord[],
  appendRecords: (rows: string[]) => Promise<void>,
): Promise<void> {
  const all = getAllPeople(existingRecords);
  const nameLower = name.toLowerCase().trim();
  const conflict = all.find((p) => p.name.toLowerCase() === nameLower);
  if (conflict) {
    throw new Error(`A person named "${conflict.name}" already exists.`);
  }

  const record: PersonRecord = {
    type: 'person',
    name: name.trim(),
    isDefault: false,
    createdDate: new Date().toISOString().slice(0, 10),
    status: 'active',
  };
  await appendRecords([serialiseRecord(record)]);
}

export async function deactivatePerson(
  name: string,
  _dirHandle: FileSystemDirectoryHandle,
  existingRecords: PersonRecord[],
  appendRecords: (rows: string[]) => Promise<void>,
): Promise<void> {
  if (name.toLowerCase() === 'household') {
    throw new Error('The Household person cannot be deactivated.');
  }

  const latest = getAllPeople(existingRecords).find(
    (p) => p.name.toLowerCase() === name.toLowerCase(),
  );
  if (!latest) throw new Error(`Person "${name}" not found.`);

  const record: PersonRecord = {
    type: 'person',
    name: latest.name,
    isDefault: latest.isDefault,
    createdDate: new Date().toISOString().slice(0, 10),
    status: 'inactive',
  };
  await appendRecords([serialiseRecord(record)]);
}

export async function reactivatePerson(
  name: string,
  _dirHandle: FileSystemDirectoryHandle,
  existingRecords: PersonRecord[],
  appendRecords: (rows: string[]) => Promise<void>,
): Promise<void> {
  const latest = getAllPeople(existingRecords).find(
    (p) => p.name.toLowerCase() === name.toLowerCase(),
  );
  if (!latest) throw new Error(`Person "${name}" not found.`);

  const record: PersonRecord = {
    type: 'person',
    name: latest.name,
    isDefault: latest.isDefault,
    createdDate: new Date().toISOString().slice(0, 10),
    status: 'active',
  };
  await appendRecords([serialiseRecord(record)]);
}
