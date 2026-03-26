import { useState } from 'react';

interface BudgetEditPanelProps {
  category: string;
  month: string;
  currentAmount: number;
  currentMonth: string;
  onSave: (amount: number, reason: string) => Promise<void>;
  onClose: () => void;
}

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function BudgetEditPanel({
  category,
  month,
  currentAmount,
  currentMonth,
  onSave,
  onClose,
}: BudgetEditPanelProps) {
  const isPast = month < currentMonth;

  const [amountStr, setAmountStr] = useState(
    currentAmount > 0 ? (currentAmount / 100).toFixed(2) : '',
  );
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountPence = Math.round(parseFloat(amountStr || '0') * 100);
  const reasonValid = !isPast || reason.trim().length > 0;
  const canSave = amountStr !== '' && !isNaN(amountPence) && amountPence >= 0 && reasonValid;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(amountPence, reason);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save budget');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-800">
          Edit budget — {category}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {isPast && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
          You are editing the budget for {monthLabel(month)}, not your current budget. This will
          update the historical record for that period.
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Monthly budget (£)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason{isPast ? ' (required)' : ' (optional)'}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder={isPast ? 'Why are you editing a past budget?' : 'Optional note'}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
