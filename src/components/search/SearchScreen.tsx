import { useState } from 'react';
import { TransactionList } from '../import/TransactionList';
import { searchTransactions } from '../../services/search/search.service';
import { buildExportCsv } from '../../services/export/export.service';
import { useSession } from '../../store/SessionContext';
import {
  computeDateFilterLabel,
  getMondayOfWeek,
  getPrevWeek, getNextWeek,
  getPrevMonth, getNextMonth,
  getPrevYear, getNextYear,
  toMonthLabel, toWeekLabel,
} from '../../utils/dates';
import type { CategoryRecord, TransactionRecord, BudgetRecord } from '../../models/index';

const SEARCH_TABS: Array<{ id: 'weekly' | 'monthly' | 'yearly'; label: string }> = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
];

function getPresetRange(p: 'weekly' | 'monthly' | 'yearly'): { start: string; end: string } {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const date = now.getUTCDate();
  const day = now.getUTCDay();
  switch (p) {
    case 'weekly': {
      const mondayOffset = day === 0 ? -6 : 1 - day;
      return {
        start: new Date(Date.UTC(year, month, date + mondayOffset)).toISOString().slice(0, 10),
        end: new Date(Date.UTC(year, month, date + mondayOffset + 6)).toISOString().slice(0, 10),
      };
    }
    case 'monthly':
      return {
        start: new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10),
        end: new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10),
      };
    case 'yearly':
      return { start: `${year}-01-01`, end: `${year}-12-31` };
  }
}

interface SearchScreenProps {
  transactions: TransactionRecord[];
  categories: CategoryRecord[];
  budgetRecords: BudgetRecord[];
}

export function SearchScreen({ transactions, categories, budgetRecords }: SearchScreenProps) {
  const [query, setQuery] = useState('');
  const [personBreakdown, setPersonBreakdown] = useState(false);
  const { state, dispatch } = useSession();

  const results = searchTransactions(query, transactions);
  const exportTransactions = (query ? results : transactions).filter(
    (tx) => tx.date >= state.dateFilter.start && tx.date <= state.dateFilter.end,
  );

  function handleExport() {
    const csv = buildExportCsv(exportTransactions, budgetRecords, { personBreakdown });
    const date = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    a.download = `budget-export-${date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  const activeTab: 'weekly' | 'monthly' | 'yearly' =
    state.dateFilter.preset === 'weekly' || state.dateFilter.preset === 'yearly'
      ? state.dateFilter.preset
      : 'monthly';

  const navPeriodLabel = (() => {
    if (activeTab === 'weekly') return toWeekLabel(getMondayOfWeek(state.dateFilter.start || new Date().toISOString().slice(0, 10)));
    if (activeTab === 'yearly') return state.dateFilter.start.slice(0, 4);
    return toMonthLabel(state.dateFilter.start.slice(0, 7));
  })();

  const periodLabel = computeDateFilterLabel(state.dateFilter.preset, state.dateFilter.start, state.dateFilter.end);
  const personLabel = state.personFilter ?? 'All';

  function handleTabClick(tab: 'weekly' | 'monthly' | 'yearly') {
    const range = getPresetRange(tab);
    dispatch({ type: 'SET_VIEW_PRESET', preset: tab });
    dispatch({ type: 'SET_DATE_FILTER', start: range.start, end: range.end });
  }

  function handleNavigate(dir: 'prev' | 'next') {
    if (activeTab === 'monthly') {
      const currentMonth = state.dateFilter.start.slice(0, 7);
      const yyyyMm = dir === 'prev' ? getPrevMonth(currentMonth) : getNextMonth(currentMonth);
      const [y, m] = yyyyMm.split('-').map(Number);
      dispatch({ type: 'SET_DATE_FILTER', start: new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10), end: new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10) });
    } else if (activeTab === 'weekly') {
      const monday = getMondayOfWeek(state.dateFilter.start);
      const newMonday = dir === 'prev' ? getPrevWeek(monday) : getNextWeek(monday);
      const [y, m, d] = newMonday.split('-').map(Number);
      dispatch({ type: 'SET_DATE_FILTER', start: newMonday, end: new Date(Date.UTC(y, m - 1, d + 6)).toISOString().slice(0, 10) });
    } else {
      const currentYear = state.dateFilter.start.slice(0, 4);
      const year = dir === 'prev' ? getPrevYear(currentYear) : getNextYear(currentYear);
      const y = Number(year);
      dispatch({ type: 'SET_DATE_FILTER', start: new Date(Date.UTC(y, 0, 1)).toISOString().slice(0, 10), end: new Date(Date.UTC(y, 11, 31)).toISOString().slice(0, 10) });
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Search Transactions</h1>

      {/* Tab switcher */}
      <div className="flex mb-3" style={{ gap: 4 }}>
        {SEARCH_TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => handleTabClick(id)}
            style={{
              background: activeTab === id ? '#6366f1' : '#eef2ff',
              color: activeTab === id ? 'white' : '#6366f1',
              borderRadius: 6,
              padding: '6px 16px',
              fontWeight: activeTab === id ? 500 : 400,
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Prev/Next navigator */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-800">
          {activeTab === 'weekly' ? 'Weekly Search' : activeTab === 'yearly' ? 'Yearly Search' : 'Monthly Search'}
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleNavigate('prev')}
            className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm rounded-md px-3.5 py-1.5 border-none cursor-pointer"
          >
            ← Prev
          </button>
          <span className="text-base font-medium w-48 text-center">{navPeriodLabel}</span>
          <button
            onClick={() => handleNavigate('next')}
            className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm rounded-md px-3.5 py-1.5 border-none cursor-pointer"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Filter summary bar + export controls */}
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative', marginBottom: '1rem' }}>
        <div style={{ display: 'inline-flex', gap: 16, alignItems: 'center', fontSize: 13, color: 'var(--color-text-secondary)', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 8, padding: '8px 14px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5 1v4M11 1v4M1 7h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {periodLabel}
          </span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {personLabel}
          </span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span style={query ? { color: '#6366f1', fontWeight: 500 } : undefined}>{results.length} results</span>
        </div>
        <div style={{ display: 'inline-flex', gap: 16, alignItems: 'center', fontSize: 13, color: 'var(--color-text-secondary)', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 8, padding: '8px 14px', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          <button
            onClick={handleExport}
            disabled={exportTransactions.length === 0}
            style={{ background: '#6366f1', color: 'white', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 13, fontWeight: 500, cursor: exportTransactions.length === 0 ? 'not-allowed' : 'pointer', opacity: exportTransactions.length === 0 ? 0.5 : 1 }}
          >
            Export Transactions
          </button>
          <div style={{ width: 1, height: 16, background: '#c7d2fe', margin: '0 8px' }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#4338ca', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={personBreakdown}
              onChange={(e) => setPersonBreakdown(e.target.checked)}
              style={{ width: 14, height: 14 }}
            />
            Person Breakdown
          </label>
        </div>
      </div>

      <div className="relative mb-4">
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: '#6366f1' }}
          aria-hidden="true"
        >
          <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 10L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type to search your transactions..."
          style={{ height: 44, paddingLeft: 40, borderRadius: 8, border: '1px solid #d1d5db' }}
          className="w-full text-sm text-gray-700 focus:outline focus:outline-2 focus:outline-[#eef2ff] focus:border-indigo-500 px-3"
        />
      </div>

      <TransactionList transactions={query ? results : transactions} categories={categories} />
    </div>
  );
}
