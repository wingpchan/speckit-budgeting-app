import { useState } from 'react';
import { openLedger, detectExistingLedger } from '../../services/ledger/ledger-opener';
import { createNewLedger } from '../../services/ledger/ledger-initialiser';
import { saveDirectoryHandle } from '../../services/ledger/handle-store';
import { useSession } from '../../store/SessionContext';
import type { ViewId } from './Layout';

interface ChooseFolderProps {
  onSuccess: (view: ViewId) => void;
}

export function ChooseFolder({ onSuccess }: ChooseFolderProps) {
  const { dispatch } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [migrationRequired, setMigrationRequired] = useState(false);

  async function handleChooseFolder() {
    setIsLoading(true);
    setError(null);
    setMigrationRequired(false);

    try {
      const dirHandle = await openLedger();
      const status = await detectExistingLedger(dirHandle);

      if (status === 'old') {
        setMigrationRequired(true);
        setIsLoading(false);
        return;
      }

      if (status === 'new') {
        await createNewLedger(dirHandle);
      }

      await saveDirectoryHandle(dirHandle);
      dispatch({ type: 'SET_LEDGER_HANDLE', handle: dirHandle });
      onSuccess('import');
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

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">UK Bank CSV Budget Tracker</h1>
        <p className="text-gray-600 max-w-md">
          Choose a folder to store your budget ledger. All your financial data stays on your device.
        </p>
      </div>

      {migrationRequired && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md text-center">
          <p className="text-yellow-800 font-medium">Migration required (Phase 14)</p>
          <p className="text-yellow-600 text-sm mt-1">
            An older version of the ledger was found. Migration support is coming in a future update.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md text-center">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <button
        onClick={handleChooseFolder}
        disabled={isLoading}
        className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Opening…' : 'Choose Folder'}
      </button>

      <p className="text-xs text-gray-400">
        Requires a Chromium-based browser (Chrome, Edge) for File System Access API support.
      </p>
    </div>
  );
}
