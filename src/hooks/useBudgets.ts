import { useCallback } from 'react';
import { useLedger } from './useLedger';
import {
  resolveBudget,
  getBudgetState,
  saveBudget as saveBudgetService,
  getBudgetChanges,
} from '../services/budget/budget.service';
import { useSession } from '../store/SessionContext';
import type { BudgetRecord } from '../models/index';

interface UseBudgetsResult {
  resolveBudget: (month: string, category: string) => number;
  getBudgetState: (actual: number, budget: number) => 'over' | 'under' | 'exact';
  saveBudget: (month: string, category: string, amount: number, reason: string) => Promise<void>;
  getBudgetChanges: (category: string) => BudgetRecord[];
}

export function useBudgets(): UseBudgetsResult {
  const { state } = useSession();
  const { records, appendRecords } = useLedger();

  const budgetRecords = records.filter((r): r is BudgetRecord => r.type === 'budget');

  const resolve = useCallback(
    (month: string, category: string) => resolveBudget(month, category, budgetRecords),
    [budgetRecords],
  );

  const getState = useCallback(
    (actual: number, budget: number) => getBudgetState(actual, budget),
    [],
  );

  const save = useCallback(
    async (month: string, category: string, amount: number, reason: string) => {
      if (!state.dirHandle) throw new Error('No ledger directory selected');
      await saveBudgetService(month, category, amount, reason, state.dirHandle, appendRecords);
    },
    [state.dirHandle, appendRecords],
  );

  const getChanges = useCallback(
    (category: string) => getBudgetChanges(category, budgetRecords),
    [budgetRecords],
  );

  return {
    resolveBudget: resolve,
    getBudgetState: getState,
    saveBudget: save,
    getBudgetChanges: getChanges,
  };
}
