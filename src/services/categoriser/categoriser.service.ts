import type { CategoryRecord } from '../../models/index';
import type { KeywordIndex } from '../csv-parser/types';

/**
 * Builds a keyword index from active categories and a keyword map.
 * Only active categories are included; keywords mapping to inactive categories are excluded.
 *
 * @param categories   All category records (status determines active/inactive)
 * @param keywordMap   Ordered keyword → category entries (first match wins)
 */
export function buildKeywordIndex(
  categories: CategoryRecord[],
  keywordMap: Array<{ keyword: string; category: string }>,
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

  // Build ordered entries — only include keywords whose category is active
  const entries = keywordMap
    .filter((entry) => activeNames.has(entry.category.toLowerCase()))
    .map((entry) => ({
      keywordUpper: entry.keyword.toUpperCase(),
      category: entry.category,
    }));

  return { entries, fallback: 'Uncategorised' };
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
