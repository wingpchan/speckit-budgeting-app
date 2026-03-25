import { useMemo, useState, useCallback } from 'react';
import { useLedger } from './useLedger';
import { useCategories } from './useCategories';
import {
  resolveKeywordRules,
  saveKeywordRule,
  setKeywordRuleStatus,
  isDuplicateRule,
} from '../services/categoriser/keyword-rules.service';
import type { KeywordRuleRecord, ResolvedKeywordRule } from '../models/index';
import { useSession } from '../store/SessionContext';

interface UseKeywordRulesReturn {
  /** Resolved rules: most-recent per pattern, sorted by createdDate desc, with categoryIsInactive set */
  rules: ResolvedKeywordRule[];

  /**
   * Save a new keyword rule to the ledger.
   * Returns 'saved' if successful, 'duplicate' if an identical active rule already exists.
   */
  saveRule: (pattern: string, category: string) => Promise<'saved' | 'duplicate'>;

  /** Toggle a rule's active/inactive status by appending a new ledger record */
  toggleStatus: (pattern: string, newStatus: 'active' | 'inactive') => Promise<void>;

  /** Whether a rule operation is in flight */
  isSaving: boolean;
}

export function useKeywordRules(): UseKeywordRulesReturn {
  const { state } = useSession();
  const { records, appendRecords } = useLedger();
  const { allCategories } = useCategories();
  const [isSaving, setIsSaving] = useState(false);

  const rawKeywordRules = useMemo(
    () => records.filter((r): r is KeywordRuleRecord => r.type === 'keywordRule'),
    [records],
  );

  const activeCategoryNames = useMemo(
    () => new Set(allCategories.filter((c) => c.status === 'active').map((c) => c.name)),
    [allCategories],
  );

  const rules = useMemo<ResolvedKeywordRule[]>(() => {
    const resolved = resolveKeywordRules(rawKeywordRules);
    return resolved.map((r) => ({
      ...r,
      categoryIsInactive: !activeCategoryNames.has(r.category),
    }));
  }, [rawKeywordRules, activeCategoryNames]);

  const saveRule = useCallback(
    async (pattern: string, category: string): Promise<'saved' | 'duplicate'> => {
      if (isDuplicateRule(pattern, category, rules)) {
        return 'duplicate';
      }
      setIsSaving(true);
      try {
        if (!state.dirHandle) throw new Error('No ledger directory selected');
        await saveKeywordRule(pattern, category, state.dirHandle, appendRecords);
        return 'saved';
      } finally {
        setIsSaving(false);
      }
    },
    [rules, state.dirHandle, appendRecords],
  );

  const toggleStatus = useCallback(
    async (pattern: string, newStatus: 'active' | 'inactive'): Promise<void> => {
      setIsSaving(true);
      try {
        if (!state.dirHandle) throw new Error('No ledger directory selected');
        const rule = rules.find((r) => r.pattern === pattern);
        const category = rule?.category ?? '';
        await setKeywordRuleStatus(pattern, category, newStatus, state.dirHandle, appendRecords);
      } finally {
        setIsSaving(false);
      }
    },
    [rules, state.dirHandle, appendRecords],
  );

  return { rules, saveRule, toggleStatus, isSaving };
}
