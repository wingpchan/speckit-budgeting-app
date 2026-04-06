import { useState, useEffect, Fragment } from 'react';
import { formatPence } from '../../utils/pence';
import { overrideCategory, overrideCategoryAll } from '../../services/categoriser/category-override.service';
import { getActiveCategories } from '../../services/categoriser/category.service';
import { findConflictingRule } from '../../services/categoriser/keyword-rules.service';
import { useSession } from '../../store/SessionContext';
import { useFilter } from '../../hooks/useFilter';
import { usePersonFilter, filterByPerson } from '../../hooks/usePersonFilter';
import { useKeywordRules } from '../../hooks/useKeywordRules';
import { KeywordRulePrompt } from '../rules/KeywordRulePrompt';
import type { CategoryRecord, TransactionRecord } from '../../models/index';

const PAGE_SIZE = 50;

interface PendingOverride {
  transaction: TransactionRecord;
  fromCategory: string;
  /** Set once the user clicks Confirm on step 1 — presence drives step-2 UI */
  confirmedCategory?: string;
}

interface TransactionListProps {
  transactions: TransactionRecord[];
  categories: CategoryRecord[];
  onRefresh?: () => Promise<void>;
}

export function TransactionList({ transactions, categories, onRefresh }: TransactionListProps) {
  const { state } = useSession();
  const { start, end } = useFilter();
  const personFilter = usePersonFilter();
  const { rules, saveRule, isSaving: isRuleSaving } = useKeywordRules();
  const sortedActiveCategories = getActiveCategories(categories).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const [page, setPage] = useState(0);

  // Reset to page 0 whenever date or person filter changes
  useEffect(() => {
    setPage(0);
  }, [start, end, personFilter]);
  const [pending, setPending] = useState<PendingOverride | null>(null);
  const [pendingCategory, setPendingCategory] = useState<string>('');
  const [isOverriding, setIsOverriding] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [rulePromptFor, setRulePromptFor] = useState<TransactionRecord | null>(null);
  const [ruleSaveWarning, setRuleSaveWarning] = useState<string>('');
  const [ruleConflictWarned, setRuleConflictWarned] = useState(false);

  const filteredTransactions = filterByPerson(
    transactions.filter((tx) => tx.date >= start && tx.date <= end),
    personFilter,
  );
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));
  const pageTransactions = filteredTransactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleEditTrigger(tx: TransactionRecord) {
    setPending({ transaction: tx, fromCategory: tx.category });
    setPendingCategory(tx.category);
    setOverrideError(null);
  }

  function handleConfirmOverride() {
    if (!pending || pendingCategory === pending.fromCategory) return;
    setOverrideError(null);
    // Embed the chosen category directly into pending — single atom drives step-2 UI
    setPending({ ...pending, confirmedCategory: pendingCategory });
  }

  async function handleScopeJustThis() {
    if (!pending?.confirmedCategory || !state.dirHandle) return;
    const newCategory = pending.confirmedCategory;
    setIsOverriding(true);
    setOverrideError(null);
    try {
      await overrideCategory(pending.transaction, newCategory, state.dirHandle);
      const overriddenTx: TransactionRecord = { ...pending.transaction, category: newCategory };
      setPending(null);
      setPendingCategory('');
      setRulePromptFor(overriddenTx);
      setRuleSaveWarning('');
      setRuleConflictWarned(false);
      await onRefresh?.();
    } catch (err) {
      setOverrideError(err instanceof Error ? err.message : 'Failed to save override');
    } finally {
      setIsOverriding(false);
    }
  }

  async function handleScopeAll() {
    if (!pending?.confirmedCategory || !state.dirHandle) return;
    const newCategory = pending.confirmedCategory;
    setIsOverriding(true);
    setOverrideError(null);
    try {
      await overrideCategoryAll(pending.transaction.description, newCategory, transactions, state.dirHandle);
      const overriddenTx: TransactionRecord = { ...pending.transaction, category: newCategory };
      setPending(null);
      setPendingCategory('');
      setRulePromptFor(overriddenTx);
      setRuleSaveWarning('');
      setRuleConflictWarned(false);
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
    if (!ruleConflictWarned) {
      const conflict = findConflictingRule(pattern, category, rules);
      if (conflict) {
        setRuleSaveWarning(
          `A rule for this pattern already maps to "${conflict.category}". Click Confirm again to replace it.`,
        );
        setRuleConflictWarned(true);
        return;
      }
    }
    const result = await saveRule(pattern, category);
    if (result === 'duplicate') {
      setRuleSaveWarning('An active rule for this pattern and category already exists.');
      setRuleConflictWarned(false);
    } else {
      setRulePromptFor(null);
      setRuleSaveWarning('');
      setRuleConflictWarned(false);
    }
  }

  function handleRuleDismiss() {
    setRulePromptFor(null);
    setRuleSaveWarning('');
    setRuleConflictWarned(false);
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
            <h3 className="text-base font-semibold text-gray-800 pb-3 mb-3 border-b border-gray-200">Change Category</h3>
            <p className="mb-3 truncate">
              <span className="inline-block rounded px-2 py-0.5 font-medium" style={{ background: '#f5f4ff', color: '#4338ca', fontSize: 15 }}>
                {pending.transaction.description}
              </span>
            </p>
            {!pending.confirmedCategory ? (
              <>
                <p className="text-sm text-gray-500 mb-3">
                  Current: <strong className="text-gray-800">{pending.fromCategory}</strong>
                </p>
                <select
                  value={pendingCategory}
                  onChange={(e) => setPendingCategory(e.target.value)}
                  className="w-full text-sm text-gray-700 border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline focus:outline-2 focus:outline-indigo-500 focus:border-indigo-500 mb-4"
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
                    className="px-5 py-2 text-sm font-medium text-indigo-500 bg-transparent border border-indigo-500 rounded-md cursor-pointer hover:bg-indigo-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmOverride}
                    disabled={pendingCategory === pending.fromCategory}
                    className="px-5 py-2 text-sm font-medium text-white bg-indigo-500 border-none rounded-md cursor-pointer hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirm
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  Update just this transaction, or all transactions with the same description?
                </p>
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
                    onClick={handleScopeJustThis}
                    disabled={isOverriding}
                    className="px-4 py-2 border border-indigo-300 text-indigo-700 text-sm font-medium rounded hover:bg-indigo-50 disabled:opacity-50"
                  >
                    {isOverriding ? 'Saving…' : 'Just this one'}
                  </button>
                  <button
                    onClick={handleScopeAll}
                    disabled={isOverriding}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isOverriding ? 'Saving…' : 'All matching'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Pagination — top */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mb-3 text-sm text-gray-500">
          <span>
            Showing {page * PAGE_SIZE + 1}–
            {Math.min((page + 1) * PAGE_SIZE, filteredTransactions.length)} of {filteredTransactions.length}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3.5 py-1.5 text-white bg-indigo-500 border-none rounded-md cursor-pointer hover:bg-indigo-600 disabled:bg-[#c7d2fe] disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3.5 py-1.5 text-white bg-indigo-500 border-none rounded-md cursor-pointer hover:bg-indigo-600 disabled:bg-[#c7d2fe] disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Transaction table */}
      <div className="overflow-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-[#ede9fe] border-b-2 border-[#c4b5fd]">
            <tr>
              <th className="text-left px-3 py-2 font-semibold text-[#4338ca] text-[13px]">Date</th>
              <th className="text-left px-3 py-2 font-semibold text-[#4338ca] text-[13px]">Description</th>
              <th className="text-right px-3 py-2 font-semibold text-[#4338ca] text-[13px]">Amount</th>
              <th className="text-left px-3 py-2 font-semibold text-[#4338ca] text-[13px]">Category</th>
              <th className="text-left px-3 py-2 font-semibold text-[#4338ca] text-[13px]">Account</th>
              <th className="text-left px-3 py-2 font-semibold text-[#4338ca] text-[13px]">Person</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-400">
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
                      <td className="px-3 py-2 text-sm text-gray-700">{tx.category}</td>
                      <td className="px-3 py-2 text-gray-700 truncate max-w-[10rem]">{tx.account}</td>
                      <td className="px-3 py-2 text-gray-700">{tx.personName}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => handleEditTrigger(tx)}
                          title="Edit transaction category"
                          className="text-xs text-white bg-indigo-500 border-none rounded-md px-2 py-0.5 cursor-pointer hover:bg-indigo-600"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                    {isPromptRow && rulePromptFor && (
                      <tr>
                        <td colSpan={7} className="p-0">
                          <KeywordRulePrompt
                            transactionDescription={rulePromptFor.description}
                            category={rulePromptFor.category}
                            onConfirm={handleRuleConfirm}
                            onDismiss={handleRuleDismiss}
                            duplicateWarning={!ruleConflictWarned ? (ruleSaveWarning || undefined) : undefined}
                            overrideWarning={ruleConflictWarned ? (ruleSaveWarning || undefined) : undefined}
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
            {Math.min((page + 1) * PAGE_SIZE, filteredTransactions.length)} of {filteredTransactions.length}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3.5 py-1.5 text-white bg-indigo-500 border-none rounded-md cursor-pointer hover:bg-indigo-600 disabled:bg-[#c7d2fe] disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3.5 py-1.5 text-white bg-indigo-500 border-none rounded-md cursor-pointer hover:bg-indigo-600 disabled:bg-[#c7d2fe] disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
