import { useEffect } from 'react';
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
import { ExportScreen } from './components/export/ExportScreen';
import { useLedger } from './hooks/useLedger';
import { usePersonFilter, filterByPerson } from './hooks/usePersonFilter';
import { useFilter, filterByDate } from './hooks/useFilter';
import { computeDateFilterLabel } from './utils/dates';
import { resolveKeywordRules, setKeywordRuleStatus } from './services/categoriser/keyword-rules.service';
import { getActiveCategories } from './services/categoriser/category.service';
import { getActivePeople } from './services/people/people.service';
import { saveDirectoryHandle } from './services/ledger/handle-store';
import type { CategoryRecord, KeywordRuleRecord, PersonRecord, TransactionRecord, BudgetRecord } from './models/index';

function TransactionsScreen() {
  const { state, dispatch } = useSession();
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

  const periodLabel = computeDateFilterLabel(state.dateFilter.preset, state.dateFilter.start, state.dateFilter.end);
  const personLabel = personFilter ?? 'All';

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
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Transactions</h2>

      {/* Filter summary bar */}
      <div style={{ display: 'inline-flex', gap: 16, alignItems: 'center', marginBottom: '1rem', fontSize: 13, color: 'var(--color-text-secondary)', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 8, padding: '8px 14px' }}>
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
    const rule = rules.find((r) => r.pattern === pattern);
    const category = rule?.category ?? '';
    if (!state.dirHandle) throw new Error('No ledger directory selected');
    await setKeywordRuleStatus(pattern, category, newStatus, state.dirHandle, appendRecords);
  }

  return (
    <KeywordRulesScreen
      rules={rules}
      categories={categories}
      isLoading={isLoading}
      onToggleStatus={handleToggleStatus}
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

function ExportPage() {
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
  const budgetRecords = records.filter((r): r is BudgetRecord => r.type === 'budget');
  const categories = getActiveCategories(records.filter((r): r is CategoryRecord => r.type === 'category'));

  return <ExportScreen transactions={transactions} budgetRecords={budgetRecords} categories={categories} />;
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
              case 'export':
                return <ExportPage />;
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
