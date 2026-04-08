import { useState, type ReactNode } from 'react';
import { NavBar } from './NavBar';
import { HelpPanel } from './HelpPanel';
import type { PersonRecord } from '../../models/index';

export type ViewId =
  | 'import'
  | 'summaries'
  | 'budgets'
  | 'categories'
  | 'people'
  | 'transactions'
  | 'rules'
  | 'search';

interface LayoutProps {
  children: (currentView: ViewId, navigate: (view: ViewId) => void) => ReactNode;
  defaultView?: ViewId;
  allPeople?: PersonRecord[];
  hasLedger?: boolean;
}

export function Layout({ children, defaultView = 'import', allPeople = [], hasLedger = true }: LayoutProps) {
  const [currentView, setCurrentView] = useState<ViewId>(defaultView);
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: '#f5f4ff' }}>
      <NavBar
        currentView={currentView}
        onNavigate={setCurrentView}
        allPeople={allPeople}
        hasLedger={hasLedger}
        onHelpOpen={() => setHelpOpen(true)}
      />
      <HelpPanel isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
      {!hasLedger && (
        <div
          style={{
            background: '#4338ca',
            color: 'white',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            fontSize: 13,
          }}
        >
          <span>
            To get started, choose a folder where your budget ledger will be stored. Click Import or
            the button below.
          </span>
          <button
            onClick={() => setCurrentView('import')}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: 5,
              padding: '4px 12px',
              fontSize: 12,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            → Choose Folder
          </button>
        </div>
      )}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children(currentView, setCurrentView)}
      </main>
    </div>
  );
}
