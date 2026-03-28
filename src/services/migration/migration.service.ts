import { LEDGER_VERSION } from '../../models/constants';
import { parseLedgerCsv } from '../ledger/ledger-reader';
import { LEDGER_HEADER, serialiseRecord } from '../ledger/ledger-writer';

// ---------------------------------------------------------------------------
// detectOrphanedMigration
// ---------------------------------------------------------------------------

export type OrphanedMigrationResult =
  | { orphaned: false }
  | { orphaned: true; backupFile: string };

/**
 * Checks whether both budget-ledger.csv AND a budget-ledger.backup-v* file exist
 * simultaneously, which indicates a prior migration was interrupted mid-flight.
 *
 * Returns { orphaned: true, backupFile: '<name>' } if an orphaned state is detected,
 * or { orphaned: false } if everything looks clean.
 */
export async function detectOrphanedMigration(
  dirHandle: FileSystemDirectoryHandle,
): Promise<OrphanedMigrationResult> {
  // Check that budget-ledger.csv exists
  try {
    await dirHandle.getFileHandle('budget-ledger.csv', { create: false });
  } catch {
    return { orphaned: false };
  }

  // Scan for any budget-ledger.backup-v* file
  for await (const [name] of dirHandle as unknown as AsyncIterable<[string, FileSystemHandle]>) {
    if (/^budget-ledger\.backup-v\d/.test(name)) {
      return { orphaned: true, backupFile: name };
    }
  }

  return { orphaned: false };
}

/**
 * Restores a backup by deleting budget-ledger.csv and renaming the backup back.
 */
export async function restoreFromBackup(
  dirHandle: FileSystemDirectoryHandle,
  backupFile: string,
): Promise<void> {
  await dirHandle.removeEntry('budget-ledger.csv');
  const backupHandle = await dirHandle.getFileHandle(backupFile, { create: false });
  await backupHandle.move('budget-ledger.csv');
}

/**
 * Resumes a previously interrupted migration by running performMigration from the
 * backup file. Deletes the partial budget-ledger.csv first, then re-runs migration.
 */
export async function resumeMigrationFromBackup(
  dirHandle: FileSystemDirectoryHandle,
  backupFile: string,
): Promise<void> {
  // Delete the partial new file
  await dirHandle.removeEntry('budget-ledger.csv');
  // Rename backup back so performMigration can operate on budget-ledger.csv
  const backupHandle = await dirHandle.getFileHandle(backupFile, { create: false });
  await backupHandle.move('budget-ledger.csv');
  // Re-detect version and migrate
  const oldVersion = await detectVersion(dirHandle);
  await performMigration(dirHandle, oldVersion);
}

// ---------------------------------------------------------------------------
// detectVersion
// ---------------------------------------------------------------------------

/**
 * Reads budget-ledger.csv from the given directory and returns the meta version number.
 */
export async function detectVersion(dirHandle: FileSystemDirectoryHandle): Promise<number> {
  const fileHandle = await dirHandle.getFileHandle('budget-ledger.csv', { create: false });
  const file = await fileHandle.getFile();
  const text = await file.text();
  const { version } = parseLedgerCsv(text);
  return version;
}

// ---------------------------------------------------------------------------
// migrationNeeded
// ---------------------------------------------------------------------------

/**
 * Returns true if the given ledger version is older than the current LEDGER_VERSION.
 */
export function migrationNeeded(version: number): boolean {
  return version < LEDGER_VERSION;
}

// ---------------------------------------------------------------------------
// buildBackupFilename
// ---------------------------------------------------------------------------

/**
 * Computes a non-colliding backup filename for budget-ledger.csv.
 * Format: budget-ledger.backup-v{oldVersion}-YYYYMMDD
 * If that name already exists, appends -2, -3, etc. until a free slot is found.
 */
export async function buildBackupFilename(
  dirHandle: FileSystemDirectoryHandle,
  oldVersion: number,
): Promise<string> {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const base = `budget-ledger.backup-v${oldVersion}-${yyyy}${mm}${dd}`;

  // Check if base name is free
  const isTaken = async (name: string): Promise<boolean> => {
    try {
      await dirHandle.getFileHandle(name, { create: false });
      return true;
    } catch {
      return false;
    }
  };

  if (!(await isTaken(base))) return base;

  for (let suffix = 2; ; suffix++) {
    const candidate = `${base}-${suffix}`;
    if (!(await isTaken(candidate))) return candidate;
  }
}

// ---------------------------------------------------------------------------
// verifyRecordCount
// ---------------------------------------------------------------------------

/**
 * Throws if backup and new-file record counts differ.
 * @internal exported for testing
 */
export function verifyRecordCount(backupCount: number, newCount: number): void {
  if (backupCount !== newCount) {
    throw new Error(
      `Record count mismatch after migration: backup had ${backupCount}, new file has ${newCount}`,
    );
  }
}

// ---------------------------------------------------------------------------
// performMigration
// ---------------------------------------------------------------------------

/**
 * Migrates budget-ledger.csv to the current format atomically.
 *
 * Step 1 — Rename budget-ledger.csv → backup filename (handle collisions).
 * Step 2 — Create fresh budget-ledger.csv with current header + meta record.
 * Step 3 — Copy-transform all non-meta records from the backup into the new file.
 * Step 4 — Verify record count matches between backup and new file.
 * Step 5 — On any failure: delete new file, rename backup back, re-throw.
 */
export async function performMigration(
  dirHandle: FileSystemDirectoryHandle,
  oldVersion: number,
): Promise<void> {
  // Step 1: Rename original to backup
  const backupName = await buildBackupFilename(dirHandle, oldVersion);
  const originalHandle = await dirHandle.getFileHandle('budget-ledger.csv', { create: false });
  await originalHandle.move(backupName);

  let newFileCreated = false;
  try {
    // Step 2: Create fresh budget-ledger.csv
    const newHandle = await dirHandle.getFileHandle('budget-ledger.csv', { create: true });
    newFileCreated = true;
    const writable = await newHandle.createWritable({ keepExistingData: false });

    try {
      // Write header + current meta record
      await writable.write(LEDGER_HEADER + '\r\n');
      await writable.write(serialiseRecord({ type: 'meta', version: LEDGER_VERSION }));

      // Step 3: Read backup and copy-transform all non-meta records
      const backupHandle = await dirHandle.getFileHandle(backupName, { create: false });
      const backupFile = await backupHandle.getFile();
      const backupText = await backupFile.text();
      const { records: backupRecords } = parseLedgerCsv(backupText);

      const nonMetaRecords = backupRecords.filter((r) => r.type !== 'meta');
      for (const record of nonMetaRecords) {
        await writable.write(serialiseRecord(record));
      }

      await writable.close();

      // Step 4: Verify record count
      // Backup count = non-meta records; new file = same non-meta + 1 meta
      // Compare non-meta counts between backup and new file
      const newFileHandle = await dirHandle.getFileHandle('budget-ledger.csv', { create: false });
      const newFile = await newFileHandle.getFile();
      const newText = await newFile.text();
      const { records: newRecords } = parseLedgerCsv(newText);
      const newNonMeta = newRecords.filter((r) => r.type !== 'meta');

      verifyRecordCount(nonMetaRecords.length, newNonMeta.length);
    } catch (err) {
      // Close writable if possible (ignore errors)
      try { await writable.close(); } catch { /* ignore */ }
      throw err;
    }
  } catch (err) {
    // Step 5: Rollback — delete new file, rename backup back
    if (newFileCreated) {
      try { await dirHandle.removeEntry('budget-ledger.csv'); } catch { /* ignore */ }
    }
    try { await originalHandle.move('budget-ledger.csv'); } catch { /* ignore */ }
    throw err;
  }
}
