import { useState, Fragment } from 'react';
import { formatPence } from '../../utils/pence';
import { overrideCategory } from '../../services/categoriser/category-override.service';
import { getActiveCategories } from '../../services/categoriser/category.service';
import { useSession } from '../../store/SessionContext';
import { useKeywordRules } from '../../hooks/useKeywordRules';
import { KeywordRulePrompt } from '../rules/KeywordRulePrompt';
import type { CategoryRecord, TransactionRecord } from '../../models/index';

const PAGE_SIZE = 50;

interface PendingOverride {
  transaction: TransactionRecord;
  fromCategory: string;
}

interface TransactionListProps {
  transactions: TransactionRecord[];
  categories: CategoryRecord[];
  onRefresh?: () => Promise<void>;
}

export function TransactionList({ transactions, categories, onRefresh }: TransactionListProps) {
  const { state } = useSession();
  const { saveRule, isSaving: isRuleSaving } = useKeywordRules();
  const sortedActiveCategories = getActiveCategories(categories).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const [page, setPage] = useState(0);
  const [pending, setPending] = useState<PendingOverride | null>(null);
  const [pendingCategory, setPendingCategory] = useState<string>('');
  const [isOverriding, setIsOverriding] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [rulePromptFor, setRulePromptFor] = useState<TransactionRecord | null>(null);
  const [ruleSaveWarning, setRuleSaveWarning] = useState<string>('');

  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const pageTransactions = transactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleEditTrigger(tx: TransactionRecord) {
    setPending({ transaction: tx, fromCategory: tx.category });
    setPendingCategory(tx.category);
    setOverrideError(null);
  }

  async function handleConfirmOverride() {
    if (!pending || pendingCategory === pending.fromCategory || !state.dirHandle) return;
    setIsOverriding(true);
    setOverrideError(null);
    try {
      await overrideCategory(pending.transaction, pendingCategory, state.dirHandle);
      const overriddenTx: TransactionRecord = { ...pending.transaction, category: pendingCategory };
      setPending(null);
      setPendingCategory('');
      setRulePromptFor(overriddenTx);
      setRuleSaveWarning('');
      await onRefresh?.();
    } catch (err) {
      setOverrideError(err instanceof Error ? err.message : 'Failed to save override');
    } finally {
      setIsOverriding(false);
    }
  }

  function handleCancelOverride() {
    setPending(null);
    setPendingCategory('');
    setOverrideError(null);
  }

  async function handleRuleConfirm(pattern: string, category: string) {
    const result = await saveRule(pattern, category);
    if (result === 'duplicate') {
      setRuleSaveWarning('An active rule for this pattern and category already exists.');
    } else {
      setRulePromptFor(null);
      setRuleSaveWarning('');
    }
  }

  function handleRuleDismiss() {
    setRulePromptFor(null);
    setRuleSaveWarning('');
  }

  // Build a composite key for the transaction that has the rule prompt open
  function txKey(tx: TransactionRecord) {
    return `${tx.date}\0${tx.description}\0${tx.amount}\0${tx.account}`;
  }

  return (
    <div>
      {/* Confirmation modal */}
      {pending && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-base font-semibold text-gray-800 mb-2">Change Category</h3>
            <p className="text-sm text-gray-600 mb-1 truncate">{pending.transaction.description}</p>
            <p className="text-sm text-gray-500 mb-3">
              Current: <strong className="text-gray-800">{pending.fromCategory}</strong>
            </p>
            <select
              value={pendingCategory}
              onChange={(e) => setPendingCategory(e.target.value)}
              className="w-full text-sm text-gray-700 border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 mb-4"
            >
              {!sortedActiveCategories.some((c) => c.name === pending.fromCategory) && (
                <option value={pending.fromCategory}>{pending.fromCategory} (inactive)</option>
              )}
              {sortedActiveCategories.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
            {overrideError && (
              <p className="text-sm text-red-600 mb-3">{overrideError}</p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelOverride}
                disabled={isOverriding}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOverride}
                disabled={pendingCategory === pending.fromCategory || isOverriding}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isOverriding ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction table */}
      <div className="overflow-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Date</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Description</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Amount</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Category</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Account</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Person</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-400">
                  No transactions
                </td>
              </tr>
            ) : (
              pageTransactions.map((tx, i) => {
                const key = `${tx.contentHash}-${tx.date}-${i}`;
                const isPromptRow = rulePromptFor !== null && txKey(tx) === txKey(rulePromptFor);
                return (
                  <Fragment key={key}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{tx.date}</td>
                      <td className="px-3 py-2 text-gray-700 max-w-xs truncate">{tx.description}</td>
                      <td
                        className={`px-3 py-2 text-right font-mono whitespace-nowrap ${
                          tx.amount < 0 ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {formatPence(tx.amount)}
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-sm text-gray-700">{tx.category}</span>
                        <button
                          onClick={() => handleEditTrigger(tx)}
                          className="ml-2 text-xs text-indigo-600 border border-indigo-200 rounded px-1.5 py-0.5 hover:bg-indigo-50"
                        >
                          Edit
                        </button>
                      </td>
                      <td className="px-3 py-2 text-gray-700 truncate max-w-[10rem]">{tx.account}</td>
                      <td className="px-3 py-2 text-gray-700">{tx.personName}</td>
                    </tr>
                    {isPromptRow && rulePromptFor && (
                      <tr>
                        <td colSpan={6} className="p-0">
                          <KeywordRulePrompt
                            transactionDescription={rulePromptFor.description}
                            category={rulePromptFor.category}
                            onConfirm={handleRuleConfirm}
                            onDismiss={handleRuleDismiss}
                            duplicateWarning={ruleSaveWarning || undefined}
                            isSaving={isRuleSaving}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
          <span>
            Showing {page * PAGE_SIZE + 1}–
            {Math.min((page + 1) * PAGE_SIZE, transactions.length)} of {transactions.length}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
