import type { CanonicalField, ColumnMapping, FormatProfileRecord } from '../../models/index';
import type { DetectionResult } from './types';

/**
 * Known exact synonyms for each canonical field (all lowercase for comparison).
 * A source header that normalises to one of these gets score 1.0.
 */
const FIELD_SYNONYMS: Partial<Record<CanonicalField, string[]>> = {
  date: ['date', 'transaction date', 'trans date', 'posting date', 'value date', 'trade date'],
  description: [
    'description',
    'transactions',
    'narrative',
    'memo',
    'reference',
    'details',
    'payee',
    'merchant',
    'details of transactions',
    'transaction details',
  ],
  amount: ['amount', 'value', 'amt', 'net amount', 'transaction amount'],
  paidOut: ['paid out', 'debit', 'withdrawals', 'withdrawal', 'debit amount', 'money out', 'out'],
  paidIn: ['paid in', 'credit', 'deposits', 'deposit', 'credit amount', 'money in', 'in'],
  balance: ['balance', 'running balance', 'available balance', 'account balance'],
  transactionType: ['type', 'transaction type', 'trans type'],
};

/**
 * Keywords used for partial (regex-style) matching at score 0.8.
 * If the normalised header contains any of these keywords, score = 0.8.
 */
const FIELD_KEYWORDS: Partial<Record<CanonicalField, string[]>> = {
  date: ['date'],
  description: ['desc', 'narr', 'memo', 'ref', 'detail', 'payee'],
  amount: ['amount', 'value', 'amt'],
  paidOut: ['debit', 'out', 'paid'],
  paidIn: ['credit', 'in', 'paid'],
  balance: ['balance'],
  transactionType: ['type'],
};

/** Regex patterns for data-pattern scoring at 0.5. */
const DATA_PATTERNS: Partial<Record<CanonicalField, RegExp>> = {
  date: /^(\d{1,2}[\s/][A-Za-z\d]+[\s/]\d{2,4}|\d{4}-\d{2}-\d{2})$/,
  amount: /^-?[£$€]?\d[\d,]*(\.\d{1,2})?$/,
  paidOut: /^[£$€]?\d[\d,]*(\.\d{1,2})?$/,
  paidIn: /^[£$€]?\d[\d,]*(\.\d{1,2})?$/,
  balance: /^-?[£$€]?\d[\d,]*(\.\d{1,2})?$/,
};

/** Minimum fraction of non-empty data rows that must match the pattern for score 0.5. */
const DATA_PATTERN_THRESHOLD = 0.6;

/**
 * Score a (sourceHeader, canonicalField) pair.
 *
 * @param sourceHeader  Raw header string from the CSV (trimming is applied internally)
 * @param canonicalField  The canonical field to score against
 * @param columnData  Optional: up to 10 sampled non-header cell values for pattern detection
 * @returns Score in range [0.0, 1.0]
 */
export function scoreHeaderMapping(
  sourceHeader: string,
  canonicalField: CanonicalField,
  columnData?: string[],
): number {
  if (canonicalField === 'ignore') return 0.0;

  const normalized = sourceHeader.trim().toLowerCase();
  const synonyms = FIELD_SYNONYMS[canonicalField] ?? [];

  // Score 1.0 — exact synonym match
  if (synonyms.includes(normalized)) return 1.0;

  // Score 0.8 — partial/keyword match (header contains a known keyword for this field)
  const keywords = FIELD_KEYWORDS[canonicalField] ?? [];
  if (keywords.some((kw) => normalized.includes(kw))) return 0.8;

  // Score 0.5 — data-pattern match on sampled values
  if (columnData && columnData.length > 0) {
    const pattern = DATA_PATTERNS[canonicalField];
    if (pattern) {
      const nonEmpty = columnData.filter((v) => v.trim() !== '');
      if (nonEmpty.length > 0) {
        const matchFraction =
          nonEmpty.filter((v) => pattern.test(v.trim())).length / nonEmpty.length;
        if (matchFraction >= DATA_PATTERN_THRESHOLD) return 0.5;
      }
    }
  }

  return 0.0;
}

/**
 * Detect a matching format profile from a list of CSV headers.
 *
 * Detection strategy:
 * 1. Check each profile's `headerSignatures` — if all signatures appear in the headers
 *    (case-insensitive), the profile is a match and its pre-defined columnMappings are returned.
 * 2. If no profile matches, fall back to generic scoring to produce `suggestedMappings`
 *    for the manual mapping UI.
 *
 * @param headers  Headers extracted from the CSV (after skipping metadata rows)
 * @param profiles  Available format profiles to test against
 * @param dataRows  Optional: up to 10 data rows (same column order as headers) for pattern scoring
 */
export function detectProfile(
  headers: string[],
  profiles: FormatProfileRecord[],
  dataRows?: string[][],
): DetectionResult {
  const normalizedHeaders = headers.map((h) => h.trim().toLowerCase());

  // Signature-based profile matching
  for (const profile of profiles) {
    const sigs = profile.detectionHints.headerSignatures.map((s) => s.trim().toLowerCase());
    const allPresent = sigs.every((sig) => normalizedHeaders.includes(sig));
    if (allPresent) {
      return {
        status: 'matched',
        profileName: profile.profileName,
        mappings: profile.columnMappings,
      };
    }
  }

  // Generic scoring fallback — produce suggested mappings for the manual mapping UI
  const candidateFields: CanonicalField[] = [
    'date',
    'description',
    'amount',
    'paidOut',
    'paidIn',
    'balance',
    'transactionType',
  ];
  const assigned = new Set<CanonicalField>();
  const suggestedMappings: Partial<ColumnMapping>[] = [];

  for (let hi = 0; hi < headers.length; hi++) {
    const header = headers[hi];
    const colData = dataRows ? dataRows.map((row) => row[hi] ?? '').slice(0, 10) : undefined;

    let bestField: CanonicalField | null = null;
    let bestScore = 0;

    for (const field of candidateFields) {
      if (assigned.has(field)) continue;
      const score = scoreHeaderMapping(header, field, colData);
      if (score > bestScore) {
        bestScore = score;
        bestField = field;
      }
    }

    if (bestField && bestScore > 0) {
      assigned.add(bestField);
      suggestedMappings.push({ sourceHeader: header, canonicalField: bestField });
    } else {
      suggestedMappings.push({ sourceHeader: header });
    }
  }

  return { status: 'unrecognised', suggestedMappings };
}
