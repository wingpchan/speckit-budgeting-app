import { useState } from 'react';
import { buildExportCsv } from '../../services/export/export.service';
import type { TransactionRecord, BudgetRecord, CategoryRecord } from '../../models/index';

interface ExportScreenProps {
  transactions: TransactionRecord[];
  budgetRecords: BudgetRecord[];
  categories: CategoryRecord[];
}

export function ExportScreen({ transactions, budgetRecords }: ExportScreenProps) {
  const [personBreakdown, setPersonBreakdown] = useState(false);

  function handleExport() {
    const csv = buildExportCsv(transactions, budgetRecords, { personBreakdown });
    const date = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    a.download = `budget-export-${date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Export</h1>
      <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-md">
        <p className="text-sm text-gray-600 mb-4">
          {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} in the current
          filter range.
        </p>
        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={personBreakdown}
            onChange={(e) => setPersonBreakdown(e.target.checked)}
            className="w-4 h-4 text-indigo-600"
          />
          <span className="text-sm text-gray-700">Person Breakdown</span>
        </label>
        <button
          onClick={handleExport}
          disabled={transactions.length === 0}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Export CSV
        </button>
      </div>
    </div>
  );
}
