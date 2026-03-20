import { useState } from 'react';

interface FileSelectScreenProps {
  onFileSelected: (file: File) => void;
  isDetecting: boolean;
  error: string | null;
}

export function FileSelectScreen({ onFileSelected, isDetecting, error }: FileSelectScreenProps) {
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleClick() {
    setLocalError(null);

    let fileHandle: FileSystemFileHandle;
    try {
      [fileHandle] = await window.showOpenFilePicker({
        types: [{ description: 'CSV files', accept: { 'text/csv': ['.csv'] } }],
        multiple: false,
      });
    } catch (err) {
      // User dismissed the picker — not an error
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setLocalError('Could not open file picker');
      return;
    }

    const file = await fileHandle.getFile();

    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setLocalError('Only CSV files are supported');
      return;
    }

    onFileSelected(file);
  }

  const displayError = localError ?? error;

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-800 mb-1">Import Bank CSV</h2>
        <p className="text-gray-500 text-sm">
          Select a CSV export from your UK bank account. Nationwide and NewDay formats are
          auto-detected.
        </p>
      </div>

      <div className="w-full max-w-sm">
        <button
          onClick={handleClick}
          disabled={isDetecting}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDetecting ? (
            <p className="text-indigo-600 font-medium">Detecting format…</p>
          ) : (
            <p className="text-gray-400">Click to choose a CSV file</p>
          )}
        </button>
      </div>

      {displayError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 max-w-sm w-full text-center">
          {displayError}
        </div>
      )}
    </div>
  );
}
