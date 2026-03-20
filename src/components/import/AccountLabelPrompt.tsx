import { useState } from 'react';

interface AccountLabelPromptProps {
  initialLabel?: string;
  onConfirm: (account: string) => void;
  onCancel: () => void;
}

export function AccountLabelPrompt({ initialLabel, onConfirm, onCancel }: AccountLabelPromptProps) {
  const [label, setLabel] = useState(initialLabel ?? '');
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    const trimmed = label.trim();
    if (!trimmed) {
      setError('Account label cannot be empty');
      return;
    }
    setError(null);
    onConfirm(trimmed);
  }

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Name This Account</h2>
      <p className="text-sm text-gray-500 mb-4">
        {initialLabel
          ? 'We detected this account name from the CSV. Please confirm or edit it before continuing.'
          : 'The account name could not be read from this CSV file. Enter a label to identify this account (e.g. "Nationwide Current Account", "NewDay Credit Card").'}
        <br />
        <span className="text-xs text-gray-400 mt-1 block">
          Note: filename-derived labels are not accepted — please enter a descriptive name.
        </span>
      </p>

      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
        placeholder="e.g. Nationwide Current Account"
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        autoFocus
      />

      {error && <p className="text-red-600 text-xs mb-3">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={handleConfirm}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700"
        >
          Continue
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
