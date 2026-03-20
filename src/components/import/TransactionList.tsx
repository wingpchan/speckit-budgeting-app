import { useState } from 'react';
import { formatPence } from '../../utils/pence';
import { overrideCategory } from '../../services/categoriser/category-override.service';
import { useCategories } from '../../hooks/useCategories';
import { useLedger } from '../../hooks/useLedger';
import { useSession } from '../../store/SessionContext';
import type { TransactionRecord } from '../../models/index';

const PAGE_SIZE = 50;

interface PendingOverride {
  transaction: TransactionRecord;
  fromCategory: string;
  toCategory: string;
}

interface TransactionListProps {
  transactions: TransactionRecord[];
}

export function TransactionList({ transactions }: TransactionListProps) {
  const { state } = useSession();
  const { refresh } = useLedger();
  const { activeCategories } = useCategories();
  const sortedActiveCategories = [...activeCategories].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const [page, setPage] = useState(0);
  const [pending, setPending] = useState<PendingOverride | null>(null);
  const [isOverriding, setIsOverriding] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const pageTransactions = transactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleCategoryChange(tx: TransactionRecord, newCategory: string) {
    if (newCategory === tx.category) return;
    setPending({ transaction: tx, fromCategory: tx.category, toCategory: newCategory });
    setOverrideError(null);
  }

  async function handleConfirmOverride() {
    if (!pending || !state.dirHandle) return;
    setIsOverriding(true);
    setOverrideError(null);
    try {
      await overrideCategory(pending.transaction, pending.toCategory, state.dirHandle);
      await refresh();
      setPending(null);
    } catch (err) {
      setOverrideError(err instanceof Error ? err.message : 'Failed to save override');
    } finally {
      setIsOverriding(false);
    }
  }

  function handleCancelOverride() {
    setPending(null);
    setOverrideError(null);
  }

  return (
    <div>
      {/* Confirmation modal */}
      {pending && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-base font-semibold text-gray-800 mb-2">Change Category</h3>
            <p className="text-sm text-gray-600 mb-4">
              Change category from{' '}
              <strong className="text-gray-800">{pending.fromCategory}</strong> to{' '}
              <strong className="text-gray-800">{pending.toCategory}</strong>?
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
                onClick={handleConfirmOverride}
                disabled={isOverriding}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 disabled:opacity-50"
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
              pageTransactions.map((tx, i) => (
                <tr key={`${tx.contentHash}-${tx.date}-${i}`} className="hover:bg-gray-50">
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
                    <select
                      value={tx.category}
                      onChange={(e) => handleCategoryChange(tx, e.target.value)}
                      className="text-sm text-gray-700 border border-gray-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    >
                      {/* Pinned at position 0: inactive current category (exempt from sort) */}
                      {!sortedActiveCategories.some((c) => c.name === tx.category) && (
                        <option value={tx.category}>{tx.category}</option>
                      )}
                      {sortedActiveCategories.map((cat) => (
                        <option key={cat.name} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-gray-700 truncate max-w-[10rem]">{tx.account}</td>
                  <td className="px-3 py-2 text-gray-700">{tx.personName}</td>
                </tr>
              ))
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
