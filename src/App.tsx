import { SessionProvider, useSession } from './store/SessionContext';
import { Layout, type ViewId } from './components/shared/Layout';
import { ChooseFolder } from './components/shared/ChooseFolder';
import { ImportScreen } from './components/import/ImportScreen';

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
      {(currentView) => {
        switch (currentView) {
          case 'import':
            return <ImportScreen />;
          case 'summaries':
            return <ViewPlaceholder name="Summaries" />;
          case 'budgets':
            return <ViewPlaceholder name="Budgets" />;
          case 'categories':
            return <ViewPlaceholder name="Categories" />;
          case 'people':
            return <ViewPlaceholder name="People" />;
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
