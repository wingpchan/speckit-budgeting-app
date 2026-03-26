import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useSummaries } from '../../hooks/useSummaries';
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
  const { summaries } = useSummaries(transactions, 'weekly');

  if (summaries.length === 0) {
    return <p className="text-gray-500 text-sm py-4">No transactions in the selected period.</p>;
  }

  // Show the most recent week
  const current = summaries[summaries.length - 1];
  const pieData = Object.entries(current.byCategory).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">{current.periodLabel}</h2>
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
              <Tooltip formatter={(val: number) => formatPence(-val)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
