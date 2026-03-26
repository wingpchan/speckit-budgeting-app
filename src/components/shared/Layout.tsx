import { useState, type ReactNode } from 'react';
import { NavBar } from './NavBar';
import type { PersonRecord } from '../../models/index';

export type ViewId =
  | 'import'
  | 'summaries'
  | 'budgets'
  | 'categories'
  | 'people'
  | 'transactions'
  | 'rules'
  | 'search'
  | 'export';

interface LayoutProps {
  children: (currentView: ViewId, navigate: (view: ViewId) => void) => ReactNode;
  defaultView?: ViewId;
  allPeople?: PersonRecord[];
}

export function Layout({ children, defaultView = 'import', allPeople = [] }: LayoutProps) {
  const [currentView, setCurrentView] = useState<ViewId>(defaultView);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar currentView={currentView} onNavigate={setCurrentView} allPeople={allPeople} />
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children(currentView, setCurrentView)}
      </main>
    </div>
  );
}
