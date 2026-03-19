# Contract: Master Ledger CSV Format

**Version**: 2 | **Encoding**: UTF-8 | **Dialect**: RFC 4180
**File**: `budget-ledger.csv` (in user-selected folder)

---

## Format Rules

1. **Row 1**: column header row — the literal superset column names below.
2. **Row 2**: `meta` record — `type=meta`, `version=2`, all other columns empty.
3. **Rows 3+**: data records, one record per row, **append-only**.
4. All string values containing commas, newlines, or double-quotes are **RFC 4180–quoted** (wrapped in `"`, internal `"` doubled to `""`).
5. JSON-valued columns (`columnMappings`, `detectionHints`) are serialised as compact JSON strings and RFC 4180–quoted.
6. Empty cells are represented by consecutive delimiters (no space, no null, no `undefined`).
7. Line endings: `\r\n` (CRLF) for maximum spreadsheet compatibility.
8. No trailing comma at end of row.

---

## Column Header Row

```
type,version,date,description,amount,transactionType,category,account,sourceFile,importedDate,contentHash,personName,month,setDate,reason,name,isDefault,createdDate,status,profileName,columnMappings,detectionHints,accountName,effectiveDate
```

---

## Column Semantics by Record Type

### meta

| column | type | notes |
|---|---|---|
| type | string | always `meta` |
| version | integer | current: `2` |

All other columns: empty.

### transaction

| column | type | notes |
|---|---|---|
| type | string | always `transaction` |
| date | string | ISO 8601 `YYYY-MM-DD` |
| description | string | original description from bank CSV |
| amount | integer | pence; negative = expense, positive = income |
| transactionType | string | `expense` or `income` |
| category | string | category name |
| account | string | account label |
| sourceFile | string | filename only (no path) |
| importedDate | string | ISO 8601 date of commit |
| contentHash | string | SHA-256 hex of source CSV file |
| personName | string | derived from accountPersonMapping at import time |

### budget

| column | type | notes |
|---|---|---|
| type | string | always `budget` |
| month | string | `YYYY-MM` |
| category | string | category name |
| amount | integer | pence; monthly budget limit |
| setDate | string | ISO 8601 date record was created |
| reason | string | required for past-month edits; optional otherwise |

### category

| column | type | notes |
|---|---|---|
| type | string | always `category` |
| name | string | display name |
| isDefault | boolean | `true` or `false` |
| createdDate | string | ISO 8601 |
| status | string | `active` or `inactive` |

### formatProfile

| column | type | notes |
|---|---|---|
| type | string | always `formatProfile` |
| profileName | string | user-assigned name for this format |
| columnMappings | JSON string | array of `ColumnMapping` objects (RFC 4180–quoted) |
| detectionHints | JSON string | `DetectionHints` object (RFC 4180–quoted) |
| createdDate | string | ISO 8601 |

### person

| column | type | notes |
|---|---|---|
| type | string | always `person` |
| name | string | display name |
| isDefault | boolean | `true` only for the built-in Household person |
| createdDate | string | ISO 8601 |
| status | string | `active` or `inactive` |

### accountPersonMapping

| column | type | notes |
|---|---|---|
| type | string | always `accountPersonMapping` |
| accountName | string | account label (matches `transaction.account`) |
| personName | string | person name (matches `person.name`) |
| effectiveDate | string | ISO 8601; assignment applies from this date forward |

---

## Minimal Valid Ledger (new installation)

```csv
type,version,date,description,amount,transactionType,category,account,sourceFile,importedDate,contentHash,personName,month,setDate,reason,name,isDefault,createdDate,status,profileName,columnMappings,detectionHints,accountName,effectiveDate
meta,2,,,,,,,,,,,,,,,,,,,,,
person,,,,,,,,,,,,,,,Household,,2026-03-19,active,,,,
category,,,,,,,,,,,,,,,Housing,true,2026-03-19,active,,,,
category,,,,,,,,,,,,,,,Groceries,true,2026-03-19,active,,,,
...
```

---

## Version Migration

When the `meta` record's `version` value is less than the current `LEDGER_VERSION` constant:

1. Rename `budget-ledger.csv` → `budget-ledger.backup-v{N}-{YYYYMMDD}` (where N = old version, date = migration date in `YYYYMMDD`).
2. Create a new `budget-ledger.csv` with the current format.
3. Copy all records from the backup, transforming to the new schema as required.
4. Verify record counts match.
5. On failure: delete new file, rename backup back, display error.
6. The backup file is **never deleted** by the app.

---

## Invariants (must always hold after any write)

- The `meta` record is always the first data row.
- No row is ever modified or deleted after being written.
- The `Household` person record is always present.
- All 19 default category records are present in any valid ledger (may be inactive but not absent).
- `transaction.personName` is never empty.
- `budget.amount` is always ≥ 0.
- `amount` on `transaction` is always a non-null integer.
