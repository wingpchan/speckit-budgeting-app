import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import type { ComparablePeriod } from '../../services/summaries/summary.service';

function formatPence(pence: number): string {
  return `£${(Math.abs(pence) / 100).toFixed(2)}`;
}

interface ComparisonPanelProps {
  comparisons: ComparablePeriod[];
}

/**
 * Renders a year-over-year (or period-over-period) comparison panel.
 * Only rendered when getComparablePeriods returns a non-null array.
 */
export function ComparisonPanel({ comparisons }: ComparisonPanelProps) {
  if (comparisons.length === 0) return null;

  // Use the most recent comparable pair for the chart
  const pair = comparisons[0];

  // Build per-category bar chart data
  const allCategories = new Set([
    ...Object.keys(pair.current.byCategory),
    ...Object.keys(pair.previous.byCategory),
  ]);

  const barData = Array.from(allCategories)
    .sort()
    .map((cat) => ({
      name: cat,
      [pair.current.periodLabel]: pair.current.byCategory[cat] ?? 0,
      [pair.previous.periodLabel]: pair.previous.byCategory[cat] ?? 0,
    }));

  return (
    <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
      <h3 className="text-base font-semibold text-gray-800">{pair.label}</h3>

      {/* High-level figures */}
      <div className="grid grid-cols-2 gap-4">
        {[pair.current, pair.previous].map((period) => (
          <div key={period.periodKey} className="p-3 bg-white border border-gray-200 rounded">
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">{period.periodLabel}</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Income</span>
                <span className="font-medium text-green-700">{formatPence(period.totalIncome)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Expenses</span>
                <span className="font-medium text-red-700">{formatPence(period.totalExpenses)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-1 mt-1">
                <span className="text-gray-600">Net</span>
                <span className={`font-semibold ${period.netPosition >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
                  {period.netPosition >= 0 ? '' : '-'}{formatPence(period.netPosition)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Per-category comparison chart */}
      {barData.length > 0 && (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={barData} margin={{ top: 8, right: 8, left: 8, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v: number) => `£${(v / 100).toFixed(0)}`} />
            <Tooltip formatter={(v: number) => formatPence(v)} />
            <Legend />
            <Bar dataKey={pair.current.periodLabel} fill="#6366f1" />
            <Bar dataKey={pair.previous.periodLabel} fill="#a5b4fc" />
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* If there are more comparison pairs, list them */}
      {comparisons.length > 1 && (
        <p className="text-xs text-gray-500">
          {comparisons.length - 1} additional comparable period{comparisons.length > 2 ? 's' : ''} available.
        </p>
      )}
    </div>
  );
}
