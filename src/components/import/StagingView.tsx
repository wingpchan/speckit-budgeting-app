import { useState, Fragment } from 'react';
import { formatPence } from '../../utils/pence';
import type { ParsedRow } from '../../services/csv-parser/types';
import type { CategoryRecord, KeywordRuleRecord } from '../../models/index';
import { buildKeywordIndex, categorise } from '../../services/categoriser/categoriser.service';
import { getActiveCategories } from '../../services/categoriser/category.service';
import { resolveKeywordRules, findConflictingRule } from '../../services/categoriser/keyword-rules.service';
import { DEFAULT_KEYWORD_MAP } from '../../models/constants';
import { useKeywordRules } from '../../hooks/useKeywordRules';
import { KeywordRulePrompt } from '../rules/KeywordRulePrompt';

interface RulePromptTarget {
  rowIndex: number;
  description: string;
  category: string;
}

interface StagingViewProps {
  rows: ParsedRow[];
  account: string;
  detectedProfile: string | null;
  categories: CategoryRecord[];
  keywordRules?: KeywordRuleRecord[];
  onConfirm: (categoryOverrides: Record<number, string>) => void;
  onCancel: () => void;
  isConfirming: boolean;
}

export function StagingView({
  rows,
  account,
  detectedProfile,
  categories,
  keywordRules,
  onConfirm,
  onCancel,
  isConfirming,
}: StagingViewProps) {
  const { rules, saveRule, isSaving: isRuleSaving } = useKeywordRules();
  const [categoryOverrides, setCategoryOverrides] = useState<Record<number, string>>({});
  const [rulePromptFor, setRulePromptFor] = useState<RulePromptTarget | null>(null);
  const [ruleSaveWarning, setRuleSaveWarning] = useState<string>('');
  const [ruleConflictWarned, setRuleConflictWarned] = useState(false);

  const resolvedRules = resolveKeywordRules(keywordRules ?? []);
  const keywordIndex = buildKeywordIndex(categories, DEFAULT_KEYWORD_MAP, resolvedRules);
  const activeCategories = getActiveCategories(categories).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const categorisedRows = rows.map((row) => ({
    ...row,
    category: categorise(row.description, keywordIndex),
  }));

  function handleCategoryChange(i: number, newCategory: string, autoCategory: string) {
    setCategoryOverrides((prev) => ({ ...prev, [i]: newCategory }));
    if (newCategory !== autoCategory) {
      setRulePromptFor({ rowIndex: i, description: categorisedRows[i].description, category: newCategory });
      setRuleSaveWarning('');
      setRuleConflictWarned(false);
    } else {
      // User reverted to the auto-categorised value — no rule needed
      setRulePromptFor(null);
      setRuleSaveWarning('');
      setRuleConflictWarned(false);
    }
  }

  async function handleRuleConfirm(pattern: string, category: string) {
    if (!ruleConflictWarned) {
      const conflict = findConflictingRule(pattern, category, rules);
      if (conflict) {
        setRuleSaveWarning(
          `A rule for this pattern already maps to "${conflict.category}". Click Confirm again to replace it.`,
        );
        setRuleConflictWarned(true);
        return;
      }
    }
    const result = await saveRule(pattern, category);
    if (result === 'duplicate') {
      setRuleSaveWarning('An active rule for this pattern and category already exists.');
      setRuleConflictWarned(false);
    } else {
      setRulePromptFor(null);
      setRuleSaveWarning('');
      setRuleConflictWarned(false);
    }
  }

  function handleRuleDismiss() {
    setRulePromptFor(null);
    setRuleSaveWarning('');
    setRuleConflictWarned(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Review Transactions</h2>
          <p className="text-sm text-gray-500">
            {rows.length} transaction{rows.length !== 1 ? 's' : ''} from{' '}
            <strong>{account}</strong>
            {detectedProfile && (
              <span className="text-gray-400"> · {detectedProfile}</span>
            )}
          </p>
        </div>
        <div className="text-sm text-gray-400 bg-gray-100 rounded px-3 py-1">
          No duplicates detected
        </div>
      </div>

      <div className="overflow-auto rounded-lg border border-gray-200 mb-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Date</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Description</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Amount</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Category</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categorisedRows.map((row, i) => (
              <Fragment key={i}>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.date}</td>
                  <td className="px-3 py-2 text-gray-700 max-w-xs truncate">{row.description}</td>
                  <td
                    className={`px-3 py-2 text-right font-mono whitespace-nowrap ${
                      row.amount < 0 ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {formatPence(row.amount)}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={categoryOverrides[i] ?? row.category}
                      onChange={(e) => handleCategoryChange(i, e.target.value, row.category)}
                      className="text-sm text-gray-700 border border-gray-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    >
                      {activeCategories.map((cat) => (
                        <option key={cat.name} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
                {rulePromptFor?.rowIndex === i && (
                  <tr>
                    <td colSpan={4} className="p-0">
                      <KeywordRulePrompt
                        transactionDescription={rulePromptFor.description}
                        category={rulePromptFor.category}
                        onConfirm={handleRuleConfirm}
                        onDismiss={handleRuleDismiss}
                        duplicateWarning={!ruleConflictWarned ? (ruleSaveWarning || undefined) : undefined}
                        overrideWarning={ruleConflictWarned ? (ruleSaveWarning || undefined) : undefined}
                        isSaving={isRuleSaving}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => onConfirm(categoryOverrides)}
          disabled={isConfirming || rows.length === 0}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConfirming ? 'Saving…' : 'Confirm Import'}
        </button>
        <button
          onClick={onCancel}
          disabled={isConfirming}
          className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
