import { useState } from 'react';
import { useSummaries } from '../../hooks/useSummaries';
import { useSession } from '../../store/SessionContext';
import { getMondayOfWeek, mondayToWeekKey } from '../../utils/dates';
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
  const { state } = useSession();

  // Derive the period key for the currently selected date filter, matching
  // the format each view uses to look up its summary.
  const activePeriodKey: string = (() => {
    if (tab === 'weekly') return mondayToWeekKey(getMondayOfWeek(state.dateFilter.start));
    if (tab === 'monthly') return state.dateFilter.start.slice(0, 7);
    return state.dateFilter.start.slice(0, 4);
  })();

  const activePair = comparisons?.find(c => c.current.periodKey === activePeriodKey) ?? null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Summaries</h1>

      {/* Tab switcher */}
      <div className="flex gap-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md border-none cursor-pointer ${
              tab === id
                ? 'bg-indigo-500 text-white'
                : 'bg-indigo-50 text-indigo-500'
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

          {activePair && <ComparisonPanel comparisons={[activePair]} />}
        </>
      )}
    </div>
  );
}
