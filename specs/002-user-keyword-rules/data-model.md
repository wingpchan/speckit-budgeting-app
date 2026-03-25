# Data Model: User-Defined Keyword Rules

**Branch**: `002-user-keyword-rules` | **Date**: 2026-03-21

---

## New Record Type: `KeywordRuleRecord`

### TypeScript Interface

```typescript
// src/models/index.ts — add to record types

interface KeywordRuleRecord {
  type: 'keywordRule';
  pattern: string;       // Literal substring to match (case-insensitive); min 1 non-whitespace char
  category: string;      // Target category name
  createdDate: string;   // ISO 8601 datetime (YYYY-MM-DDTHH:mm:ssZ)
  status: 'active' | 'inactive';
}
```

### Union Update

```typescript
// src/models/index.ts — extend AllRecordTypes

type AllRecordTypes =
  | MetaRecord
  | TransactionRecord
  | BudgetRecord
  | CategoryRecord
  | FormatProfileRecord
  | PersonRecord
  | AccountPersonMappingRecord
  | KeywordRuleRecord;          // ← new
```

### `RecordType` Union Update

```typescript
type RecordType =
  | 'meta'
  | 'transaction'
  | 'budget'
  | 'category'
  | 'formatProfile'
  | 'person'
  | 'accountPersonMapping'
  | 'keywordRule';              // ← new
```

---

## Ledger Header Extension

### New Column

Only one new column is required:

| Column | Position | Used by |
|--------|----------|---------|
| `pattern` | Append to end of LEDGER_HEADER | `keywordRule` only |

### Updated `LEDGER_HEADER` (conceptual — implementation in `ledger-writer.ts`)

```
type, version, date, description, amount, transactionType, category, account,
sourceFile, importedDate, contentHash, personName, month, setDate, reason,
name, isDefault, createdDate, status, profileName, columnMappings,
detectionHints, accountName, effectiveDate, pattern
```

### `keywordRule` Column Mapping

| Column | `KeywordRuleRecord` field | Other record types |
|--------|--------------------------|-------------------|
| `type` | `'keywordRule'` | as-is |
| `pattern` | `pattern` | `''` (empty) |
| `category` | `category` | as-is (used by `transaction`, `budget`, `category`) |
| `createdDate` | `createdDate` | as-is (used by `category`, `formatProfile`, `person`) |
| `status` | `status` | as-is (used by `category`, `person`) |
| all other columns | `''` (empty) | as-is |

---

## `KeywordIndex` Extension

### Updated Interface

```typescript
// src/services/categoriser/categoriser.service.ts

interface KeywordEntry {
  keywordUpper: string;   // pattern.toUpperCase()
  category: string;
  source: 'user' | 'default';  // NEW — for future diagnostics; not used in matching logic
}

interface KeywordIndex {
  entries: KeywordEntry[];  // user-defined rules first (longest pattern first), then default map
  fallback: string;
}
```

### `buildKeywordIndex` Signature Change

```typescript
// Before:
export function buildKeywordIndex(
  categories: CategoryRecord[],
  keywordMap: Array<{ keyword: string; category: string }>,
): KeywordIndex

// After:
export function buildKeywordIndex(
  categories: CategoryRecord[],
  keywordMap: Array<{ keyword: string; category: string }>,
  userRules?: KeywordRuleRecord[],   // NEW optional parameter
): KeywordIndex
```

### Entry Construction Order

```
1. Derive active category names from categories[]
2. Filter userRules: status === 'active' AND target category is in active category names
3. Sort filtered userRules by pattern.length descending; stable sort preserves createdDate order for ties
4. Prepend user-derived entries (source: 'user') to the entries array
5. Append default-map entries (source: 'default') as before, filtered by active categories
6. fallback = 'Uncategorised'
```

---

## Authoritative Record Resolution

`keywordRule` records follow the same append-only supersession pattern as other ledger record types:

- **Grouping key**: `pattern` (case-insensitive) — all records with the same lowercased pattern are in the same group.
- **Authoritative record**: the record with the most recent `createdDate` in the group.
- **Status transitions**: deactivate → append new record with `status: 'inactive'`; reactivate → append new record with `status: 'active'`.

This is handled in `parseLedgerCsv()` in `ledger-reader.ts`, analogous to the transaction supersession already implemented.

---

## Validation Rules

| Field | Rule |
|-------|------|
| `pattern` | MUST NOT be empty or whitespace-only; minimum 1 non-whitespace character |
| `category` | MUST reference a known category name (active or inactive at time of creation) |
| `createdDate` | MUST be a valid ISO 8601 datetime string |
| `status` | MUST be `'active'` or `'inactive'` |

---

## State Transitions

```
[not created]
     │  user confirms rule prompt
     ▼
  active ──── user deactivates ──► inactive
     ▲                                 │
     └──────── user reactivates ───────┘
```

No terminal state; rules cannot be deleted (append-only ledger).

---

## Derived State: Effective Rules for Categorisation

At the point `buildKeywordIndex()` is called during an import session:

1. Read all `keywordRule` records from the ledger.
2. Group by lowercased `pattern` → take the most recent record per group.
3. Filter: `status === 'active'` AND `category` in active category names.
4. Sort: descending `pattern.length`; ties resolved by descending `createdDate`.
5. These become the prepended user entries in `KeywordIndex.entries`.
