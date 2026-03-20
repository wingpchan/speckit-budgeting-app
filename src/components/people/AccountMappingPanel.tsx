import { useState } from 'react';
import { useLedger } from '../../hooks/useLedger';
import { usePeople } from '../../hooks/usePeople';
import { AssignAccountModal } from './AssignAccountModal';
import type { TransactionRecord, AccountPersonMappingRecord } from '../../models/index';

interface AccountSummary {
  accountName: string;
  currentPersonName: string;
  effectiveDate: string | null;
}

function resolveCurrentAssignment(
  accountName: string,
  mappings: AccountPersonMappingRecord[],
): { personName: string; effectiveDate: string } | null {
  const today = new Date().toISOString().slice(0, 10);
  const eligible = mappings
    .filter((m) => m.accountName === accountName && m.effectiveDate <= today)
    .sort((a, b) => {
      if (b.effectiveDate !== a.effectiveDate) return b.effectiveDate.localeCompare(a.effectiveDate);
      return 1; // later in array wins on tie
    });
  if (eligible.length === 0) return null;
  return { personName: eligible[0].personName, effectiveDate: eligible[0].effectiveDate };
}

export function AccountMappingPanel() {
  const { records } = useLedger();
  const { activePeople } = usePeople();
  const [reassigningAccount, setReassigningAccount] = useState<string | null>(null);

  const transactions = records.filter((r): r is TransactionRecord => r.type === 'transaction');
  const mappings = records.filter(
    (r): r is AccountPersonMappingRecord => r.type === 'accountPersonMapping',
  );

  const distinctAccounts = Array.from(new Set(transactions.map((t) => t.account))).sort();

  const accountSummaries: AccountSummary[] = distinctAccounts.map((accountName) => {
    const assignment = resolveCurrentAssignment(accountName, mappings);
    return {
      accountName,
      currentPersonName: assignment?.personName ?? 'Household',
      effectiveDate: assignment?.effectiveDate ?? null,
    };
  });

  return (
    <div className="mt-8 p-4 bg-white border border-gray-200 rounded-lg">
      <h2 className="text-lg font-medium mb-4">Account Assignments</h2>

      {accountSummaries.length === 0 ? (
        <p className="text-sm text-gray-500">No accounts found. Import transactions to see accounts here.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
              <th className="pb-2 font-medium">Account</th>
              <th className="pb-2 font-medium">Assigned To</th>
              <th className="pb-2 font-medium">Effective From</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {accountSummaries.map((summary) => (
              <tr key={summary.accountName} className="border-b border-gray-100">
                <td className="py-3 font-medium text-sm">{summary.accountName}</td>
                <td className="py-3 text-sm">{summary.currentPersonName}</td>
                <td className="py-3 text-sm text-gray-500">
                  {summary.effectiveDate ?? '—'}
                </td>
                <td className="py-3">
                  <button
                    onClick={() => setReassigningAccount(summary.accountName)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Reassign
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {reassigningAccount && (
        <AssignAccountModal
          accountName={reassigningAccount}
          activePeople={activePeople}
          onClose={() => setReassigningAccount(null)}
        />
      )}
    </div>
  );
}
