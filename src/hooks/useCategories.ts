import { useMemo } from 'react';
import { useLedger } from './useLedger';
import type { CategoryRecord } from '../models/index';

interface UseCategoriesResult {
  allCategories: CategoryRecord[];
  activeCategories: CategoryRecord[];
  defaultCategories: CategoryRecord[];
  customCategories: CategoryRecord[];
}

/**
 * Derives current category state from ledger records.
 * Uses most-recent-record logic: for each category name, the latest record's status wins.
 */
export function useCategories(): UseCategoriesResult {
  const { records } = useLedger();

  const allCategories = useMemo<CategoryRecord[]>(() => {
    const categoryRecords = records.filter(
      (r): r is CategoryRecord => r.type === 'category',
    );

    // Most-recent-record wins per name
    const latestByName = new Map<string, CategoryRecord>();
    for (const record of categoryRecords) {
      latestByName.set(record.name.toLowerCase(), record);
    }

    return Array.from(latestByName.values());
  }, [records]);

  const activeCategories = useMemo(
    () => allCategories.filter((c) => c.status === 'active'),
    [allCategories],
  );

  const defaultCategories = useMemo(
    () => allCategories.filter((c) => c.isDefault),
    [allCategories],
  );

  const customCategories = useMemo(
    () => allCategories.filter((c) => !c.isDefault),
    [allCategories],
  );

  return { allCategories, activeCategories, defaultCategories, customCategories };
}
