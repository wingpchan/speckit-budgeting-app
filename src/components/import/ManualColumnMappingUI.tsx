import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import type { CanonicalField, ColumnMapping, DetectionHints } from '../../models/index';

const CANONICAL_FIELDS: CanonicalField[] = [
  'date',
  'description',
  'amount',
  'paidOut',
  'paidIn',
  'balance',
  'transactionType',
  'ignore',
];

const REQUIRED_FIELDS: CanonicalField[] = ['date', 'description'];
const REQUIRED_AMOUNT_FIELDS: CanonicalField[] = ['amount', 'paidOut', 'paidIn'];

interface ManualColumnMappingUIProps {
  file: File;
  suggestedHeaders: string[];
  suggestedMappings: Partial<ColumnMapping>[];
  onApply: (
    mappings: ColumnMapping[],
    hints: Pick<DetectionHints, 'metadataRowCount' | 'dateFormat'>,
  ) => void;
  onCancel: () => void;
}

export function ManualColumnMappingUI({
  file,
  suggestedHeaders,
  suggestedMappings,
  onApply,
  onCancel,
}: ManualColumnMappingUIProps) {
  const [headers, setHeaders] = useState<string[]>(suggestedHeaders);
  const [assignments, setAssignments] = useState<Record<string, CanonicalField | ''>>(() => {
    const initial: Record<string, CanonicalField | ''> = {};
    for (const header of suggestedHeaders) {
      const suggested = suggestedMappings.find((m) => m.sourceHeader === header);
      initial[header] = suggested?.canonicalField ?? '';
    }
    return initial;
  });
  const [saveAsProfile, setSaveAsProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [metadataRowCount, setMetadataRowCount] = useState(0);
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');

  useEffect(() => {
    let cancelled = false;
    void file.text().then((text) => {
      if (cancelled) return;
      const lines = text.split(/\r?\n/);
      const headerLine = lines[metadataRowCount] ?? '';
      const parsed = Papa.parse<string[]>(headerLine, { header: false });
      const newHeaders = (parsed.data[0] as string[] | undefined) ?? [];
      setHeaders(newHeaders);
      setAssignments((prev) => {
        const next: Record<string, CanonicalField | ''> = {};
        for (const h of newHeaders) {
          next[h] = prev[h] ?? '';
        }
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [file, metadataRowCount]);

  function isValid(): boolean {
    const assignedFields = Object.values(assignments);
    const hasDate = assignedFields.includes('date');
    const hasDesc = assignedFields.includes('description');
    const hasAmount = REQUIRED_AMOUNT_FIELDS.some((f) => assignedFields.includes(f));
    return hasDate && hasDesc && hasAmount;
  }

  function handleApply() {
    const mappings: ColumnMapping[] = headers
      .filter((h) => assignments[h] && assignments[h] !== '')
      .map((h) => ({
        sourceHeader: h,
        canonicalField: assignments[h] as CanonicalField,
      }));

    onApply(mappings, { metadataRowCount, dateFormat });
  }

  function fieldClass(field: CanonicalField | ''): string {
    if (REQUIRED_FIELDS.includes(field as CanonicalField)) {
      if (!Object.values(assignments).includes(field as CanonicalField)) {
        return 'border-red-400 bg-red-50';
      }
    }
    return 'border-gray-300 bg-white';
  }

  const assignedFields = Object.values(assignments);
  const hasMissingRequired =
    !assignedFields.includes('date') ||
    !assignedFields.includes('description') ||
    !REQUIRED_AMOUNT_FIELDS.some((f) => assignedFields.includes(f));

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Map Column Headers</h2>
        <p className="text-sm text-gray-500 mt-1">
          Assign each CSV column to the correct field. Required:{' '}
          <strong>Date</strong>, <strong>Description</strong>, and at least one amount column.
        </p>
      </div>

      {/* Metadata row count and date format */}
      <div className="flex gap-4 mb-4">
        <label className="flex flex-col gap-1 flex-1">
          <span className="text-xs font-medium text-gray-600">Metadata rows to skip</span>
          <input
            type="number"
            min={0}
            max={10}
            value={metadataRowCount}
            onChange={(e) => setMetadataRowCount(Number(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 flex-1">
          <span className="text-xs font-medium text-gray-600">Date format</span>
          <select
            value={dateFormat}
            onChange={(e) => setDateFormat(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="DD Mon YYYY">DD Mon YYYY (e.g. 15 Mar 2026)</option>
            <option value="ISO">YYYY-MM-DD (ISO)</option>
          </select>
        </label>
      </div>

      <div className="space-y-2 mb-4">
        {headers.map((header) => {
          const current = assignments[header] ?? '';
          const isMissing =
            (REQUIRED_FIELDS.includes(current as CanonicalField) ||
              REQUIRED_AMOUNT_FIELDS.includes(current as CanonicalField)) &&
            hasMissingRequired;

          return (
            <div key={header} className="flex items-center gap-3">
              <span
                className={`flex-1 text-sm font-mono px-2 py-1 rounded ${isMissing ? 'text-red-700 bg-red-50' : 'text-gray-700 bg-gray-100'}`}
              >
                {header}
              </span>
              <select
                value={current}
                onChange={(e) =>
                  setAssignments((prev) => ({ ...prev, [header]: e.target.value as CanonicalField | '' }))
                }
                className={`border rounded px-2 py-1 text-sm ${fieldClass(current as CanonicalField)}`}
              >
                <option value="">— skip —</option>
                {CANONICAL_FIELDS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      {hasMissingRequired && (
        <p className="text-red-600 text-sm mb-3">
          Please map Date, Description, and at least one amount field (amount, paidOut, or paidIn).
        </p>
      )}

      {/* Save as profile */}
      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={saveAsProfile}
            onChange={(e) => setSaveAsProfile(e.target.checked)}
          />
          Save as named profile for future imports
        </label>
        {saveAsProfile && (
          <input
            type="text"
            placeholder="Profile name (e.g. My Bank)"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            className="mt-2 w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
          />
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleApply}
          disabled={!isValid()}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Apply Mapping
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
