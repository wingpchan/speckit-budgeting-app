import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectVersion,
  migrationNeeded,
  buildBackupFilename,
  verifyRecordCount,
  performMigration,
} from '../../../src/services/migration/migration.service';
import { LEDGER_VERSION } from '../../../src/models/constants';
import { LEDGER_HEADER, serialiseRecord } from '../../../src/services/ledger/ledger-writer';
import type { CategoryRecord } from '../../../src/models/index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildTestCsv(version: number, extraRows: string[] = []): string {
  const metaRow = serialiseRecord({ type: 'meta', version });
  return [LEDGER_HEADER + '\r\n', metaRow, ...extraRows].join('');
}

const DUMMY_CATEGORY: CategoryRecord = {
  type: 'category',
  name: 'Groceries',
  isDefault: true,
  createdDate: '2026-01-01',
  status: 'active',
};

type MockWritable = {
  write: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  seek: ReturnType<typeof vi.fn>;
};

type MockFileHandle = {
  getFile: ReturnType<typeof vi.fn>;
  createWritable: ReturnType<typeof vi.fn>;
  move: ReturnType<typeof vi.fn>;
  _writable: MockWritable;
};

function createMockFileHandle(content = ''): MockFileHandle {
  const writable: MockWritable = {
    write: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    seek: vi.fn().mockResolvedValue(undefined),
  };
  return {
    getFile: vi.fn().mockResolvedValue({
      text: vi.fn().mockResolvedValue(content),
      size: content.length,
    }),
    createWritable: vi.fn().mockResolvedValue(writable),
    move: vi.fn().mockResolvedValue(undefined),
    _writable: writable,
  };
}

/** Builds a mock dirHandle from a filename → content map. */
function createMockDirHandle(files: Record<string, string> = {}): {
  dirHandle: FileSystemDirectoryHandle;
  handles: Map<string, MockFileHandle>;
  removeEntry: ReturnType<typeof vi.fn>;
  getFileHandle: ReturnType<typeof vi.fn>;
} {
  const handles = new Map<string, MockFileHandle>(
    Object.entries(files).map(([name, content]) => [name, createMockFileHandle(content)]),
  );

  const removeEntry = vi.fn().mockResolvedValue(undefined);

  const getFileHandle = vi.fn().mockImplementation(
    (name: string, options?: { create?: boolean }) => {
      if (handles.has(name)) return Promise.resolve(handles.get(name)!);
      if (options?.create) {
        const h = createMockFileHandle('');
        handles.set(name, h);
        return Promise.resolve(h);
      }
      return Promise.reject(new DOMException('File not found', 'NotFoundError'));
    },
  );

  return {
    dirHandle: { getFileHandle, removeEntry } as unknown as FileSystemDirectoryHandle,
    handles,
    removeEntry,
    getFileHandle,
  };
}

// ---------------------------------------------------------------------------
// detectVersion
// ---------------------------------------------------------------------------

describe('detectVersion', () => {
  it('reads meta.version from budget-ledger.csv and returns it as a number', async () => {
    const csv = buildTestCsv(2);
    const { dirHandle } = createMockDirHandle({ 'budget-ledger.csv': csv });
    const version = await detectVersion(dirHandle);
    expect(version).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// migrationNeeded
// ---------------------------------------------------------------------------

describe('migrationNeeded', () => {
  it('returns true when version is less than LEDGER_VERSION', () => {
    expect(migrationNeeded(LEDGER_VERSION - 1)).toBe(true);
  });

  it('returns false when version equals LEDGER_VERSION', () => {
    expect(migrationNeeded(LEDGER_VERSION)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildBackupFilename
// ---------------------------------------------------------------------------

describe('buildBackupFilename', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-27'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns budget-ledger.backup-v{N}-YYYYMMDD when no collision exists', async () => {
    const { dirHandle } = createMockDirHandle({ 'budget-ledger.csv': buildTestCsv(2) });
    const filename = await buildBackupFilename(dirHandle, 2);
    expect(filename).toBe('budget-ledger.backup-v2-20260327');
  });

  it('appends -2 when the base backup filename already exists', async () => {
    const { dirHandle } = createMockDirHandle({
      'budget-ledger.csv': buildTestCsv(2),
      'budget-ledger.backup-v2-20260327': buildTestCsv(2),
    });
    const filename = await buildBackupFilename(dirHandle, 2);
    expect(filename).toBe('budget-ledger.backup-v2-20260327-2');
  });

  it('appends -3 when both base and -2 backup filenames already exist', async () => {
    const { dirHandle } = createMockDirHandle({
      'budget-ledger.csv': buildTestCsv(2),
      'budget-ledger.backup-v2-20260327': buildTestCsv(2),
      'budget-ledger.backup-v2-20260327-2': buildTestCsv(2),
    });
    const filename = await buildBackupFilename(dirHandle, 2);
    expect(filename).toBe('budget-ledger.backup-v2-20260327-3');
  });
});

// ---------------------------------------------------------------------------
// verifyRecordCount
// ---------------------------------------------------------------------------

describe('verifyRecordCount', () => {
  it('does not throw when backup count equals new file count', () => {
    expect(() => verifyRecordCount(5, 5)).not.toThrow();
  });

  it('throws when counts do not match', () => {
    expect(() => verifyRecordCount(5, 4)).toThrow(
      /record count mismatch/i,
    );
  });
});

// ---------------------------------------------------------------------------
// performMigration — atomic rollback on write failure
// ---------------------------------------------------------------------------

describe('performMigration — atomic rollback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-27'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deletes new file and renames backup back to budget-ledger.csv on write failure', async () => {
    const catRow = serialiseRecord(DUMMY_CATEGORY);
    const originalCsv = buildTestCsv(2, [catRow]);

    const originalHandle = createMockFileHandle(originalCsv);
    const removeEntry = vi.fn().mockResolvedValue(undefined);
    const writeError = new Error('Simulated write failure');

    // New file writable fails immediately on write
    const failingWritable: MockWritable = {
      write: vi.fn().mockRejectedValue(writeError),
      close: vi.fn().mockResolvedValue(undefined),
      seek: vi.fn().mockResolvedValue(undefined),
    };
    const newHandle = createMockFileHandle('');
    newHandle.createWritable = vi.fn().mockResolvedValue(failingWritable);

    const getFileHandle = vi.fn().mockImplementation(
      (name: string, options?: { create?: boolean }) => {
        if (name === 'budget-ledger.csv' && !options?.create) {
          // Always return original handle for initial read
          return Promise.resolve(originalHandle);
        }
        if (name === 'budget-ledger.csv' && options?.create) {
          // New file created after rename
          return Promise.resolve(newHandle);
        }
        if (name.startsWith('budget-ledger.backup-')) {
          // Collision check: not found unless move has already been called
          if (originalHandle.move.mock.calls.length > 0) {
            // Post-rename: backup file now exists as originalHandle
            return Promise.resolve(originalHandle);
          }
          return Promise.reject(new DOMException('Not found', 'NotFoundError'));
        }
        return Promise.reject(new DOMException('Not found', 'NotFoundError'));
      },
    );

    const dirHandle = { getFileHandle, removeEntry } as unknown as FileSystemDirectoryHandle;

    await expect(performMigration(dirHandle, 2)).rejects.toThrow(writeError);

    // New (partial) file must be deleted
    expect(removeEntry).toHaveBeenCalledWith('budget-ledger.csv');

    // Original handle (now the backup) must be renamed back
    expect(originalHandle.move).toHaveBeenLastCalledWith('budget-ledger.csv');
  });
});
