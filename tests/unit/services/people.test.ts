import { describe, it, expect, vi } from 'vitest';
import {
  getActivePeople,
  getAllPeople,
  getPersonStatus,
  addPerson,
  deactivatePerson,
  reactivatePerson,
} from '../../../src/services/people/people.service';
import type { PersonRecord } from '../../../src/models/index';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePerson(overrides: Partial<PersonRecord> = {}): PersonRecord {
  return {
    type: 'person',
    name: 'Alice',
    isDefault: false,
    createdDate: '2026-03-01',
    status: 'active',
    ...overrides,
  };
}

function makeHousehold(): PersonRecord {
  return makePerson({ name: 'Household', isDefault: true, status: 'active' });
}

// ── getActivePeople ───────────────────────────────────────────────────────────

describe('getActivePeople', () => {
  it('returns only persons with current status active', () => {
    const records: PersonRecord[] = [
      makePerson({ name: 'Alice', status: 'active' }),
      makePerson({ name: 'Bob', status: 'inactive' }),
      makeHousehold(),
    ];
    const result = getActivePeople(records);
    expect(result.map((p) => p.name)).toContain('Alice');
    expect(result.map((p) => p.name)).toContain('Household');
    expect(result.map((p) => p.name)).not.toContain('Bob');
  });

  it('excludes person whose latest record is inactive', () => {
    const records: PersonRecord[] = [
      makePerson({ name: 'Alice', status: 'active', createdDate: '2026-01-01' }),
      makePerson({ name: 'Alice', status: 'inactive', createdDate: '2026-03-01' }),
    ];
    const result = getActivePeople(records);
    expect(result.map((p) => p.name)).not.toContain('Alice');
  });

  it('includes person whose latest record is active (after prior inactive)', () => {
    const records: PersonRecord[] = [
      makePerson({ name: 'Bob', status: 'active', createdDate: '2026-01-01' }),
      makePerson({ name: 'Bob', status: 'inactive', createdDate: '2026-02-01' }),
      makePerson({ name: 'Bob', status: 'active', createdDate: '2026-03-01' }),
    ];
    const result = getActivePeople(records);
    expect(result.map((p) => p.name)).toContain('Bob');
  });
});

// ── getAllPeople ──────────────────────────────────────────────────────────────

describe('getAllPeople', () => {
  it('returns one entry per person name (most recent record)', () => {
    const records: PersonRecord[] = [
      makePerson({ name: 'Alice', status: 'active', createdDate: '2026-01-01' }),
      makePerson({ name: 'Alice', status: 'inactive', createdDate: '2026-03-01' }),
      makePerson({ name: 'Bob', status: 'active', createdDate: '2026-02-01' }),
    ];
    const result = getAllPeople(records);
    const names = result.map((p) => p.name);
    expect(names).toContain('Alice');
    expect(names).toContain('Bob');
    expect(names.filter((n) => n === 'Alice').length).toBe(1);
  });
});

// ── getPersonStatus ───────────────────────────────────────────────────────────

describe('getPersonStatus', () => {
  it('returns status from the most recent record for the name', () => {
    const records: PersonRecord[] = [
      makePerson({ name: 'Alice', status: 'active', createdDate: '2026-01-01' }),
      makePerson({ name: 'Alice', status: 'inactive', createdDate: '2026-03-01' }),
    ];
    expect(getPersonStatus('Alice', records)).toBe('inactive');
  });

  it('returns active when only active record exists', () => {
    const records: PersonRecord[] = [makePerson({ name: 'Bob', status: 'active' })];
    expect(getPersonStatus('Bob', records)).toBe('active');
  });

  it('is case-insensitive for name lookup', () => {
    const records: PersonRecord[] = [makePerson({ name: 'Alice', status: 'active' })];
    expect(getPersonStatus('alice', records)).toBe('active');
  });
});

// ── addPerson ─────────────────────────────────────────────────────────────────

describe('addPerson', () => {
  it('appends a PersonRecord via appendRecords', async () => {
    const appendRecords = vi.fn().mockResolvedValue(undefined);
    const dirHandle = {} as FileSystemDirectoryHandle;
    const existing: PersonRecord[] = [makeHousehold()];

    await addPerson('Alice', dirHandle, existing, appendRecords);

    expect(appendRecords).toHaveBeenCalledOnce();
    const [row] = appendRecords.mock.calls[0][0] as string[];
    expect(row).toContain('person');
    expect(row).toContain('Alice');
    expect(row).toContain('false'); // isDefault
    expect(row).toContain('active');
  });

  it('rejects a name identical case-insensitively to an existing person', async () => {
    const appendRecords = vi.fn();
    const dirHandle = {} as FileSystemDirectoryHandle;
    const existing: PersonRecord[] = [makePerson({ name: 'Alice' })];

    await expect(addPerson('alice', dirHandle, existing, appendRecords)).rejects.toThrow();
    expect(appendRecords).not.toHaveBeenCalled();
  });

  it('rejects a name identical case-insensitively to Household', async () => {
    const appendRecords = vi.fn();
    const dirHandle = {} as FileSystemDirectoryHandle;
    const existing: PersonRecord[] = [makeHousehold()];

    await expect(addPerson('household', dirHandle, existing, appendRecords)).rejects.toThrow();
    expect(appendRecords).not.toHaveBeenCalled();
  });
});

// ── deactivatePerson ──────────────────────────────────────────────────────────

describe('deactivatePerson', () => {
  it('appends a PersonRecord with status inactive', async () => {
    const appendRecords = vi.fn().mockResolvedValue(undefined);
    const dirHandle = {} as FileSystemDirectoryHandle;
    const existing: PersonRecord[] = [makePerson({ name: 'Alice', status: 'active' })];

    await deactivatePerson('Alice', dirHandle, existing, appendRecords);

    expect(appendRecords).toHaveBeenCalledOnce();
    const [row] = appendRecords.mock.calls[0][0] as string[];
    expect(row).toContain('person');
    expect(row).toContain('Alice');
    expect(row).toContain('inactive');
  });

  it('throws when attempting to deactivate Household', async () => {
    const appendRecords = vi.fn();
    const dirHandle = {} as FileSystemDirectoryHandle;
    const existing: PersonRecord[] = [makeHousehold()];

    await expect(deactivatePerson('Household', dirHandle, existing, appendRecords)).rejects.toThrow();
    expect(appendRecords).not.toHaveBeenCalled();
  });

  it('throws when attempting to deactivate Household case-insensitively', async () => {
    const appendRecords = vi.fn();
    const dirHandle = {} as FileSystemDirectoryHandle;
    const existing: PersonRecord[] = [makeHousehold()];

    await expect(deactivatePerson('household', dirHandle, existing, appendRecords)).rejects.toThrow();
    expect(appendRecords).not.toHaveBeenCalled();
  });
});

// ── reactivatePerson ──────────────────────────────────────────────────────────

describe('reactivatePerson', () => {
  it('appends a PersonRecord with status active', async () => {
    const appendRecords = vi.fn().mockResolvedValue(undefined);
    const dirHandle = {} as FileSystemDirectoryHandle;
    const existing: PersonRecord[] = [makePerson({ name: 'Bob', status: 'inactive' })];

    await reactivatePerson('Bob', dirHandle, existing, appendRecords);

    expect(appendRecords).toHaveBeenCalledOnce();
    const [row] = appendRecords.mock.calls[0][0] as string[];
    expect(row).toContain('person');
    expect(row).toContain('Bob');
    expect(row).toContain('active');
  });
});
