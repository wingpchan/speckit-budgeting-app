import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useSummaries } from '../../hooks/useSummaries';
import { aggregateByPeriod } from '../../services/summaries/summary.service';
import { getBudgetChanges } from '../../services/budget/budget.service';
import { BudgetChangeAnnotation } from './BudgetChangeAnnotation';
import type { TransactionRecord, BudgetRecord } from '../../models/index';

function formatPence(pence: number): string {
  return `£${(Math.abs(pence) / 100).toFixed(2)}`;
}

interface YearlySummaryViewProps {
  transactions: TransactionRecord[];
  budgetRecords: BudgetRecord[];
}

export function YearlySummaryView({ transactions, budgetRecords }: YearlySummaryViewProps) {
  const { summaries } = useSummaries(transactions, 'yearly');

  if (summaries.length === 0) {
    return <p className="text-gray-500 text-sm py-4">No transactions in the selected period.</p>;
  }

  const current = summaries[summaries.length - 1];

  // Month-by-month breakdown for the current year
  const currentYear = current.periodKey;
  const txInYear = transactions.filter((t) => t.date.startsWith(currentYear));
  const monthSummaries = aggregateByPeriod(txInYear, 'monthly');

  const lineData = monthSummaries.map((m) => ({
    month: m.periodLabel,
    Income: m.totalIncome,
    Expenses: Math.abs(m.totalExpenses),
    Net: m.netPosition,
  }));

  // Budget change annotations per month
  const allCategories = [...new Set(transactions.map((t) => t.category))];
  const budgetChanges = allCategories.flatMap((cat) =>
    getBudgetChanges(cat, budgetRecords).filter(
      (c) => c.month.startsWith(currentYear) && c.reason,
    ),
  );
  // Map to month label for x-axis reference
  const monthKeyToLabel = new Map(monthSummaries.map((m) => [m.periodKey, m.periodLabel]));

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

      {lineData.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Month-by-month trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={lineData} margin={{ top: 8, right: 8, left: 8, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
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
                          <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke={item.color} strokeWidth="2" /></svg>
                          {item.value}
                        </span>
                      ))}
                      {budgetChanges.length > 0 && (
                        <span className="flex items-center gap-1">
                          <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke="#6366f1" strokeDasharray="4 2" strokeWidth="2" /></svg>
                          Budget change
                        </span>
                      )}
                    </div>
                  );
                }}
              />
              <Line type="monotone" dataKey="Income" stroke="#22c55e" dot={false} />
              <Line type="monotone" dataKey="Expenses" stroke="#ef4444" dot={false} />
              <Line type="monotone" dataKey="Net" stroke="#6366f1" strokeDasharray="4 2" dot={false} />
              {budgetChanges.map((c, i) => {
                const label = monthKeyToLabel.get(c.month);
                if (!label) return null;
                return (
                  <ReferenceLine
                    key={i}
                    x={label}
                    strokeDasharray="4 2"
                    stroke="#6366f1"
                    label={<BudgetChangeAnnotation reason={c.reason} />}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
