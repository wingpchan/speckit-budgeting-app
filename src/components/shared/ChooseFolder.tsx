import { useState } from 'react';
import { openLedger, detectExistingLedger } from '../../services/ledger/ledger-opener';
import { createNewLedger } from '../../services/ledger/ledger-initialiser';
import { saveDirectoryHandle } from '../../services/ledger/handle-store';
import {
  performMigration,
  detectVersion,
  detectOrphanedMigration,
  restoreFromBackup,
  resumeMigrationFromBackup,
} from '../../services/migration/migration.service';
import { useSession } from '../../store/SessionContext';
import { MigrationPromptModal } from './MigrationPromptModal';
import type { ViewId } from './Layout';

interface ChooseFolderProps {
  onSuccess: (view: ViewId) => void;
}

type MigrationState =
  | { phase: 'idle' }
  | { phase: 'prompt'; dirHandle: FileSystemDirectoryHandle }
  | { phase: 'orphaned'; dirHandle: FileSystemDirectoryHandle; backupFile: string }
  | { phase: 'declined' };

export function ChooseFolder({ onSuccess }: ChooseFolderProps) {
  const { dispatch } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [migration, setMigration] = useState<MigrationState>({ phase: 'idle' });

  async function openNormally(dirHandle: FileSystemDirectoryHandle) {
    await saveDirectoryHandle(dirHandle);
    dispatch({ type: 'SET_LEDGER_HANDLE', handle: dirHandle });
    onSuccess('import');
  }

  async function handleChooseFolder() {
    setIsLoading(true);
    setError(null);
    setMigration({ phase: 'idle' });

    try {
      const dirHandle = await openLedger();

      // Check for interrupted prior migration first
      const orphaned = await detectOrphanedMigration(dirHandle);
      if (orphaned.orphaned) {
        setMigration({ phase: 'orphaned', dirHandle, backupFile: orphaned.backupFile });
        setIsLoading(false);
        return;
      }

      const status = await detectExistingLedger(dirHandle);

      if (status === 'old') {
        setMigration({ phase: 'prompt', dirHandle });
        setIsLoading(false);
        return;
      }

      if (status === 'new') {
        await createNewLedger(dirHandle);
      }

      await openNormally(dirHandle);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled the picker — silently ignore
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMigrate() {
    if (migration.phase !== 'prompt') return;
    const { dirHandle } = migration;
    setMigration({ phase: 'idle' });
    setIsLoading(true);
    setError(null);
    try {
      const oldVersion = await detectVersion(dirHandle);
      await performMigration(dirHandle, oldVersion);
      await openNormally(dirHandle);
    } catch (err) {
      setError('Migration failed. Your original file has been restored.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  function handleDecline() {
    setMigration({ phase: 'declined' });
  }

  async function handleOrphanedResume() {
    if (migration.phase !== 'orphaned') return;
    const { dirHandle, backupFile } = migration;
    setMigration({ phase: 'idle' });
    setIsLoading(true);
    setError(null);
    try {
      await resumeMigrationFromBackup(dirHandle, backupFile);
      await openNormally(dirHandle);
    } catch (err) {
      setError('Migration failed. Your original file has been restored.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleOrphanedRestore() {
    if (migration.phase !== 'orphaned') return;
    const { dirHandle, backupFile } = migration;
    setMigration({ phase: 'idle' });
    setIsLoading(true);
    setError(null);
    try {
      await restoreFromBackup(dirHandle, backupFile);
      await openNormally(dirHandle);
    } catch (err) {
      setError('Restore failed. Please check your files manually.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {migration.phase === 'prompt' && (
        <MigrationPromptModal onMigrate={() => void handleMigrate()} onDecline={handleDecline} />
      )}

      {migration.phase === 'orphaned' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="orphan-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 id="orphan-title" className="text-lg font-semibold text-gray-800 mb-3">
              Incomplete Migration Detected
            </h2>
            <p className="text-sm text-gray-600 mb-2">
              A previous migration was interrupted. Both your current ledger and a backup file
              ({migration.backupFile}) exist simultaneously.
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Choose how to proceed:
            </p>
            <ul className="text-sm text-gray-600 mb-5 list-disc pl-5 space-y-1">
              <li>
                <strong>Resume migration</strong> — complete the interrupted migration using the
                backup.
              </li>
              <li>
                <strong>Restore backup</strong> — discard the current ledger and restore the
                original backup.
              </li>
            </ul>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => void handleOrphanedRestore()}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
              >
                Restore Backup
              </button>
              <button
                onClick={() => void handleOrphanedResume()}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700"
              >
                Resume Migration
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">UK Bank CSV Budget Tracker</h1>
          <p className="text-gray-600 max-w-md">
            Choose a folder to store your budget ledger. All your financial data stays on your
            device.
          </p>
        </div>

        {migration.phase === 'declined' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md text-center">
            <p className="text-yellow-800 font-medium">Migration required</p>
            <p className="text-yellow-600 text-sm mt-1">
              The ledger cannot be used until migration is performed.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md text-center">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <button
          onClick={() => void handleChooseFolder()}
          disabled={isLoading}
          className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Opening…' : 'Choose Folder'}
        </button>

        <p className="text-xs text-gray-400">
          Requires a Chromium-based browser (Chrome, Edge) for File System Access API support.
        </p>
      </div>
    </>
  );
}
