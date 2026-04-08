import { useEffect } from 'react';

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpPanel({ isOpen, onClose }: HelpPanelProps) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 88,
        right: 0,
        width: 420,
        height: 'calc(100vh - 88px)',
        background: 'white',
        borderLeft: '1px solid #e5e7eb',
        boxShadow: '-4px 0 16px rgba(0,0,0,0.1)',
        zIndex: 50,
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#1e1b4b' }}>User Guide</span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#6b7280', lineHeight: 1, padding: '2px 6px', borderRadius: 4 }}
          aria-label="Close help panel"
        >
          ×
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

        {/* Section 1 — Getting Started */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
            Getting Started
          </h2>
          <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <li style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
              <strong style={{ color: '#111827' }}>Choose Your Working Folder</strong> — Select a folder where your budget ledger file will be saved. This is done once; the app remembers it between sessions.
            </li>
            <li style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
              <strong style={{ color: '#111827' }}>Import Your First Bank Statement</strong> — Go to Import, click Browse Files or drag and drop a CSV file exported from your UK bank. Nationwide and NewDay formats are auto-detected.
            </li>
            <li style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
              <strong style={{ color: '#111827' }}>Review and Confirm</strong> — Check the staged transactions, adjust categories if needed, then click Confirm Import.
            </li>
            <li style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
              <strong style={{ color: '#111827' }}>Explore Your Finances</strong> — Navigate to Transactions, Summaries or Budgets to see your data.
            </li>
          </ol>
        </div>

        {/* Section 2 — Feature Reference */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
            Feature Reference
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { name: 'Import', desc: 'Import UK bank CSV files. Nationwide Current Account, Nationwide Credit Card and NewDay Credit Card are auto-detected. Unknown formats can be mapped manually and saved as a profile for future use.' },
              { name: 'Transactions', desc: 'View, filter and search all imported transactions. Use Weekly/Monthly/Yearly tabs and Prev/Next to navigate. Click Edit to change a transaction\'s category. Export filtered transactions using the Export Transactions button.' },
              { name: 'Summaries', desc: 'Weekly, monthly and yearly financial summaries with charts. Includes income, expenses, net position and category breakdown. Comparison panel shows year-on-year or week-on-week figures when enough data exists.' },
              { name: 'Monthly Budgets', desc: 'Set monthly spending limits per category. Actual vs budget shown with red/green indicators. Navigate months with Prev/Next.' },
              { name: 'Search', desc: 'Search transactions by keyword. Composes with date and person filters.' },
              { name: 'Categories', desc: 'Add custom categories or deactivate default ones. Inactive categories are hidden from dropdowns but preserved in historical data.' },
              { name: 'Keyword Rules', desc: 'Define keyword patterns to auto-categorise transactions on import. Add rules manually or during the import staging process.' },
              { name: 'People', desc: 'Add household members and assign bank accounts to them. Use the Person filter in the nav bar to view finances per person.' },
            ].map(({ name, desc }) => (
              <div key={name} style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                <strong style={{ color: '#111827' }}>{name}:</strong> {desc}
              </div>
            ))}
          </div>
        </div>

        {/* Important Notes */}
        <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, padding: '14px 16px' }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Important Notes
          </h2>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li style={{ fontSize: 13, color: '#78350f', lineHeight: 1.6 }}>Supported browsers: Chrome and Edge only (File System Access API).</li>
            <li style={{ fontSize: 13, color: '#78350f', lineHeight: 1.6 }}>Do not open <code style={{ background: '#fde68a', borderRadius: 3, padding: '0 3px', fontSize: 12 }}>budget-ledger.csv</code> in Excel or LibreOffice while the app is running — this locks the file and prevents writes.</li>
            <li style={{ fontSize: 13, color: '#78350f', lineHeight: 1.6 }}>The <code style={{ background: '#fde68a', borderRadius: 3, padding: '0 3px', fontSize: 12 }}>budget-ledger.csv</code> file is your data — back it up regularly by copying it to another location.</li>
          </ul>
        </div>

      </div>
    </div>
  );
}
