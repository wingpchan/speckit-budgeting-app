import type { CategoryRecord, ResolvedKeywordRule } from '../../models/index';

interface KeywordRulesScreenProps {
  rules: ResolvedKeywordRule[];
  categories: CategoryRecord[];
  isLoading: boolean;
  onToggleStatus: (pattern: string, newStatus: 'active' | 'inactive') => Promise<void>;
}

export function KeywordRulesScreen({
  rules,
  isLoading,
  onToggleStatus,
}: KeywordRulesScreenProps) {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Keyword Rules</h1>

      {isLoading ? (
        <p className="text-gray-500">Loading…</p>
      ) : rules.length === 0 ? (
        <div className="p-8 text-center text-gray-500 border border-dashed border-gray-300 rounded-lg">
          <p className="text-base font-medium">No keyword rules saved yet.</p>
          <p className="text-sm mt-1">
            Override a transaction category to create one.
          </p>
        </div>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
              <th className="pb-2 font-medium">Pattern</th>
              <th className="pb-2 font-medium">Category</th>
              <th className="pb-2 font-medium">Created</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr
                key={rule.pattern}
                className={`border-b border-gray-100 ${rule.categoryIsInactive ? 'opacity-60' : ''}`}
              >
                <td className="py-3 font-mono text-sm">{rule.pattern}</td>
                <td className="py-3">
                  <span className={rule.categoryIsInactive ? 'text-gray-400' : ''}>
                    {rule.category}
                  </span>
                  {rule.categoryIsInactive && (
                    <span className="ml-2 text-xs text-amber-600">(category inactive)</span>
                  )}
                </td>
                <td className="py-3 text-sm text-gray-600">
                  {rule.createdDate.slice(0, 16).replace('T', ' ')}
                </td>
                <td className="py-3">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      rule.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {rule.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-3">
                  <button
                    onClick={() =>
                      void onToggleStatus(
                        rule.pattern,
                        rule.status === 'active' ? 'inactive' : 'active',
                      )
                    }
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {rule.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
