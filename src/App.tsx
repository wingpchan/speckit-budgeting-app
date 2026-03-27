import { useEffect } from 'react';
import { SessionProvider, useSession } from './store/SessionContext';
import { LedgerProvider } from './store/LedgerContext';
import { Layout, type ViewId } from './components/shared/Layout';
import { ChooseFolder } from './components/shared/ChooseFolder';
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
import { resolveKeywordRules, setKeywordRuleStatus } from './services/categoriser/keyword-rules.service';
import { getActiveCategories } from './services/categoriser/category.service';
import { getActivePeople } from './services/people/people.service';
import type { CategoryRecord, KeywordRuleRecord, PersonRecord, TransactionRecord, BudgetRecord } from './models/index';

function TransactionsScreen() {
  const { records, refresh } = useLedger();

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const transactions = records.filter((r): r is TransactionRecord => r.type === 'transaction');
  const categories = records.filter((r): r is CategoryRecord => r.type === 'category');

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Transactions</h2>
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
  const { state } = useSession();
  const { records, isLoading, refresh } = useLedger();

  const allPeople = getActivePeople(records.filter((r): r is PersonRecord => r.type === 'person'));

  if (!state.dirHandle) {
    return (
      <Layout>
        {(_currentView, navigate) => (
          <ChooseFolder onSuccess={(view: ViewId) => navigate(view)} />
        )}
      </Layout>
    );
  }

  return (
    <Layout allPeople={allPeople}>
      {(currentView, navigate) => {
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
      }}
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
