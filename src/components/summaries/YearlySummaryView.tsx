import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { useSummaries } from '../../hooks/useSummaries';
import { aggregateByPeriod } from '../../services/summaries/summary.service';
import { resolveBudget } from '../../services/budget/budget.service';
import { useSession } from '../../store/SessionContext';
import { getPrevYear, getNextYear } from '../../utils/dates';
import type { TransactionRecord, BudgetRecord } from '../../models/index';

function formatPence(pence: number): string {
  return `£${(Math.abs(pence) / 100).toFixed(2)}`;
}

interface YearlySummaryViewProps {
  transactions: TransactionRecord[];
  budgetRecords: BudgetRecord[];
}

export function YearlySummaryView({ transactions, budgetRecords }: YearlySummaryViewProps) {
  const { state, dispatch } = useSession();
  const { summaries } = useSummaries(transactions, 'yearly');

  const currentYear = state.dateFilter.start.slice(0, 4);
  const todayYear = new Date().getUTCFullYear().toString();
  const yearContext: 'past' | 'current' | 'future' =
    currentYear < todayYear ? 'past' : currentYear === todayYear ? 'current' : 'future';

  function navigateTo(year: string) {
    const y = Number(year);
    const start = new Date(Date.UTC(y, 0, 1)).toISOString().slice(0, 10);
    const end = new Date(Date.UTC(y, 11, 31)).toISOString().slice(0, 10);
    dispatch({ type: 'SET_DATE_FILTER', start, end });
  }

  const current = summaries.find(s => s.periodKey === currentYear) ?? null;
  const categoryEntries = current
    ? Object.entries(current.byCategory).sort(([a], [b]) => a.localeCompare(b))
    : [];
  const categoryBarData = categoryEntries.map(([name, value]) => ({ name, Spend: value }));

  const months = Array.from({ length: 12 }, (_, i) =>
    `${currentYear}-${String(i + 1).padStart(2, '0')}`,
  );
  const annualBudgetByCategory = Object.fromEntries(
    categoryEntries.map(([name]) => [
      name,
      months.reduce((sum, m) => sum + resolveBudget(m, name, budgetRecords), 0),
    ]),
  );

  const now = new Date();
  const todayMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const monthlyBudgetRefMonth = yearContext === 'past' ? `${currentYear}-12` : todayMonth;
  const monthlyBudgetByCategory = Object.fromEntries(
    categoryEntries.map(([name]) => [
      name,
      resolveBudget(monthlyBudgetRefMonth, name, budgetRecords),
    ]),
  );
  const txInYear = transactions.filter((t) => t.date.startsWith(currentYear));
  const monthSummaries = aggregateByPeriod(txInYear, 'monthly');

  const lineData = monthSummaries.map((m) => ({
    month: m.periodLabel,
    Income: m.totalIncome,
    Expenses: Math.abs(m.totalExpenses),
    Net: m.netPosition,
  }));

  return (
    <div className="space-y-6">
      {/* Year navigator */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Yearly Summary</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo(getPrevYear(currentYear))}
            className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm rounded-md px-3.5 py-1.5 border-none cursor-pointer"
          >
            ← Prev
          </button>
          <span className="text-base font-medium w-36 text-center">
            {currentYear}
          </span>
          <button
            onClick={() => navigateTo(getNextYear(currentYear))}
            className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm rounded-md px-3.5 py-1.5 border-none cursor-pointer"
          >
            Next →
          </button>
        </div>
      </div>

      {!current ? (
        <p className="text-gray-500 text-sm py-4">No transactions in {currentYear}.</p>
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

          {categoryBarData.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Category spend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryBarData} margin={{ top: 8, right: 8, left: 8, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 11 }} height={80} />
                  <YAxis tickFormatter={(v: number) => `£${(v / 100).toFixed(0)}`} />
                  <Tooltip formatter={(v) => (typeof v === 'number' ? formatPence(v) : String(v))} />
                  <Legend verticalAlign="top" />
                  <Bar dataKey="Spend" fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {categoryEntries.length > 0 && (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 text-left bg-[#ede9fe] border-[#c4b5fd] text-[#4338ca]">
                  <th className="pb-2 font-semibold text-[13px]">Category</th>
                  <th className="pb-2 font-semibold text-[13px] text-right">Annual spend</th>
                  <th className="pb-2 font-semibold text-[13px] text-right">Monthly budget</th>
                  <th className="pb-2 font-semibold text-[13px] text-right">Annual budget</th>
                  <th className="pb-2 font-semibold text-[13px] text-right">
                    {yearContext === 'past' ? 'Over / Under' : 'Remaining'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {categoryEntries.map(([name, value]) => {
                  const budget = annualBudgetByCategory[name] ?? 0;
                  const remaining = budget - value;
                  const varianceCell = (() => {
                    if (budget <= 0) return '—';
                    if (yearContext === 'future') {
                      return <span className="text-green-600">{formatPence(budget)} remaining</span>;
                    }
                    if (remaining > 0) {
                      return <span className="text-green-600">{formatPence(remaining)} {yearContext === 'past' ? 'under' : 'remaining'}</span>;
                    }
                    if (remaining < 0) {
                      return <span className="text-red-600">{formatPence(remaining)} over</span>;
                    }
                    return '—';
                  })();
                  const monthlyBudget = monthlyBudgetByCategory[name] ?? 0;
                  return (
                    <tr key={name} className="border-b border-gray-100">
                      <td className="py-3 font-medium text-gray-800">{name}</td>
                      <td className="py-3 text-right tabular-nums">{formatPence(value)}</td>
                      <td className="py-3 text-right tabular-nums">
                        {monthlyBudget > 0 ? formatPence(monthlyBudget) : '—'}
                      </td>
                      <td className="py-3 text-right tabular-nums">
                        {budget > 0 ? formatPence(budget) : '—'}
                      </td>
                      <td className="py-3 text-right tabular-nums">{varianceCell}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {lineData.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Month-by-month trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={lineData} margin={{ top: 8, right: 8, left: 8, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v: number) => `£${(v / 100).toFixed(0)}`} />
                  <Tooltip formatter={(v) => (typeof v === 'number' ? formatPence(v) : String(v))} />
                  <Legend verticalAlign="top" />
                  <Line type="monotone" dataKey="Income" stroke="#22c55e" dot={false} />
                  <Line type="monotone" dataKey="Expenses" stroke="#ef4444" dot={false} />
                  <Line type="monotone" dataKey="Net" stroke="#6366f1" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
