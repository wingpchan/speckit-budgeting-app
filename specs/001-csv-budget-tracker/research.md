# Research: UK Bank CSV Budget Tracker

**Phase**: 0 — Unknowns resolved before Phase 1 design
**Branch**: `001-csv-budget-tracker` | **Date**: 2026-03-19

---

## 1. CSV Parsing Library

**Decision**: Use PapaParse 5.x
**Rationale**: UK bank CSVs use RFC 4180–compliant quoted fields, varied column orders, metadata rows before the header, and mixed date formats. Building a correct RFC 4180 parser in-house is non-trivial (escape sequences, quoted newlines, BOM handling). PapaParse is the de-facto standard, ships TypeScript types, supports streaming for large files, exposes a `dynamicTyping: false` mode needed to preserve pence strings, and handles the `skipEmptyLines` and `beforeFirstChunk` hooks needed for stripping metadata rows.
**Alternatives considered**:
- Custom parser — rejected: correctness risk (quoted-field edge cases), no material simplicity gain for a one-person codebase.
- csv-parse (Node.js) — rejected: Node-centric; brings extra weight and compatibility risk in a browser bundle.
- `d3-dsv` — rejected: minimal feature set; no header-skip or streaming; does not handle RFC 4180 quoting reliably.

---

## 2. Generic Column Detection Algorithm

**Decision**: Header-name regex scoring with data-pattern fallback, expressed as a static `ColumnDetectionRegistry` (pure JSON/config, no bank-specific branches).
**Rationale**: UK banks use dozens of header variants for the same semantic field (e.g. "Paid out", "Debit", "Amount"). A scored matching approach can auto-map with high confidence and degrade gracefully to the manual mapping UI when confidence is low, satisfying Principle VI.

**Algorithm**:
1. Normalise all header names (lowercase, trim, collapse whitespace).
2. Score each header against each canonical field using a priority-ordered list of regex patterns (e.g. `date` field: `["^date$", "^transaction date$", "^trans.*date", ...]`).
3. A column is auto-mapped to the highest-scoring canonical field above a `CONFIDENCE_THRESHOLD` constant (default: `0.7`).
4. For columns below threshold, sample up to 10 data rows and apply data-pattern heuristics (ISO/UK date regex, numeric/pence pattern, etc.) to raise or lower confidence.
5. If any required canonical field (date, description, at least one amount column) cannot be mapped above threshold, surface the manual mapping UI (FR-006).

**Canonical fields**: `date`, `description`, `amount` (unified) OR `paidOut`+`paidIn` (split), `balance` (optional), `transactionType` (optional, can be derived from sign).
**Alternatives considered**:
- Machine-learning classifier — rejected: overkill, non-auditable, violates Simplicity (Principle V).
- Hard-coded per-bank switch — rejected: direct violation of Principle VI.

---

## 3. Session State Management

**Decision**: React Context + `useReducer`
**Rationale**: Session state is shallow (active ledger handle, date range filter, person filter, current view). Redux or Zustand would add a dependency for no material benefit. A single `SessionContext` with typed actions satisfies Principle V (no abstractions for hypothetical future use).

**Session shape**:
```typescript
interface SessionState {
  ledgerHandle: FileSystemDirectoryHandle | null;
  dateFilter: { start: string; end: string } | null; // ISO dates, null = current month
  personFilter: string | null;                        // null = household aggregate
  viewPreset: 'weekly' | 'monthly' | 'yearly' | 'custom';
}
```
`localStorage` stores `ledgerHandle` identity only (no financial data), cleared on format version mismatch.
**Alternatives considered**:
- Zustand — rejected: extra dependency; session state too small to justify.
- Redux Toolkit — rejected: same reason; excessive for a handful of filter values.

---

## 4. Content Hashing (Duplicate Detection)

**Decision**: WebCrypto `SubtleCrypto.digest('SHA-256', ...)` (browser built-in)
**Rationale**: No third-party library needed; produces a deterministic 64-char hex string per file; runs async without blocking the main thread.

**Implementation sketch**:
```typescript
async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```
**Alternatives considered**: `spark-md5` — rejected: adds a dependency for functionality already available natively in all Chromium versions.

---

## 5. Master Ledger CSV Versioning Format

**Decision**: Version encoded in first data row as a `meta` record type.
**Rationale**: Embedding version in the data row (rather than a comment line) means the same PapaParse invocation that reads data also reads the version, with no special pre-pass.

**Current version**: `2`
**CSV structure**:
```
type,version,date,description,amount,...(all columns)
meta,2,,,,,...
transaction,,...
budget,,...
```
The `meta` row is always the first data row. Migration reads `meta.version`, compares to `LEDGER_VERSION` constant, and triggers the upgrade flow (FR-034).

**Alternatives considered**:
- Comment preamble (`#version:2`) — rejected: requires PapaParse `comments: '#'` flag which strips all comment rows, making it easy to accidentally strip user-added comments in a manual-edit scenario.
- Separate `ledger-meta.json` sidecar — rejected: two files to manage, violates Simplicity; spec mandates a single CSV file.

---

## 6. Recharts Budget-Change Stepped Annotations (FR-039)

**Decision**: Render a `<ReferenceLine>` for each budget change event on category time-series charts, with a custom `label` component that shows the reason on hover.
**Rationale**: Recharts `ReferenceLine` with `x` prop accepts an x-axis value (month string); a `label` component with `onMouseEnter`/`onMouseLeave` handles the tooltip natively in React. No additional chart library needed.

**Pattern**:
```tsx
budgetChanges.map(change => (
  <ReferenceLine
    key={change.setDate}
    x={change.month}
    stroke="#6B7280"
    strokeDasharray="4 2"
    label={<BudgetChangeLabel reason={change.reason} />}
  />
))
```
**Alternatives considered**: Recharts `<CustomizedAxisTick>` — rejected: more complex, harder to attach hover tooltip.

---

## 7. Pence Integer Arithmetic

**Decision**: All monetary amounts stored and computed as `number` (JavaScript 32-bit integer, safe up to 2^53 − 1 pence ≈ £90 trillion), with no floating-point operations on financial values.
**Rationale**: JavaScript integers are exact for pence-level arithmetic. `bigint` would be more correct theoretically but introduces friction in serialisation and Recharts integration. Given the scale (< £1M per household per year), `number` is safe and auditable.

**Rules**:
- CSV amounts converted to pence at parse time: strip `£`, parse to float, `Math.round(float * 100)`.
- All arithmetic: `+`, `-`, comparisons on pence integers only.
- Display: `(pence / 100).toFixed(2)` only at render time.
- No intermediate float results stored in the ledger.

**Alternatives considered**: `bigint` — rejected: Recharts and JSON serialisation require coercion boilerplate; scale does not justify it.

---

## 8. File System Access API Patterns

**Decision**: Use `showDirectoryPicker()` to obtain a `FileSystemDirectoryHandle`, stored in `sessionStorage` via `IndexedDB` (File System Access API's `idbKeyval`-style persistence). Ledger file is read in full on each app open; appended atomically.

**Atomic append pattern** (critical for data integrity):
```typescript
async function appendRecords(dirHandle: FileSystemDirectoryHandle, rows: string[]): Promise<void> {
  const fileHandle = await dirHandle.getFileHandle('budget-ledger.csv', { create: false });
  const writable = await fileHandle.createWritable({ keepExistingData: true });
  const file = await fileHandle.getFile();
  await writable.seek(file.size);
  await writable.write(rows.join('\n') + '\n');
  await writable.close();
}
```
Re-requesting the `FileSystemDirectoryHandle` after a page refresh requires the user to re-grant permission (or use `queryPermission()`). The app persists the handle in IndexedDB and calls `requestPermission()` on load if needed.

**Alternatives considered**: `showOpenFilePicker()` (file-level handle) — rejected: requires picking the file on every session; directory handle enables creating the initial file and the backup during migration.

---

## 9. Minor Schema Discrepancy Note

**Observation**: Constitution v1.5.0 lists `transaction` fields without `personName`, but spec v1.6.0 (FR-033) explicitly adds `personName` to the transaction record schema.
**Resolution**: Implement per the spec (include `personName`). The constitution table should be updated in the next amendment to include `personName` in the `transaction` row.

---

## Summary of Resolved Decisions

| Unknown / Decision | Resolution |
|--------------------|------------|
| CSV parsing library | PapaParse 5.x |
| Column detection approach | Score-based registry (config only, no bank branches) |
| Session state library | React Context + useReducer |
| Content hashing | WebCrypto SubtleCrypto SHA-256 |
| Ledger version encoding | `meta` record as first CSV data row |
| Recharts budget annotations | `ReferenceLine` + custom label component |
| Pence arithmetic | JavaScript `number` integers, no float in financial logic |
| File System Access API | Directory handle + atomic append via `createWritable` |
| `personName` on transaction | Include per spec v1.6.0; constitution table needs amendment |
