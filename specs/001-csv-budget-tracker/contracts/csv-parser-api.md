# Contract: Generic CSV Parser API

**Branch**: `001-csv-budget-tracker` | **Date**: 2026-03-19

This document specifies the TypeScript interface for the generic, data-driven CSV parser. No bank-specific logic may appear in the implementation (Principle VI). All format variations are expressed via `FormatProfileRecord` data — never via code branches keyed on bank identity.

---

## Design Invariants

- The parser has **no knowledge of specific banks**. It operates on column headers and data patterns only.
- All three reference formats (Nationwide current, Nationwide credit card, NewDay credit card) are expressed as `FormatProfile` entries in the ledger — not hardcoded.
- Adding support for a new bank requires **only a data change** (adding/updating a `FormatProfile`), never a code change.

---

## Core Types

```typescript
/** Canonical target fields the parser maps source columns onto */
type CanonicalField =
  | 'date'
  | 'description'
  | 'amount'        // unified single-amount column
  | 'paidOut'       // split debit column (Nationwide style)
  | 'paidIn'        // split credit column
  | 'balance'       // optional running balance
  | 'transactionType' // if explicitly present in CSV
  | 'ignore';       // column recognised but intentionally discarded

/** A single column mapping entry */
interface ColumnMapping {
  sourceHeader: string;   // normalised header from CSV (trimmed, not lowercased here)
  canonicalField: CanonicalField;
  transform?: ColumnTransform; // optional post-parse transformation
}

type ColumnTransform =
  | 'stripPound'    // remove leading £ symbol before numeric parse
  | 'negateAmount'  // multiply parsed value by -1 (for explicit debit columns)
  | 'absAmount'     // take absolute value (signed single-column where sign conveys type)
  | 'parseDDMonYYYY'  // parse "15 Mar 2026" → ISO date
  | 'parseUKDate';    // parse "15/03/2026" → ISO date

/** Detection hints that identify a format before full header mapping */
interface DetectionHints {
  metadataRowCount: number;    // rows to skip before the header row (0 for NewDay, 3 for Nationwide)
  dateFormat: string;          // e.g. "DD Mon YYYY" | "DD/MM/YYYY" | "ISO"
  headerSignatures: string[];  // subset of column names that uniquely identify this profile
  confidenceThreshold: number; // 0.0–1.0; auto-map if score ≥ threshold
}

/** Result of attempting auto-detection */
type DetectionResult =
  | { status: 'matched'; profileName: string; mappings: ColumnMapping[] }
  | { status: 'unrecognised'; suggestedMappings: Partial<ColumnMapping[]> }
  | { status: 'noData'; message: string };
```

---

## Parser Service Interface

```typescript
interface ParsedRow {
  date: string;                // ISO 8601
  description: string;
  amount: number;              // pence integer; negative = expense
  transactionType: 'expense' | 'income';
  balance?: number;            // pence integer; omitted if not in source
}

interface ParseResult {
  rows: ParsedRow[];
  detectedProfile: string | null;  // profileName if auto-detected
  warnings: ParseWarning[];
}

interface ParseWarning {
  rowIndex: number;
  field: string;
  message: string;
}

interface CsvParserService {
  /**
   * Attempt to auto-detect a matching format profile and parse the CSV.
   * Returns rows + detection metadata.
   * Throws ParseError if file is not CSV or contains no financial data.
   */
  parse(
    file: File,
    profiles: FormatProfileRecord[]
  ): Promise<ParseResult>;

  /**
   * Detect which profile (if any) matches the file headers.
   * Does not parse data rows.
   */
  detect(
    file: File,
    profiles: FormatProfileRecord[]
  ): Promise<DetectionResult>;

  /**
   * Parse using an explicit column mapping (from manual mapping UI or a known profile).
   * Used after the user completes manual mapping or when detect() returns 'matched'.
   */
  parseWithMapping(
    file: File,
    mappings: ColumnMapping[],
    hints: Pick<DetectionHints, 'metadataRowCount' | 'dateFormat'>
  ): Promise<ParseResult>;
}
```

---

## Reference Format Profiles

The following profiles are seeded into every new ledger at initialisation. They are stored as `FormatProfileRecord` entries — not compiled into the parser.

### Nationwide Current Account

```json
{
  "profileName": "Nationwide Current Account",
  "detectionHints": {
    "metadataRowCount": 3,
    "dateFormat": "DD Mon YYYY",
    "headerSignatures": ["Paid out", "Paid in", "Balance"],
    "confidenceThreshold": 0.8
  },
  "columnMappings": [
    { "sourceHeader": "Date",        "canonicalField": "date",        "transform": "parseDDMonYYYY" },
    { "sourceHeader": "Transactions","canonicalField": "description"  },
    { "sourceHeader": "Paid out",    "canonicalField": "paidOut",     "transform": "stripPound" },
    { "sourceHeader": "Paid in",     "canonicalField": "paidIn",      "transform": "stripPound" },
    { "sourceHeader": "Balance",     "canonicalField": "balance",     "transform": "stripPound" }
  ]
}
```

### Nationwide Credit Card

```json
{
  "profileName": "Nationwide Credit Card",
  "detectionHints": {
    "metadataRowCount": 3,
    "dateFormat": "DD Mon YYYY",
    "headerSignatures": ["Paid out", "Paid in", "Location"],
    "confidenceThreshold": 0.8
  },
  "columnMappings": [
    { "sourceHeader": "Date",        "canonicalField": "date",        "transform": "parseDDMonYYYY" },
    { "sourceHeader": "Transactions","canonicalField": "description"  },
    { "sourceHeader": "Location",    "canonicalField": "ignore"       },
    { "sourceHeader": "Paid out",    "canonicalField": "paidOut",     "transform": "stripPound" },
    { "sourceHeader": "Paid in",     "canonicalField": "paidIn",      "transform": "stripPound" }
  ]
}
```

### NewDay Credit Card

```json
{
  "profileName": "NewDay Credit Card",
  "detectionHints": {
    "metadataRowCount": 0,
    "dateFormat": "DD/MM/YYYY",
    "headerSignatures": ["Date", "Description", "Amount"],
    "confidenceThreshold": 0.7
  },
  "columnMappings": [
    { "sourceHeader": "Date",        "canonicalField": "date",        "transform": "parseUKDate" },
    { "sourceHeader": "Description", "canonicalField": "description"  },
    { "sourceHeader": "Amount",      "canonicalField": "amount",      "transform": "negateAmount" }
  ]
}
```

*Note*: NewDay uses a signed amount where negative = expense. `negateAmount` is applied so the canonical `amount` follows the convention: negative = expense, positive = income — matching the master ledger storage convention.

---

## Error Types

```typescript
class ParseError extends Error {
  constructor(
    public code:
      | 'NOT_CSV'          // file is not a CSV (wrong type or unreadable as text)
      | 'NO_FINANCIAL_DATA' // CSV has no parseable financial columns
      | 'UNRESOLVABLE_COLUMNS', // required columns cannot be mapped even after sampling
    message: string
  ) { super(message); }
}
```

---

## Column Scoring Algorithm (implementation guidance)

1. Load headers; normalise each (`.trim().toLowerCase()`).
2. For each `(sourceHeader, canonicalField)` candidate pair, compute a score 0.0–1.0:
   - Score 1.0: exact match against a known synonym list.
   - Score 0.8: regex match (e.g. header contains `"date"`).
   - Score 0.5: data-pattern match on sampled rows (e.g. column values look like dates).
   - Score 0.0: no match.
3. Greedily assign each source column to the highest-scoring canonical field above `CONFIDENCE_THRESHOLD`.
4. If `date`, `description`, and at least one amount field cannot be assigned: return `DetectionResult.status = 'unrecognised'` with best-guess `suggestedMappings` for the UI to display.
