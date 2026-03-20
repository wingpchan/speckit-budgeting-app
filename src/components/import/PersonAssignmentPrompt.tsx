import { useState } from 'react';
import type { AccountPersonMappingRecord, PersonRecord } from '../../models/index';
import { toISODate } from '../../utils/dates';

interface PersonAssignmentPromptProps {
  account: string;
  activePeople: PersonRecord[];
  earliestTransactionDate: string;
  onConfirm: (mapping: AccountPersonMappingRecord) => void;
  onCancel: () => void;
}

export function PersonAssignmentPrompt({
  account,
  activePeople,
  earliestTransactionDate,
  onConfirm,
  onCancel,
}: PersonAssignmentPromptProps) {
  const [personName, setPersonName] = useState('Household');
  const [effectiveDate, setEffectiveDate] = useState(
    earliestTransactionDate || toISODate(new Date()),
  );
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    if (!effectiveDate) {
      setError('Effective date is required');
      return;
    }
    setError(null);

    const mapping: AccountPersonMappingRecord = {
      type: 'accountPersonMapping',
      accountName: account,
      personName,
      effectiveDate,
    };

    onConfirm(mapping);
  }

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Assign Account to Person</h2>
      <p className="text-sm text-gray-500 mb-4">
        Transactions from <strong>{account}</strong> have no person assignment. Choose who this
        account belongs to.
      </p>

      <div className="space-y-3 mb-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Person</span>
          <select
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          >
            {activePeople.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Effective from</span>
          <input
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <span className="text-xs text-gray-400">
            Defaults to the earliest transaction date in this import.
          </span>
        </label>
      </div>

      {error && <p className="text-red-600 text-xs mb-3">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={handleConfirm}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700"
        >
          Confirm
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
