import { useEffect } from 'react';
import { SessionProvider, useSession } from './store/SessionContext';
import { Layout, type ViewId } from './components/shared/Layout';
import { ChooseFolder } from './components/shared/ChooseFolder';
import { ImportScreen } from './components/import/ImportScreen';
import { TransactionList } from './components/import/TransactionList';
import { PeopleScreen } from './components/people/PeopleScreen';
import { CategoriesScreen } from './components/categories/CategoriesScreen';
import { KeywordRulesScreen } from './components/rules/KeywordRulesScreen';
import { BudgetScreen } from './components/budgets/BudgetScreen';
import { useLedger } from './hooks/useLedger';
import { resolveKeywordRules, setKeywordRuleStatus } from './services/categoriser/keyword-rules.service';
import { getActiveCategories } from './services/categoriser/category.service';
import { getAllPeople } from './services/people/people.service';
import type { CategoryRecord, KeywordRuleRecord, PersonRecord, TransactionRecord } from './models/index';

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

function PeoplePage() {
  const { records, isLoading, refresh } = useLedger();

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const personRecords = records.filter((r): r is PersonRecord => r.type === 'person');

  return <PeopleScreen personRecords={personRecords} isLoading={isLoading} onRefresh={refresh} />;
}

function ViewPlaceholder({ name }: { name: string }) {
  return (
    <div className="p-8 text-center text-gray-500">
      <p className="text-lg font-medium">{name}</p>
      <p className="text-sm mt-1">Coming in a future phase.</p>
    </div>
  );
}

function AppContent() {
  const { state } = useSession();
  const { records, refresh } = useLedger();

  useEffect(() => {
    if (state.dirHandle) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.dirHandle]);

  const allPeople = getAllPeople(records.filter((r): r is PersonRecord => r.type === 'person'));

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
            return <ViewPlaceholder name="Summaries" />;
          case 'budgets':
            return <BudgetScreen />;
          case 'categories':
            return <CategoriesPage />;
          case 'rules':
            return <KeywordRulesPage />;
          case 'people':
            return <PeoplePage />;
          case 'transactions':
            return <TransactionsScreen />;
          case 'search':
            return <ViewPlaceholder name="Search" />;
          case 'export':
            return <ViewPlaceholder name="Export" />;
        }
      }}
    </Layout>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
}
