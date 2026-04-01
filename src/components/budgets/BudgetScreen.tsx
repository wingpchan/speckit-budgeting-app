import { useState, useEffect, useMemo } from 'react';
import { useLedger } from '../../hooks/useLedger';
import { resolveBudget, getBudgetState, saveBudget } from '../../services/budget/budget.service';
import { getActiveCategories } from '../../services/categoriser/category.service';
import { useSession } from '../../store/SessionContext';
import { BudgetStateIndicator } from './BudgetStateIndicator';
import { BudgetEditPanel } from './BudgetEditPanel';
import { BudgetHealthBar } from './BudgetHealthBar';
import type { CategoryRecord, BudgetRecord, TransactionRecord } from '../../models/index';

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function prevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  if (m === 12) return `${y + 1}-01`;
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function BudgetScreen() {
  const { state } = useSession();
  const { records, isLoading, refresh, appendRecords } = useLedger();

  const [month, setMonth] = useState(getCurrentMonth);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  const currentMonth = getCurrentMonth();

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoryRecords = records.filter((r): r is CategoryRecord => r.type === 'category');
  const budgetRecords = records.filter((r): r is BudgetRecord => r.type === 'budget');
  const transactionRecords = records.filter((r): r is TransactionRecord => r.type === 'transaction');

  const activeCategories = useMemo(
    () => getActiveCategories(categoryRecords).sort((a, b) => a.name.localeCompare(b.name)),
    [categoryRecords],
  );

  // Compute actual spend per category for the displayed month
  const actualByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactionRecords) {
      if (t.date.slice(0, 7) === month && t.transactionType === 'expense') {
        map.set(t.category, (map.get(t.category) ?? 0) + Math.abs(t.amount));
      }
    }
    return map;
  }, [transactionRecords, month]);

  // Per-category rows with budget, actual, state
  const rows = useMemo(() =>
    activeCategories.map((cat) => {
      const budget = resolveBudget(month, cat.name, budgetRecords);
      const actual = actualByCategory.get(cat.name) ?? 0;
      const stateVal = getBudgetState(actual, budget);
      const hasBudget = budgetRecords.some((r) => r.category === cat.name);
      return { name: cat.name, budget, actual, state: stateVal, hasBudget };
    }),
    [activeCategories, month, budgetRecords, actualByCategory],
  );

  const totalBudget = rows.reduce((sum, r) => sum + r.budget, 0);
  const totalActual = rows.reduce((sum, r) => sum + r.actual, 0);

  async function handleSave(category: string, amount: number, reason: string) {
    if (!state.dirHandle) throw new Error('No ledger directory selected');
    await saveBudget(month, category, amount, reason, state.dirHandle, appendRecords);
  }

  const editingRow = editingCategory ? rows.find((r) => r.name === editingCategory) : null;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Budgets</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMonth(prevMonth(month))}
            className="px-3 py-1.5 rounded border border-gray-300 text-sm hover:bg-gray-100"
          >
            ← Prev
          </button>
          <span className="text-base font-medium w-36 text-center">{monthLabel(month)}</span>
          <button
            onClick={() => setMonth(nextMonth(month))}
            className="px-3 py-1.5 rounded border border-gray-300 text-sm hover:bg-gray-100"
          >
            Next →
          </button>
        </div>
      </div>

      <BudgetHealthBar totalActual={totalActual} totalBudget={totalBudget} />

      {editingCategory && editingRow && (
        <BudgetEditPanel
          category={editingCategory}
          month={month}
          currentAmount={editingRow.budget}
          currentMonth={currentMonth}
          onSave={(amount, reason) => handleSave(editingCategory, amount, reason)}
          onClose={() => setEditingCategory(null)}
        />
      )}

      {isLoading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
              <th className="pb-2 font-medium">Category</th>
              <th className="pb-2 font-medium text-right">Budget</th>
              <th className="pb-2 font-medium text-right">Actual</th>
              <th className="pb-2 pl-6 font-medium">Status</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.name}
                className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                onClick={() => setEditingCategory(row.name === editingCategory ? null : row.name)}
              >
                <td className="py-3 font-medium text-gray-800">{row.name}</td>
                <td className="py-3 text-right text-gray-700 tabular-nums">
                  {row.budget > 0 ? `£${(row.budget / 100).toFixed(2)}` : <span className="text-gray-400">—</span>}
                </td>
                <td className="py-3 text-right text-gray-700 tabular-nums">
                  {row.actual > 0 ? `£${(row.actual / 100).toFixed(2)}` : <span className="text-gray-400">—</span>}
                </td>
                <td className="py-3 pl-6">
                  {row.budget > 0 ? (
                    <BudgetStateIndicator state={row.state} actual={row.actual} budget={row.budget} />
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="py-3 text-right">
                  <span className="text-sm text-blue-600 hover:underline">Edit</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
