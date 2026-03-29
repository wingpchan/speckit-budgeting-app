import { useState, useEffect, useRef } from 'react';
import { useLedger } from '../../hooks/useLedger';
import { serialiseRecord } from '../../services/ledger/ledger-writer';
import type { AccountPersonMappingRecord, PersonRecord } from '../../models/index';

interface AssignAccountModalProps {
  accountName: string;
  activePeople: PersonRecord[];
  onClose: () => void;
}

export function AssignAccountModal({ accountName, activePeople, onClose }: AssignAccountModalProps) {
  const { appendRecords } = useLedger();
  const today = new Date().toISOString().slice(0, 10);

  const defaultPerson =
    activePeople.find((p) => p.name === 'Household')?.name ??
    activePeople[0]?.name ??
    'Household';

  const [selectedPerson, setSelectedPerson] = useState(defaultPerson);
  const [effectiveDate, setEffectiveDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus the select on mount
  useEffect(() => {
    dialogRef.current?.querySelector<HTMLSelectElement>('select')?.focus();
  }, []);

  // Focus trap + Escape → close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), select, input, [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleConfirm() {
    if (!selectedPerson || !effectiveDate) {
      setError('Please select a person and effective date.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const record: AccountPersonMappingRecord = {
        type: 'accountPersonMapping',
        accountName,
        personName: selectedPerson,
        effectiveDate,
      };
      await appendRecords([serialiseRecord(record)]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save assignment');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-account-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <div ref={dialogRef} className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 id="assign-account-title" className="text-lg font-semibold mb-4">Reassign Account</h2>
        <p className="text-sm text-gray-600 mb-4">
          Account: <span className="font-medium">{accountName}</span>
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assign to Person
          </label>
          <select
            value={selectedPerson}
            onChange={(e) => setSelectedPerson(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {activePeople.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Effective Date
          </label>
          <input
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
