import { useState } from 'react';
import type { CategoryRecord, ResolvedKeywordRule, TransactionRecord } from '../../models/index';
import { getActiveCategories } from '../../services/categoriser/category.service';
import { saveKeywordRule, isDuplicateRule } from '../../services/categoriser/keyword-rules.service';
import { serialiseRecord } from '../../services/ledger/ledger-writer';
import { useLedger } from '../../hooks/useLedger';

interface KeywordRulesScreenProps {
  rules: ResolvedKeywordRule[];
  categories: CategoryRecord[];
  isLoading: boolean;
  onToggleStatus: (pattern: string, newStatus: 'active' | 'inactive') => Promise<void>;
  error?: string | null;
}

export function KeywordRulesScreen({
  rules,
  categories,
  isLoading,
  onToggleStatus,
  error,
}: KeywordRulesScreenProps) {
  const { records, appendRecords } = useLedger();

  const [pattern, setPattern] = useState('');
  const [category, setCategory] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingRetro, setPendingRetro] = useState<{ pattern: string; category: string } | null>(null);
  const [retroResult, setRetroResult] = useState<string | null>(null);

  const activeCategories = getActiveCategories(categories).sort((a, b) => a.name.localeCompare(b.name));
  const transactions = records.filter((r): r is TransactionRecord => r.type === 'transaction');
  const canSave = pattern.trim().length > 0 && category.length > 0;

  async function handleSave() {
    const trimmed = pattern.trim();
    if (!trimmed || !category) return;
    setSaveError(null);
    setRetroResult(null);

    if (isDuplicateRule(trimmed, category, rules)) {
      setSaveError(`A rule for "${trimmed}" → "${category}" already exists.`);
      return;
    }

    try {
      await saveKeywordRule(trimmed, category, {} as FileSystemDirectoryHandle, appendRecords);
      setPattern('');
      setCategory('');
      setPendingRetro({ pattern: trimmed, category });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save rule');
    }
  }

  async function handleApplyRetro() {
    if (!pendingRetro) return;
    const { pattern: p, category: cat } = pendingRetro;
    const lower = p.toLowerCase();
    const matching = transactions.filter((tx) => tx.description.toLowerCase().includes(lower));
    setPendingRetro(null);

    if (matching.length === 0) {
      setRetroResult('No matching transactions found');
      return;
    }

    try {
      const rows = matching.map((tx) => serialiseRecord({ ...tx, category: cat }));
      await appendRecords(rows);
      setRetroResult(`Updated ${matching.length} transaction${matching.length !== 1 ? 's' : ''}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to apply rule retroactively');
    }
  }

  function handleDismissRetro() {
    setPendingRetro(null);
    setRetroResult(null);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Keyword Rules</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Add Rule Form */}
      <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg">
        <h2 className="text-lg font-medium mb-3">Add Rule</h2>
        <div className="flex flex-col gap-1">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Keyword pattern</label>
              <input
                type="text"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleSave(); }}
                placeholder="e.g. TESCO"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="">Select category…</option>
                {activeCategories.map((cat) => (
                  <option key={cat.name} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => void handleSave()}
              disabled={!canSave}
              style={{
                background: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                padding: '8px 20px',
                fontSize: 14,
                cursor: canSave ? 'pointer' : 'not-allowed',
                opacity: canSave ? 1 : 0.5,
                height: 38,
                whiteSpace: 'nowrap',
              }}
            >
              Save
            </button>
          </div>
          <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>
            Only active categories are shown. Manage categories in the Categories screen.
          </p>
        </div>

        {saveError && <p className="mt-2 text-sm text-red-600">{saveError}</p>}

        {pendingRetro && (
          <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded text-sm text-indigo-900">
            <p className="font-medium mb-2">Apply this rule to existing transactions that match this pattern?</p>
            <div className="flex gap-2">
              <button
                onClick={() => void handleApplyRetro()}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 border-none cursor-pointer"
              >
                Yes, apply now
              </button>
              <button
                onClick={handleDismissRetro}
                className="px-3 py-1.5 bg-white text-indigo-700 rounded text-sm border border-indigo-300 hover:bg-indigo-50 cursor-pointer"
              >
                No, future imports only
              </button>
            </div>
          </div>
        )}

        {retroResult && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
            {retroResult}
          </div>
        )}
      </div>

      {/* Rules list */}
      {isLoading ? (
        <p className="text-gray-500">Loading…</p>
      ) : rules.length === 0 ? (
        <div className="p-8 text-center text-gray-500 border border-dashed border-gray-300 rounded-lg">
          <p className="text-base font-medium">No keyword rules saved yet.</p>
          <p className="text-sm mt-1">
            Add a rule above or override a transaction category during import.
          </p>
        </div>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 text-left bg-[#ede9fe] border-[#c4b5fd] text-[#4338ca]">
              <th className="pb-2 font-semibold text-[13px]">Pattern</th>
              <th className="pb-2 font-semibold text-[13px]">Category</th>
              <th className="pb-2 font-semibold text-[13px]">Created</th>
              <th className="pb-2 font-semibold text-[13px]">Status</th>
              <th className="pb-2 font-semibold text-[13px]">Action</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr
                key={rule.pattern}
                className={`border-b border-gray-100 ${rule.categoryIsInactive ? 'opacity-60' : ''}`}
              >
                <td className="py-3 font-mono text-sm">{rule.pattern}</td>
                <td className="py-3">
                  <span className={rule.categoryIsInactive ? 'text-gray-400' : ''}>
                    {rule.category}
                  </span>
                  {rule.categoryIsInactive && (
                    <span className="ml-2 text-xs text-amber-600">(category inactive)</span>
                  )}
                </td>
                <td className="py-3 text-sm text-gray-600">
                  {rule.createdDate.slice(0, 16).replace('T', ' ')}
                </td>
                <td className="py-3">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      rule.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {rule.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-3">
                  <button
                    onClick={() =>
                      void onToggleStatus(
                        rule.pattern,
                        rule.status === 'active' ? 'inactive' : 'active',
                      )
                    }
                    style={{
                      background: rule.status === 'active' ? '#ef4444' : '#22c55e',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      padding: '4px 10px',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = rule.status === 'active' ? '#dc2626' : '#16a34a'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = rule.status === 'active' ? '#ef4444' : '#22c55e'; }}
                  >
                    {rule.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
