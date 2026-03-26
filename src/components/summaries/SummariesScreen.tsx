import { useState } from 'react';
import { useSummaries } from '../../hooks/useSummaries';
import { WeeklySummaryView } from './WeeklySummaryView';
import { MonthlySummaryView } from './MonthlySummaryView';
import { YearlySummaryView } from './YearlySummaryView';
import { ComparisonPanel } from './ComparisonPanel';
import type { TransactionRecord, BudgetRecord, CategoryRecord } from '../../models/index';

type SummaryTab = 'weekly' | 'monthly' | 'yearly';

interface SummariesScreenProps {
  transactions: TransactionRecord[];
  budgetRecords: BudgetRecord[];
  categories: CategoryRecord[];
  isLoading: boolean;
}

const TABS: Array<{ id: SummaryTab; label: string }> = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
];

export function SummariesScreen({
  transactions,
  budgetRecords,
  isLoading,
}: SummariesScreenProps) {
  const [tab, setTab] = useState<SummaryTab>('monthly');
  const { comparisons } = useSummaries(transactions, tab);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Summaries</h1>

      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === id
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <>
          {tab === 'weekly' && <WeeklySummaryView transactions={transactions} />}
          {tab === 'monthly' && (
            <MonthlySummaryView transactions={transactions} budgetRecords={budgetRecords} />
          )}
          {tab === 'yearly' && (
            <YearlySummaryView transactions={transactions} budgetRecords={budgetRecords} />
          )}

          {comparisons && <ComparisonPanel comparisons={comparisons} />}
        </>
      )}
    </div>
  );
}
