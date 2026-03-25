import type { KeywordRuleRecord, ResolvedKeywordRule } from '../../models/index';
import { serialiseRecord, appendRecords } from '../ledger/ledger-writer';

/**
 * Check whether an active rule with the same pattern (case-insensitive) and category already exists.
 * Returns true if a duplicate is found.
 */
export function isDuplicateRule(
  pattern: string,
  category: string,
  existingRules: ResolvedKeywordRule[],
): boolean {
  const lowerPattern = pattern.toLowerCase();
  return existingRules.some(
    (r) =>
      r.status === 'active' &&
      r.pattern.toLowerCase() === lowerPattern &&
      r.category === category,
  );
}

/**
 * Find an active rule with the same pattern but a different category.
 * Returns the conflicting rule, or undefined if none exists.
 * Use this to warn the user before silently replacing an existing rule.
 */
export function findConflictingRule(
  pattern: string,
  category: string,
  existingRules: ResolvedKeywordRule[],
): ResolvedKeywordRule | undefined {
  const lowerPattern = pattern.toLowerCase();
  return existingRules.find(
    (r) =>
      r.status === 'active' &&
      r.pattern.toLowerCase() === lowerPattern &&
      r.category !== category,
  );
}

/**
 * Append a new keywordRule record to the master ledger.
 * Does not check for duplicates — caller is responsible for pre-checking via isDuplicateRule().
 */
export async function saveKeywordRule(
  pattern: string,
  category: string,
  dirHandle: FileSystemDirectoryHandle,
  appendFn?: (rows: string[]) => Promise<void>,
): Promise<void> {
  const record: KeywordRuleRecord = {
    type: 'keywordRule',
    pattern,
    category,
    createdDate: new Date().toISOString(),
    status: 'active',
  };
  const row = serialiseRecord(record);
  if (appendFn) {
    await appendFn([row]);
  } else {
    await appendRecords(dirHandle, [row]);
  }
}

/**
 * Append a new keywordRule record to deactivate or reactivate an existing rule.
 * The prior record is unchanged (append-only).
 */
export async function setKeywordRuleStatus(
  pattern: string,
  category: string,
  status: 'active' | 'inactive',
  dirHandle: FileSystemDirectoryHandle,
  appendFn?: (rows: string[]) => Promise<void>,
): Promise<void> {
  const record: KeywordRuleRecord = {
    type: 'keywordRule',
    pattern,
    category,
    createdDate: new Date().toISOString(),
    status,
  };
  const row = serialiseRecord(record);
  if (appendFn) {
    await appendFn([row]);
  } else {
    await appendRecords(dirHandle, [row]);
  }
}

/**
 * Resolve raw keywordRule records from the ledger into one authoritative record per pattern.
 * Groups by lowercased pattern, takes the most recent createdDate per group.
 * Returns resolved rules sorted by createdDate descending.
 * categoryIsInactive is set to false — consumers with category context should enrich it.
 */
export function resolveKeywordRules(rawRecords: KeywordRuleRecord[]): ResolvedKeywordRule[] {
  const byPattern = new Map<string, KeywordRuleRecord>();

  for (const record of rawRecords) {
    const key = record.pattern.toLowerCase();
    const existing = byPattern.get(key);
    if (!existing || record.createdDate > existing.createdDate) {
      byPattern.set(key, record);
    }
  }

  return Array.from(byPattern.values())
    .sort((a, b) => b.createdDate.localeCompare(a.createdDate))
    .map((r) => ({
      pattern: r.pattern,
      category: r.category,
      createdDate: r.createdDate,
      status: r.status,
      categoryIsInactive: false,
    }));
}
