import { LEDGER_VERSION } from '../../models/constants';
import { parseLedgerCsv } from './ledger-reader';

/**
 * Opens a directory picker and returns the selected FileSystemDirectoryHandle.
 */
export async function openLedger(): Promise<FileSystemDirectoryHandle> {
  return await window.showDirectoryPicker({ mode: 'readwrite' });
}

/**
 * Detects whether an existing ledger exists in the directory and checks its version.
 * Returns:
 * - 'new'     — no budget-ledger.csv present
 * - 'current' — file present and version matches LEDGER_VERSION
 * - 'old'     — file present but version is older than LEDGER_VERSION
 */
export async function detectExistingLedger(
  dirHandle: FileSystemDirectoryHandle,
): Promise<'new' | 'current' | 'old'> {
  try {
    const fileHandle = await dirHandle.getFileHandle('budget-ledger.csv', { create: false });
    const file = await fileHandle.getFile();
    const text = await file.text();
    const { version } = parseLedgerCsv(text);
    if (version === LEDGER_VERSION) return 'current';
    if (version < LEDGER_VERSION) return 'old';
    // Newer version — treat as current for forward-compatibility
    return 'current';
  } catch {
    return 'new';
  }
}
