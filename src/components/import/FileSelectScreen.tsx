import { useRef, useState } from 'react';

interface FileSelectScreenProps {
  onFileSelected: (file: File) => void;
  isDetecting: boolean;
  error: string | null;
}

export function FileSelectScreen({ onFileSelected, isDetecting, error }: FileSelectScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLocalError(null);

    // Reject non-CSV at read time
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setLocalError('Only CSV files are supported');
      // Reset input so the same file can be re-selected after error is cleared
      if (inputRef.current) inputRef.current.value = '';
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

      <label className="flex flex-col items-center gap-3 cursor-pointer w-full max-w-sm">
        <div className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors">
          {isDetecting ? (
            <p className="text-indigo-600 font-medium">Detecting format…</p>
          ) : (
            <>
              <p className="text-gray-400 mb-2">Click to choose a CSV file</p>
              <p className="text-xs text-gray-300">or drag and drop</p>
            </>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={handleChange}
          disabled={isDetecting}
        />
      </label>

      {displayError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 max-w-sm w-full text-center">
          {displayError}
        </div>
      )}
    </div>
  );
}
