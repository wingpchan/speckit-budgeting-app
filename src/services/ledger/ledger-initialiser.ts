import { LEDGER_VERSION, DEFAULT_CATEGORIES, REFERENCE_FORMAT_PROFILES } from '../../models/constants';
import { LEDGER_HEADER, serialiseRecord } from './ledger-writer';
import type { MetaRecord, PersonRecord, CategoryRecord, FormatProfileRecord } from '../../models/index';

/**
 * Creates a new budget-ledger.csv in the given directory handle.
 * Writes the superset column header row, meta record, Household person,
 * 19 default categories, and 3 reference format profiles.
 */
export async function createNewLedger(dirHandle: FileSystemDirectoryHandle): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  const meta: MetaRecord = { type: 'meta', version: LEDGER_VERSION };

  const household: PersonRecord = {
    type: 'person',
    name: 'Household',
    isDefault: true,
    createdDate: today,
    status: 'active',
  };

  const categories: CategoryRecord[] = DEFAULT_CATEGORIES.map((name) => ({
    type: 'category',
    name,
    isDefault: true,
    createdDate: today,
    status: 'active',
  }));

  const profiles: FormatProfileRecord[] = REFERENCE_FORMAT_PROFILES.map((p) => ({
    ...p,
    createdDate: today,
  }));

  const rows: string[] = [
    LEDGER_HEADER + '\r\n',
    serialiseRecord(meta),
    serialiseRecord(household),
    ...categories.map(serialiseRecord),
    ...profiles.map(serialiseRecord),
  ];

  const fileHandle = await dirHandle.getFileHandle('budget-ledger.csv', { create: true });
  const writable = await fileHandle.createWritable({ keepExistingData: false });
  for (const row of rows) {
    await writable.write(row);
  }
  await writable.close();
}
