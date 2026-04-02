import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useSummaries } from '../../hooks/useSummaries';
import { useSession } from '../../store/SessionContext';
import { getMondayOfWeek, getPrevWeek, getNextWeek, toWeekLabel, mondayToWeekKey } from '../../utils/dates';
import type { TransactionRecord } from '../../models/index';

const COLOURS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#a855f7',
];

function formatPence(pence: number): string {
  return `£${(Math.abs(pence) / 100).toFixed(2)}`;
}

interface WeeklySummaryViewProps {
  transactions: TransactionRecord[];
}

export function WeeklySummaryView({ transactions }: WeeklySummaryViewProps) {
  const { state, dispatch } = useSession();
  const { summaries } = useSummaries(transactions, 'weekly');

  const monday = getMondayOfWeek(state.dateFilter.start);
  const weekKey = mondayToWeekKey(monday);

  function navigateTo(newMonday: string) {
    const [y, m, d] = newMonday.split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
    const end = new Date(Date.UTC(y, m - 1, d + 6)).toISOString().slice(0, 10);
    dispatch({ type: 'SET_DATE_FILTER', start, end });
  }

  const current = summaries.find(s => s.periodKey === weekKey) ?? null;
  // byCategory stores absolute (positive) expense amounts — filter value > 0 to show expenses only
  const categoryEntries = current
    ? Object.entries(current.byCategory)
        .filter(([, value]) => value > 0)
        .sort(([, a], [, b]) => b - a)
    : [];
  const pieData = categoryEntries.map(([name, value]) => ({ name, value }));
  const barData = categoryEntries.map(([name, value]) => ({ name, Spend: value }));

  return (
    <div className="space-y-6">
      {/* Week navigator */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Weekly Summary</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo(getPrevWeek(monday))}
            className="px-3 py-1.5 rounded border border-gray-300 text-sm hover:bg-gray-100"
          >
            ← Prev
          </button>
          <span className="text-base font-medium w-48 text-center">
            {toWeekLabel(monday)}
          </span>
          <button
            onClick={() => navigateTo(getNextWeek(monday))}
            className="px-3 py-1.5 rounded border border-gray-300 text-sm hover:bg-gray-100"
          >
            Next →
          </button>
        </div>
      </div>

      {!current ? (
        <p className="text-gray-500 text-sm py-4">No transactions in {toWeekLabel(monday)}.</p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 gap-4">
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

          {pieData.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Spend by category</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLOURS[i % COLOURS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => (typeof val === 'number' ? formatPence(val) : String(val))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {barData.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Category spend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData} margin={{ top: 8, right: 8, left: 8, bottom: 80 }}>
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
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium text-right">Spend</th>
                </tr>
              </thead>
              <tbody>
                {categoryEntries.map(([name, value]) => (
                  <tr key={name} className="border-b border-gray-100">
                    <td className="py-2 font-medium text-gray-800">{name}</td>
                    <td className="py-2 text-right tabular-nums">{formatPence(value)}</td>
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
