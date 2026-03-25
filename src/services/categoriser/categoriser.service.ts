import type { CategoryRecord, KeywordRuleRecord } from '../../models/index';
import type { KeywordEntry, KeywordIndex } from '../csv-parser/types';

/**
 * Builds a keyword index from active categories, a keyword map, and optional user-defined rules.
 * User rules are prepended (longest-pattern first) before default-map entries.
 * Only active categories are included; entries mapping to inactive categories are excluded.
 *
 * @param categories   All category records (status determines active/inactive)
 * @param keywordMap   Ordered keyword → category entries (first match wins)
 * @param userRules    Optional resolved user-defined keyword rules to prepend
 */
export function buildKeywordIndex(
  categories: CategoryRecord[],
  keywordMap: Array<{ keyword: string; category: string }>,
  userRules?: KeywordRuleRecord[],
): KeywordIndex {
  // Determine current status of each category name (most recent record wins)
  const statusByName = new Map<string, 'active' | 'inactive'>();
  for (const cat of categories) {
    statusByName.set(cat.name.toLowerCase(), cat.status);
  }

  const activeNames = new Set(
    [...statusByName.entries()]
      .filter(([, status]) => status === 'active')
      .map(([name]) => name),
  );

  // Build user-rule entries: filter to active rules with active categories,
  // sort by descending pattern.length (stable — preserves createdDate order for ties)
  const userEntries: KeywordEntry[] = [];
  if (userRules && userRules.length > 0) {
    const filtered = userRules
      .filter(
        (r) => r.status === 'active' && activeNames.has(r.category.toLowerCase()),
      )
      // Sort by descending pattern length; ties resolved by descending createdDate
      .sort((a, b) => {
        const lenDiff = b.pattern.length - a.pattern.length;
        if (lenDiff !== 0) return lenDiff;
        return b.createdDate.localeCompare(a.createdDate);
      });

    for (const rule of filtered) {
      userEntries.push({
        keywordUpper: rule.pattern.toUpperCase(),
        category: rule.category,
        source: 'user',
      });
    }
  }

  // Build default-map entries — only include keywords whose category is active
  const defaultEntries: KeywordEntry[] = keywordMap
    .filter((entry) => activeNames.has(entry.category.toLowerCase()))
    .map((entry) => ({
      keywordUpper: entry.keyword.toUpperCase(),
      category: entry.category,
      source: 'default' as const,
    }));

  return { entries: [...userEntries, ...defaultEntries], fallback: 'Uncategorised' };
}

/**
 * Categorises a transaction description using the keyword index.
 * Matching is case-insensitive substring; first match wins.
 * Returns "Uncategorised" if no keyword matches.
 */
export function categorise(description: string, index: KeywordIndex): string {
  const upper = description.toUpperCase();
  for (const { keywordUpper, category } of index.entries) {
    if (upper.includes(keywordUpper)) return category;
  }
  return index.fallback;
}
