import { useCallback, useMemo } from 'react';
import { useLedger } from './useLedger';
import { useSession } from '../store/SessionContext';
import {
  addCategory as addCategoryService,
  deactivateCategory as deactivateCategoryService,
  reactivateCategory as reactivateCategoryService,
} from '../services/categoriser/category.service';
import type { CategoryRecord } from '../models/index';

interface UseCategoriesResult {
  allCategories: CategoryRecord[];
  activeCategories: CategoryRecord[];
  defaultCategories: CategoryRecord[];
  customCategories: CategoryRecord[];
  addCategory: (name: string) => Promise<void>;
  deactivateCategory: (name: string) => Promise<void>;
  reactivateCategory: (name: string) => Promise<void>;
  isLoading: boolean;
}

/**
 * Derives current category state from ledger records and exposes mutating actions.
 * Uses most-recent-record logic: for each category name, the latest record's status wins.
 */
export function useCategories(): UseCategoriesResult {
  const { state } = useSession();
  void state; // dirHandle accessed via useLedger
  const { records, isLoading, appendRecords } = useLedger();

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

  const categoryRecords = useMemo(
    () => records.filter((r): r is CategoryRecord => r.type === 'category'),
    [records],
  );

  const noop = {} as FileSystemDirectoryHandle;

  const addCategory = useCallback(
    (name: string) => addCategoryService(name, noop, categoryRecords, appendRecords),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categoryRecords, appendRecords],
  );

  const deactivateCategory = useCallback(
    (name: string) => deactivateCategoryService(name, noop, categoryRecords, appendRecords),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categoryRecords, appendRecords],
  );

  const reactivateCategory = useCallback(
    (name: string) => reactivateCategoryService(name, noop, categoryRecords, appendRecords),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categoryRecords, appendRecords],
  );

  return {
    allCategories,
    activeCategories,
    defaultCategories,
    customCategories,
    addCategory,
    deactivateCategory,
    reactivateCategory,
    isLoading,
  };
}
