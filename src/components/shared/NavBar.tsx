import type { ViewId } from './Layout';
import { DateRangePicker } from './DateRangePicker';
import { PersonFilter } from './PersonFilter';
import type { PersonRecord } from '../../models/index';

interface NavBarProps {
  currentView: ViewId;
  onNavigate: (view: ViewId) => void;
  allPeople: PersonRecord[];
  hasLedger?: boolean;
}

const NAV_LINKS: Array<{ id: ViewId; label: string }> = [
  { id: 'import', label: 'Import' },
  { id: 'summaries', label: 'Summaries' },
  { id: 'budgets', label: 'Budgets' },
  { id: 'categories', label: 'Categories' },
  { id: 'rules', label: 'Rules' },
  { id: 'people', label: 'People' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'search', label: 'Search' },
  { id: 'export', label: 'Export' },
];

export function NavBar({ currentView, onNavigate, allPeople, hasLedger = true }: NavBarProps) {
  return (
    <nav style={{ background: '#1e1b4b', minHeight: '88px', paddingTop: 12, paddingBottom: 18, borderBottom: '1px solid rgba(255,255,255,0.1)', overflow: 'visible', position: 'relative', zIndex: 1 }} className="w-full flex items-center px-4">
      {/* Logo */}
      <div className="flex items-center gap-2 flex-shrink-0 mr-6">
        <div
          style={{ width: 30, height: 30, background: '#6366f1', borderRadius: 6, flexShrink: 0 }}
          className="flex items-center justify-center"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="1" y="1" width="6" height="6" rx="1" fill="white" />
            <rect x="9" y="1" width="6" height="6" rx="1" fill="white" />
            <rect x="1" y="9" width="6" height="6" rx="1" fill="white" />
            <rect x="9" y="9" width="6" height="6" rx="1" fill="white" />
          </svg>
        </div>
        <span style={{ color: 'white', fontWeight: 500, fontSize: '15px', whiteSpace: 'nowrap' }}>
          Budget Tracker
        </span>
      </div>

      {/* Nav links */}
      <ul className="flex gap-0.5 flex-wrap self-center" style={{ marginRight: 0 }}>
        {NAV_LINKS.map(({ id, label }) => {
          const isDisabled = !hasLedger && id !== 'import';
          const isActive = currentView === id;
          return (
            <li key={id}>
              {isDisabled ? (
                <span title="Choose a folder first" style={{ cursor: 'not-allowed', display: 'inline-block' }}>
                  <button
                    style={{
                      color: 'rgba(255,255,255,0.25)',
                      background: 'transparent',
                      fontWeight: 400,
                      fontSize: '12px',
                      padding: '5px 8px',
                      borderRadius: '5px',
                      border: 'none',
                      cursor: 'not-allowed',
                      pointerEvents: 'none',
                      textDecoration: 'none',
                    }}
                  >
                    {label}
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => onNavigate(id)}
                  style={{
                    color: isActive ? 'white' : '#a5b4fc',
                    background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                    fontWeight: isActive ? 500 : 400,
                    fontSize: '12px',
                    padding: '5px 8px',
                    borderRadius: '5px',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    transition: 'color 0.15s, background 0.15s',
                  }}
                >
                  {label}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {/* Divider between nav links and controls — Fix 4 */}
      <div
        style={{
          width: 1,
          height: 32,
          background: 'rgba(255,255,255,0.2)',
          alignSelf: 'center',
          margin: '0 8px',
          flexShrink: 0,
        }}
      />

      {/* Controls — Fix 1: span wrapper gives tooltip on hover when disabled */}
      {!hasLedger ? (
        <span
          title="Choose a folder first"
          style={{ cursor: 'not-allowed', display: 'inline-flex', alignSelf: 'center', flexShrink: 0, opacity: 0.3, pointerEvents: 'auto' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, height: 56, pointerEvents: 'none' }}>
            <DateRangePicker />
            <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
            <PersonFilter allPeople={allPeople} />
          </div>
        </span>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, height: 56, flexShrink: 0 }}>
          <DateRangePicker />
          <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
          <PersonFilter allPeople={allPeople} />
        </div>
      )}
    </nav>
  );
}
