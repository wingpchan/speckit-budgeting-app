import type { ViewId } from './Layout';
import { DateRangePicker } from './DateRangePicker';
import { PersonFilter } from './PersonFilter';
import type { PersonRecord } from '../../models/index';

interface NavBarProps {
  currentView: ViewId;
  onNavigate: (view: ViewId) => void;
  allPeople: PersonRecord[];
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

export function NavBar({ currentView, onNavigate, allPeople }: NavBarProps) {
  return (
    <nav className="bg-white border-b border-gray-200 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-14">
        <span className="font-semibold text-gray-800 text-lg">Budget Tracker</span>
        <ul className="flex gap-1">
          {NAV_LINKS.map(({ id, label }) => (
            <li key={id}>
              <button
                onClick={() => onNavigate(id)}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  currentView === id
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3">
          <DateRangePicker />
          <PersonFilter allPeople={allPeople} />
        </div>
      </div>
    </nav>
  );
}
