# Data Model: UK Bank CSV Budget Tracker

**Branch**: `001-csv-budget-tracker` | **Date**: 2026-03-19
**Source**: spec.md v1.6.0 + research.md

---

## Master Ledger CSV Layout

The master ledger is a single UTF-8, RFC 4180–compliant CSV file named `budget-ledger.csv` stored in the user-selected folder. All six record types share one file, identified by the `type` column. Columns not applicable to a given record type are left empty.

**Current format version**: `2`

### Column Order (superset)

```
type, version, date, description, amount, transactionType, category, account,
sourceFile, importedDate, contentHash, personName, month, setDate, reason,
name, isDefault, createdDate, status, profileName, columnMappings,
detectionHints, accountName, effectiveDate
```

**First row**: column header row (literal column names above).
**Second row**: `meta` record with `version=2`, all other columns empty.
**Subsequent rows**: data records, append-only.

### Structural Rules

- Records are **append-only**. Existing rows are never modified or deleted.
- `columnMappings` and `detectionHints` are JSON-serialised strings, RFC 4180–quoted.
- All monetary `amount` values are stored as **pence integers** (no decimal point, no currency symbol).
- Dates use **ISO 8601** (`YYYY-MM-DD`) unless specified otherwise.
- The `meta` record version is compared to the `LEDGER_VERSION` constant at app start; a mismatch triggers the migration flow.

---

## TypeScript Interfaces

### Base

```typescript
type RecordType =
  | 'meta'
  | 'transaction'
  | 'budget'
  | 'category'
  | 'formatProfile'
  | 'person'
  | 'accountPersonMapping';
```

### MetaRecord

```typescript
interface MetaRecord {
  type: 'meta';
  version: number; // e.g. 2
}
```

### TransactionRecord

```typescript
interface TransactionRecord {
  type: 'transaction';
  date: string;            // ISO 8601 YYYY-MM-DD
  description: string;
  amount: number;          // pence integer; negative = expense
  transactionType: 'expense' | 'income';
  category: string;        // category name
  account: string;         // account label (user-supplied or from CSV metadata)
  sourceFile: string;      // original filename only, e.g. "nationwide-march-2026.csv"
  importedDate: string;    // ISO 8601 date the import was committed
  contentHash: string;     // SHA-256 hex of the source CSV file
  personName: string;      // derived from accountPersonMapping at import time
}
```

**Validation**:
- `amount` ≠ 0 (zero-value transactions are unusual; warn but do not block)
- `date` must parse as a valid calendar date
- `personName` must not be empty; defaults to `"Household"` if no mapping covers the transaction date

### BudgetRecord

```typescript
interface BudgetRecord {
  type: 'budget';
  month: string;           // YYYY-MM
  category: string;        // category name
  amount: number;          // pence integer (monthly budget limit)
  setDate: string;         // ISO 8601 date the record was created
  reason?: string;         // required when editing a past month; optional otherwise
}
```

**Validation**:
- `amount` ≥ 0
- `month` must match `YYYY-MM` pattern
- `reason` must be non-empty (trimmed) when setting a budget for any month prior to the current calendar month
- Multiple records may exist for the same `month`+`category`; the one with the latest `setDate` is authoritative (FR-025)

**Default budget resolution** (FR-026):
```
budget(month, category) = latest record for (month, category)
                          ?? latest record for (prevMonth, category)
                          ?? 0
```

### CategoryRecord

```typescript
interface CategoryRecord {
  type: 'category';
  name: string;
  isDefault: boolean;
  createdDate: string;     // ISO 8601
  status: 'active' | 'inactive';
}
```

**Validation**:
- `name` must be unique case-insensitively across all category records (checked at creation time)
- Deactivation appends a new record with `status: 'inactive'`; reactivation appends one with `status: 'active'`
- The most recent record for a given `name` determines current status
- No delete operation exists

**Default categories** (hardcoded at ledger initialisation as `isDefault: true`):

```
Housing, Groceries, Transport, Entertainment, Utilities,
Health & Fitness, Shopping, Personal Care, Eating Out, Travel,
Holidays, Subscriptions, Insurance, Savings & Investments,
Fuel, Taxes, Income, Internal Transfer, Uncategorised
```

### FormatProfileRecord

```typescript
interface ColumnMapping {
  sourceHeader: string;    // original column name from CSV
  canonicalField:          // target canonical field
    | 'date'
    | 'description'
    | 'amount'
    | 'paidOut'
    | 'paidIn'
    | 'balance'
    | 'transactionType'
    | 'ignore';
  transform?: string;      // optional: 'stripPound', 'negateAmount', etc.
}

interface DetectionHints {
  metadataRowCount: number;  // rows before the header row (0 for NewDay, 3 for Nationwide)
  dateFormat: string;        // e.g. "DD Mon YYYY", "DD/MM/YYYY", "YYYY-MM-DD"
  headerSignatures: string[]; // column names that uniquely identify this format
  confidenceThreshold: number; // 0.0–1.0
}

interface FormatProfileRecord {
  type: 'formatProfile';
  profileName: string;
  columnMappings: ColumnMapping[];    // JSON-serialised in CSV
  detectionHints: DetectionHints;     // JSON-serialised in CSV
  createdDate: string;                // ISO 8601
}
```

**Validation**:
- `profileName` must be unique case-insensitively
- `columnMappings` must cover at least `date` and `description` and at least one of `amount`, `paidOut`+`paidIn`

### PersonRecord

```typescript
interface PersonRecord {
  type: 'person';
  name: string;
  createdDate: string;     // ISO 8601
  status: 'active' | 'inactive';
}
```

**Validation**:
- `name` must be unique case-insensitively across all person records (at creation time)
- `"Household"` is the built-in person; its status is always `active` and cannot be changed
- Deactivation/reactivation appends a new record; the most recent record for a name is authoritative
- No delete operation exists

**Household invariant**: On ledger initialisation, a `PersonRecord` with `name: "Household"`, `isDefault: true` (conceptual), `status: "active"` is written first. The app enforces immutability in code (no UI action can modify it).

### AccountPersonMappingRecord

```typescript
interface AccountPersonMappingRecord {
  type: 'accountPersonMapping';
  accountName: string;   // account label as stored on transactions
  personName: string;    // must match an existing PersonRecord.name
  effectiveDate: string; // ISO 8601; the assignment applies from this date forward
}
```

**Validation**:
- `effectiveDate` must be a valid calendar date
- `personName` must match an existing person
- Multiple records may exist for the same `accountName`; the one with the latest `effectiveDate` ≤ transaction date is authoritative (FR-070)

**Person derivation at import** (FR-071):
```
personName(transaction) =
  max(mappings where accountName == tx.account AND effectiveDate <= tx.date).personName
  ?? "Household"
```

**Tie-breaking** (FR-070 edge case): if two mappings share the same `effectiveDate` for the same account, the one appended later (lower row index) is used as a tiebreaker. Warn the user on import.

---

## Entity Relationships

```
Person  ←─────────────────────────────  AccountPersonMapping
  1                                              *
  │ (name)                                 (personName → Person.name)
  │                                        (accountName → Transaction.account)
  │
  └─ Transaction (personName at import time, denormalised for audit trail)

Category ←─── Transaction (category field)
         ←─── BudgetRecord (category field)

FormatProfile ←─── (used during import to auto-map CSV columns; not linked to transactions post-import)
```

---

## State Transitions

### Category / Person status

```
created → active  ←→  inactive
(cannot be deleted)
```

Both category and person records use the same append-only status pattern: a new record with the new status is appended on every change. The latest record for a given `name` is the current state.

### Import session

```
file_selected
  → format_detected (auto) | manual_mapping_required
  → account_labelling (if account cannot be derived)
  → person_assignment (if account has no mapping)
  → staging (shows unified transaction list)
  → duplicate_check
       → exact_duplicate_warning (if hash match)
       → date_overlap_warning (if range overlap)
  → committed_to_ledger
```

### Ledger migration

```
open_ledger
  → version_check
      → current_version: open normally
      → older_version:
          → prompt_user
              → declined: close, inform user
              → confirmed:
                  → rename existing → budget-ledger.backup-v{N}-{YYYYMMDD}
                  → create new budget-ledger.csv
                  → migrate records
                  → verify record count
                      → match: success, open normally
                      → mismatch/error: delete new file, restore backup, show error
```

---

## Session State (localStorage — ephemeral)

```typescript
interface SessionState {
  ledgerHandleKey: string | null; // IndexedDB key for FileSystemDirectoryHandle
  dateFilter: {
    preset: 'weekly' | 'monthly' | 'yearly' | 'custom';
    start: string; // ISO date
    end: string;   // ISO date
  };
  personFilter: string | null;   // null = household aggregate
}

// localStorage key: "budgetapp_session_v1"
// Schema version enforced: if key version mismatches, clear and reinitialise
```

`localStorage` stores **no financial data** — only the filter state and the handle lookup key (the actual `FileSystemDirectoryHandle` is stored in IndexedDB via the File System Access API's `idbKeyval` pattern).

---

## Default Keyword-to-Category Mapping

Hardcoded at build time (v1). Keyword matching is case-insensitive substring. First match wins in priority order.

| Keyword(s) | Category |
|---|---|
| TESCO, ASDA, SAINSBURY, MORRISONS, WAITROSE, ALDI, LIDL, CO-OP, MARKS & SPENCER FOOD, M&S FOOD | Groceries |
| NETFLIX, SPOTIFY, AMAZON PRIME, DISNEY, APPLE.COM/BILL, NOW TV, SKY | Subscriptions |
| COSTA, STARBUCKS, CAFE, GREGGS, McDONALDS, BURGER KING, KFC, PIZZA, NANDOS, SUBWAY | Eating Out |
| AMAZON, EBAY, ASOS, H&M, ZARA, NEXT, JOHN LEWIS, PRIMARK, IKEA | Shopping |
| UBER, BOLT, TAXI, TRAINLINE, NATIONAL RAIL, TFL, BUS | Transport |
| SHELL, BP, ESSO, TEXACO, MOTO, FUEL | Fuel |
| HOLIDAY INN, AIRBNB, BOOKING.COM, EXPEDIA, EASYJET, RYANAIR, BRITISH AIRWAYS | Holidays |
| HOTEL, HILTON, MARRIOTT, TRAVELODGE, PREMIER INN | Travel |
| GYM, FITNESS, PUREGYM, DAVID LLOYD, NUFFIELD | Health & Fitness |
| BOOTS, SUPERDRUG, PHARMACY, DENTIST | Personal Care |
| NHS, HOSPITAL, DOCTOR, BUPA | Health & Fitness |
| MORTGAGE, RENT, COUNCIL TAX, GROUND RENT | Housing |
| GAS, ELECTRIC, WATER, BROADBAND, BT, VIRGIN MEDIA, EDF, BRITISH GAS | Utilities |
| DIRECT LINE, AVIVA, LV=, ADMIRAL, AXA | Insurance |
| HMRC, COUNCIL TAX REFUND, TAX | Taxes |
| SALARY, PAYROLL, BACS CREDIT, WAGES | Income |
| TRANSFER TO, TRANSFER FROM, SAVINGS TRANSFER | Internal Transfer |

Any transaction not matching any keyword → `Uncategorised`.
