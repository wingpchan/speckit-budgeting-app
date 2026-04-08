import { useEffect, useState } from 'react';
import { SessionProvider, useSession } from './store/SessionContext';
import { LedgerProvider } from './store/LedgerContext';
import { Layout, type ViewId } from './components/shared/Layout';
import { ChooseFolder } from './components/shared/ChooseFolder';
import { LedgerErrorBoundary } from './components/shared/LedgerErrorBoundary';
import { ImportScreen } from './components/import/ImportScreen';
import { TransactionList } from './components/import/TransactionList';
import { PeopleScreen } from './components/people/PeopleScreen';
import { CategoriesScreen } from './components/categories/CategoriesScreen';
import { KeywordRulesScreen } from './components/rules/KeywordRulesScreen';
import { BudgetScreen } from './components/budgets/BudgetScreen';
import { SummariesScreen } from './components/summaries/SummariesScreen';
import { SearchScreen } from './components/search/SearchScreen';
import { useLedger } from './hooks/useLedger';
import { usePersonFilter, filterByPerson } from './hooks/usePersonFilter';
import { useFilter, filterByDate } from './hooks/useFilter';
import {
  computeDateFilterLabel,
  getMondayOfWeek,
  getPrevWeek, getNextWeek,
  getPrevMonth, getNextMonth,
  getPrevYear, getNextYear,
  toMonthLabel, toWeekLabel,
} from './utils/dates';
import { buildExportCsv } from './services/export/export.service';
import { resolveKeywordRules, setKeywordRuleStatus } from './services/categoriser/keyword-rules.service';
import { getActiveCategories } from './services/categoriser/category.service';
import { getActivePeople } from './services/people/people.service';
import { saveDirectoryHandle } from './services/ledger/handle-store';
import type { CategoryRecord, KeywordRuleRecord, PersonRecord, TransactionRecord, BudgetRecord } from './models/index';

const TX_TABS: Array<{ id: 'weekly' | 'monthly' | 'yearly'; label: string }> = [
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

function TransactionsScreen() {
  const { state, dispatch } = useSession();
  const { records, refresh } = useLedger();
  const { start, end } = useFilter();
  const personFilter = usePersonFilter();

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [personBreakdown, setPersonBreakdown] = useState(false);

  const allTransactions = records.filter((r): r is TransactionRecord => r.type === 'transaction');
  const dateFiltered = filterByDate(allTransactions, start, end);
  const transactions = filterByPerson(dateFiltered, personFilter);
  const categories = records.filter((r): r is CategoryRecord => r.type === 'category');
  const budgetRecords = records.filter((r): r is BudgetRecord => r.type === 'budget');

  const periodLabel = computeDateFilterLabel(state.dateFilter.preset, state.dateFilter.start, state.dateFilter.end);
  const personLabel = personFilter ?? 'All';

  const activeTab: 'weekly' | 'monthly' | 'yearly' =
    state.dateFilter.preset === 'weekly' || state.dateFilter.preset === 'yearly'
      ? state.dateFilter.preset
      : 'monthly';

  // Human-readable label for the Prev/Next navigator
  const navPeriodLabel = (() => {
    if (activeTab === 'weekly') return toWeekLabel(getMondayOfWeek(state.dateFilter.start || new Date().toISOString().slice(0, 10)));
    if (activeTab === 'yearly') return state.dateFilter.start.slice(0, 4);
    return toMonthLabel(state.dateFilter.start.slice(0, 7));
  })();

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

  function handleExport() {
    const csv = buildExportCsv(transactions, budgetRecords, { personBreakdown });
    const date = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    a.download = `budget-export-${date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function handleClearFilters() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const monthStart = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
    const monthEnd = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);
    dispatch({ type: 'SET_VIEW_PRESET', preset: 'monthly' });
    dispatch({ type: 'SET_DATE_FILTER', start: monthStart, end: monthEnd });
    dispatch({ type: 'SET_PERSON_FILTER', personName: null });
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Transactions</h1>

      {/* Tab switcher */}
      <div className="flex mb-3" style={{ gap: 4 }}>
        {TX_TABS.map(({ id, label }) => (
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
          {activeTab === 'weekly' ? 'Weekly Transactions' : activeTab === 'yearly' ? 'Yearly Transactions' : 'Monthly Transactions'}
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
          <span>{transactions.length} transactions</span>
        </div>

        <div style={{ display: 'inline-flex', gap: 16, alignItems: 'center', fontSize: 13, color: 'var(--color-text-secondary)', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 8, padding: '8px 14px', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          <button
            onClick={handleExport}
            disabled={transactions.length === 0}
            style={{ background: '#6366f1', color: 'white', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 13, fontWeight: 500, cursor: transactions.length === 0 ? 'not-allowed' : 'pointer', opacity: transactions.length === 0 ? 0.5 : 1 }}
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

      {transactions.length === 0 && (
        <div style={{ marginBottom: '1rem', fontSize: 13, color: '#b45309' }}>
          No transactions match the current filters.{' '}
          <button
            onClick={handleClearFilters}
            style={{ color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 13, textDecoration: 'underline' }}
          >
            Clear filters
          </button>
        </div>
      )}

      <TransactionList
        transactions={transactions}
        categories={categories}
        onRefresh={refresh}
      />
    </div>
  );
}

function CategoriesPage() {
  const { records, isLoading, refresh } = useLedger();

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = records.filter((r): r is CategoryRecord => r.type === 'category');

  return <CategoriesScreen categories={categories} isLoading={isLoading} onRefresh={refresh} />;
}

function KeywordRulesPage() {
  const { state } = useSession();
  const { records, isLoading, refresh, appendRecords } = useLedger();
  const [toggleError, setToggleError] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = records.filter((r): r is CategoryRecord => r.type === 'category');
  const rawRules = records.filter((r): r is KeywordRuleRecord => r.type === 'keywordRule');
  const activeCategoryNames = new Set(getActiveCategories(categories).map((c) => c.name));
  const rules = resolveKeywordRules(rawRules).map((r) => ({
    ...r,
    categoryIsInactive: !activeCategoryNames.has(r.category),
  }));

  async function handleToggleStatus(pattern: string, newStatus: 'active' | 'inactive') {
    setToggleError(null);
    try {
      const rule = rules.find((r) => r.pattern === pattern);
      const category = rule?.category ?? '';
      if (!state.dirHandle) throw new Error('No ledger directory selected');
      await setKeywordRuleStatus(pattern, category, newStatus, state.dirHandle, appendRecords);
      await refresh();
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : 'Failed to update rule status');
    }
  }

  return (
    <KeywordRulesScreen
      rules={rules}
      categories={categories}
      isLoading={isLoading}
      onToggleStatus={handleToggleStatus}
      error={toggleError}
    />
  );
}


function SummariesPage() {
  const { records, isLoading, refresh } = useLedger();
  const personFilter = usePersonFilter();

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allTransactions = records.filter((r): r is TransactionRecord => r.type === 'transaction');
  const transactions = filterByPerson(allTransactions, personFilter);
  const budgetRecords = records.filter((r): r is BudgetRecord => r.type === 'budget');
  const categories = records.filter((r): r is CategoryRecord => r.type === 'category');

  return (
    <SummariesScreen
      transactions={transactions}
      budgetRecords={budgetRecords}
      categories={categories}
      isLoading={isLoading}
    />
  );
}

function SearchPage() {
  const { records, refresh } = useLedger();
  const { start, end } = useFilter();
  const personFilter = usePersonFilter();

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allTransactions = records.filter((r): r is TransactionRecord => r.type === 'transaction');
  const dateFiltered = filterByDate(allTransactions, start, end);
  const transactions = filterByPerson(dateFiltered, personFilter);
  const categories = records.filter((r): r is CategoryRecord => r.type === 'category');

  return <SearchScreen transactions={transactions} categories={categories} />;
}

function AppContent() {
  const { state, dispatch } = useSession();
  const { records, isLoading, refresh } = useLedger();

  const allPeople = getActivePeople(records.filter((r): r is PersonRecord => r.type === 'person'));

  async function handleHandleRestored(dirHandle: FileSystemDirectoryHandle) {
    await saveDirectoryHandle(dirHandle);
    dispatch({ type: 'SET_LEDGER_HANDLE', handle: dirHandle });
  }

  if (!state.dirHandle) {
    return (
      <Layout hasLedger={false}>
        {(_currentView, navigate) => (
          <ChooseFolder onSuccess={(view: ViewId) => navigate(view)} />
        )}
      </Layout>
    );
  }

  return (
    <Layout allPeople={allPeople}>
      {(currentView, navigate) => (
        <LedgerErrorBoundary onHandleRestored={handleHandleRestored}>
          {(() => {
            switch (currentView) {
              case 'import':
                return <ImportScreen onNavigate={navigate} />;
              case 'summaries':
                return <SummariesPage />;
              case 'budgets':
                return <BudgetScreen />;
              case 'categories':
                return <CategoriesPage />;
              case 'rules':
                return <KeywordRulesPage />;
              case 'people':
                return (
                  <PeopleScreen
                    personRecords={records.filter((r): r is PersonRecord => r.type === 'person')}
                    isLoading={isLoading}
                    onRefresh={refresh}
                  />
                );
              case 'transactions':
                return <TransactionsScreen />;
              case 'search':
                return <SearchPage />;
            }
          })()}
        </LedgerErrorBoundary>
      )}
    </Layout>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <LedgerProvider>
        <AppContent />
      </LedgerProvider>
    </SessionProvider>
  );
}
