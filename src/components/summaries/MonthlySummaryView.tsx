import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useSummaries } from '../../hooks/useSummaries';
import { useSession } from '../../store/SessionContext';
import { resolveBudget, getBudgetState, getBudgetChanges } from '../../services/budget/budget.service';
import { getPrevMonth, getNextMonth, toMonthLabel } from '../../utils/dates';
import { BudgetStateIndicator } from '../budgets/BudgetStateIndicator';
import { BudgetChangeAnnotation } from './BudgetChangeAnnotation';
import type { TransactionRecord, BudgetRecord } from '../../models/index';

function formatPence(pence: number): string {
  return `£${(Math.abs(pence) / 100).toFixed(2)}`;
}

interface MonthlySummaryViewProps {
  transactions: TransactionRecord[];
  budgetRecords: BudgetRecord[];
}

export function MonthlySummaryView({ transactions, budgetRecords }: MonthlySummaryViewProps) {
  const { state, dispatch } = useSession();
  const { summaries } = useSummaries(transactions, 'monthly');

  // Current month is the month the session date filter is pointing at
  const currentMonth = state.dateFilter.start.slice(0, 7);

  function navigateTo(yyyyMm: string) {
    const [y, m] = yyyyMm.split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
    const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    dispatch({ type: 'SET_DATE_FILTER', start, end });
  }

  // Summary for the currently displayed month (may be absent if no transactions)
  const current = summaries.find((s) => s.periodKey === currentMonth);

  // Per-category rows: actual vs budget
  const categoryRows = current
    ? Object.entries(current.byCategory).map(([name, actual]) => {
        const budget = resolveBudget(currentMonth, name, budgetRecords);
        const state = budget > 0 ? getBudgetState(actual, budget) : 'ok';
        return { name, actual, budget, state };
      })
    : [];

  // Bar chart data: category spend
  const barData = categoryRows.map((r) => ({ name: r.name, Actual: r.actual, Budget: r.budget }));

  // Budget change annotations for this month
  const changesThisMonth = current
    ? Object.keys(current.byCategory).flatMap((cat) =>
        getBudgetChanges(cat, budgetRecords).filter((c) => c.month === currentMonth && c.reason),
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Month navigator */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Monthly Summary</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo(getPrevMonth(currentMonth))}
            className="px-3 py-1.5 rounded border border-gray-300 text-sm hover:bg-gray-100"
          >
            ← Prev
          </button>
          <span className="text-base font-medium w-36 text-center">
            {toMonthLabel(currentMonth)}
          </span>
          <button
            onClick={() => navigateTo(getNextMonth(currentMonth))}
            className="px-3 py-1.5 rounded border border-gray-300 text-sm hover:bg-gray-100"
          >
            Next →
          </button>
        </div>
      </div>

      {!current ? (
        <p className="text-gray-500 text-sm py-4">No transactions in {toMonthLabel(currentMonth)}.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Income</p>
              <p className="text-xl font-semibold text-green-700 mt-1">
                {formatPence(current.totalIncome)}
              </p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Expenses</p>
              <p className="text-xl font-semibold text-red-700 mt-1">
                {formatPence(current.totalExpenses)}
              </p>
            </div>
            <div className={`p-4 rounded-lg ${current.netPosition >= 0 ? 'bg-blue-50' : 'bg-amber-50'}`}>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Net</p>
              <p className={`text-xl font-semibold mt-1 ${current.netPosition >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
                {current.netPosition >= 0 ? '' : '-'}{formatPence(current.netPosition)}
              </p>
            </div>
          </div>

          {barData.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Category spend vs budget</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={barData} margin={{ top: 8, right: 8, left: 8, bottom: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 11 }} height={80} />
                  <YAxis tickFormatter={(v: number) => `£${(v / 100).toFixed(0)}`} />
                  <Tooltip formatter={(v) => (typeof v === 'number' ? formatPence(v) : String(v))} />
                  <Legend
                    verticalAlign="top"
                    content={(props) => {
                      const payload = (props as { payload?: Array<{ value: string; color: string }> }).payload ?? [];
                      return (
                        <div className="flex justify-center gap-4 text-xs mb-2">
                          {payload.map((item, i) => (
                            <span key={i} className="flex items-center gap-1">
                              <span style={{ display: 'inline-block', width: 12, height: 10, background: item.color }} />
                              {item.value}
                            </span>
                          ))}
                          {changesThisMonth.length > 0 && (
                            <span className="flex items-center gap-1">
                              <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke="#6366f1" strokeDasharray="4 2" strokeWidth="2" /></svg>
                              Budget change
                            </span>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="Actual" fill="#f97316" />
                  <Bar dataKey="Budget" fill="#6366f1" opacity={0.6} />
                  {changesThisMonth.map((c, i) => (
                    <ReferenceLine
                      key={i}
                      x={c.category}
                      strokeDasharray="4 2"
                      stroke="#6366f1"
                      label={<BudgetChangeAnnotation reason={c.reason} />}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {categoryRows.length > 0 && (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium text-right">Actual</th>
                  <th className="pb-2 font-medium text-right">Budget</th>
                  <th className="pb-2 pl-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {categoryRows.map((row) => (
                  <tr key={row.name} className="border-b border-gray-100">
                    <td className="py-2 font-medium text-gray-800">{row.name}</td>
                    <td className="py-2 text-right tabular-nums">{formatPence(row.actual)}</td>
                    <td className="py-2 text-right tabular-nums">
                      {row.budget > 0 ? formatPence(row.budget) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="py-2 pl-4">
                      {row.budget > 0 ? (
                        <BudgetStateIndicator state={row.state} actual={row.actual} budget={row.budget} />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
