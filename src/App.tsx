import { useEffect } from 'react';
import { SessionProvider, useSession } from './store/SessionContext';
import { Layout, type ViewId } from './components/shared/Layout';
import { ChooseFolder } from './components/shared/ChooseFolder';
import { ImportScreen } from './components/import/ImportScreen';
import { TransactionList } from './components/import/TransactionList';
import { useLedger } from './hooks/useLedger';
import type { CategoryRecord, TransactionRecord } from './models/index';

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
    <Layout>
      {(currentView, navigate) => {
        switch (currentView) {
          case 'import':
            return <ImportScreen onNavigate={navigate} />;
          case 'summaries':
            return <ViewPlaceholder name="Summaries" />;
          case 'budgets':
            return <ViewPlaceholder name="Budgets" />;
          case 'categories':
            return <ViewPlaceholder name="Categories" />;
          case 'people':
            return <ViewPlaceholder name="People" />;
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
