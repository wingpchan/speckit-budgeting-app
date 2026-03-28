# Tasks: UK Bank CSV Budget Tracker

**Feature**: `001-csv-budget-tracker`
**Branch**: `001-csv-budget-tracker`
**Generated**: 2026-03-19
**Input**: plan.md, spec.md v1.6.0, data-model.md, contracts/ledger-format.md, contracts/csv-parser-api.md, quickstart.md, research.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete-task dependencies)
- **[US#]**: Maps task to its user story
- Financial logic services follow TDD (Principle III — NON-NEGOTIABLE): write test first, confirm it fails, then implement

---

## Phase 1: Setup

**Purpose**: Initialise the Vite + React + TypeScript project and install all approved dependencies

- [X] T001 Initialise Vite React TypeScript project at repository root: `npm create vite@latest . -- --template react-ts`
- [X] T002 [P] Install production dependencies (recharts, papaparse) and verify in package.json
- [X] T003 [P] Install dev dependencies (tailwindcss, postcss, autoprefixer, @types/papaparse, vitest, @testing-library/react, @testing-library/jest-dom, jsdom) and verify in package.json
- [X] T004 [P] Initialise Tailwind CSS: run `npx tailwindcss init -p`, set content paths in tailwind.config.js, add `@tailwind base/components/utilities` directives to src/index.css
- [X] T005 [P] Configure Vitest in vitest.config.ts with `environment: 'jsdom'`, `setupFiles` pointing to a jest-dom setup file at tests/setup.ts, and coverage enabled
- [X] T006 [P] Enable TypeScript strict mode in tsconfig.json; configure ESLint with TypeScript rules in .eslintrc.cjs; add npm scripts: `"test": "vitest"`, `"test:run": "vitest run"`, `"test:coverage": "vitest run --coverage"`, `"lint": "eslint src --ext ts,tsx"`
- [X] T007 Configure Vite base path for GitHub Pages in vite.config.ts (`base: '/speckit-budgeting-app/'`); add `"preview": "vite preview"` npm script

**Checkpoint**: `npm run dev` starts without errors; `npm test` executes (no tests yet); `npm run lint` exits clean

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: TypeScript models, utility functions, ledger service, and app shell — ALL user stories depend on this phase

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T008 [P] Define all TypeScript interfaces for every ledger record type and session state in src/models/index.ts: `RecordType`, `MetaRecord`, `TransactionRecord`, `BudgetRecord`, `CategoryRecord`, `ColumnMapping`, `ColumnTransform`, `DetectionHints`, `FormatProfileRecord`, `PersonRecord`, `AccountPersonMappingRecord`, `SessionState`
- [X] T009 [P] Define application constants in src/models/constants.ts: `LEDGER_VERSION` (2), `CONFIDENCE_THRESHOLD` (0.7), `SESSION_STORAGE_KEY`, `DEFAULT_CATEGORIES` array (19 names), `DEFAULT_KEYWORD_MAP` (keyword → category per data-model.md), `REFERENCE_FORMAT_PROFILES` (3 seeded `FormatProfileRecord` objects: Nationwide Current Account, Nationwide Credit Card, NewDay Credit Card — column mappings per contracts/csv-parser-api.md)
- [X] T010 [P] Write unit tests for pence utility in tests/unit/utils/pence.test.ts: `parsePenceFromString("£12.50")` → 1250; `parsePenceFromString("-£5.00")` → −500; large safe integer; zero; `formatPence(1250)` → "£12.50"; `formatPence(-500)` → "-£5.00"
- [X] T011 Implement pence utility functions in src/utils/pence.ts: `parsePenceFromString(s: string): number` (strip £, parse float, Math.round × 100), `formatPence(pence: number): string` (pence/100 toFixed(2) with £ prefix) — must satisfy T010
- [X] T012 [P] Write unit tests for date utility in tests/unit/utils/dates.test.ts: `parseDDMonYYYY("15 Mar 2026")` → "2026-03-15"; `parseUKDate("15/03/2026")` → "2026-03-15"; `getPrevMonth("2026-01")` → "2025-12"; `toMonthLabel("2026-03")` → "March 2026"; invalid inputs throw or return null
- [X] T013 Implement date utility functions in src/utils/dates.ts: `parseDDMonYYYY`, `parseUKDate`, `toMonthLabel`, `getPrevMonth`, `isValidDate`, `toISODate` — must satisfy T012
- [X] T014 [P] Implement WebCrypto SHA-256 hash utility in src/utils/crypto.ts: `async function hashFile(file: File): Promise<string>` using `crypto.subtle.digest('SHA-256', ...)` returning 64-char lowercase hex string
- [X] T015 [P] Write unit tests for ledger CSV serialisation/deserialisation in tests/unit/services/ledger.test.ts: parse a `meta` row and extract version; parse each of the 6 data record types from CSV text; verify all fields round-trip through serialise → parse; empty cells represented as consecutive delimiters; JSON-valued fields (`columnMappings`, `detectionHints`) correctly parse from RFC 4180-quoted strings
- [X] T016 Implement ledger reader in src/services/ledger/ledger-reader.ts: `parseLedgerCsv(csvText: string): { version: number; records: AllRecordTypes[] }` using PapaParse with `dynamicTyping: false`; switch on `type` column to construct typed records; parse JSON fields with `JSON.parse` — must satisfy T015
- [X] T017 Implement ledger writer in src/services/ledger/ledger-writer.ts: `serialiseRecord(record: AllRecordTypes): string` (single CRLF-terminated CSV row, RFC 4180-quoted, JSON.stringify for `columnMappings`/`detectionHints`); `appendRecords(dirHandle: FileSystemDirectoryHandle, rows: string[]): Promise<void>` using atomic `createWritable({ keepExistingData: true })` + `seek(file.size)` pattern from research.md
- [X] T018 Implement ledger initialiser in src/services/ledger/ledger-initialiser.ts: `createNewLedger(dirHandle): Promise<void>` — writes superset column header row, `meta` record (version=2), `Household` `PersonRecord` (`isDefault: true`), 19 default `CategoryRecord`s (`isDefault: true`, `status: 'active'`), 3 reference `FormatProfileRecord`s from `REFERENCE_FORMAT_PROFILES`
- [X] T019 Implement ledger opener and version detector in src/services/ledger/ledger-opener.ts: `openLedger(): Promise<FileSystemDirectoryHandle>` (calls `showDirectoryPicker()`); `detectExistingLedger(dirHandle): Promise<'new' | 'current' | 'old'>` (checks for `budget-ledger.csv`; reads meta version; returns 'new' if absent, 'current' if version matches `LEDGER_VERSION`, 'old' if older)
- [X] T020 Implement IndexedDB handle persistence in src/services/ledger/handle-store.ts: `saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void>`; `loadDirectoryHandle(): Promise<FileSystemDirectoryHandle | null>`; `requestPermissionIfNeeded(handle): Promise<boolean>` (calls `queryPermission` then `requestPermission` if needed)
- [X] T021 Implement `SessionContext` with `useReducer` in src/store/SessionContext.tsx: typed actions `SET_LEDGER_HANDLE`, `SET_DATE_FILTER`, `SET_PERSON_FILTER`, `SET_VIEW_PRESET`; initial state (no handle, `monthly` preset, current-month start/end, no person filter); export `SessionProvider`, `useSession`
- [X] T022 [P] Implement `useFilter` hook in src/hooks/useFilter.ts: derives `{ start: string; end: string }` ISO date strings from `SessionState.dateFilter` preset (weekly = Mon–Sun, monthly = 1st–last day, yearly = Jan 1–Dec 31, custom = user-supplied dates); implement `useLedger` hook in src/hooks/useLedger.ts: exposes `{ records, isLoading, error, refresh, appendRecords }` using ledger reader/writer services and the `FileSystemDirectoryHandle` from `useSession`
- [X] T023 Implement App shell in src/App.tsx: wrap application with `SessionProvider`; render `Layout` with routing placeholders for Import, Summaries, Budgets, Categories, People, Search, Export views; gate all views behind a `FirstRun` check (no handle → render `ChooseFolder` instead)
- [X] T024 Implement `Layout` and `NavBar` components in src/components/shared/Layout.tsx and src/components/shared/NavBar.tsx: responsive nav bar with links to all 7 views; active-link Tailwind highlighting; placeholder slots for `DateRangePicker` and `PersonFilter` (wired in later phases)
- [X] T025 Implement `ChooseFolder` screen in src/components/shared/ChooseFolder.tsx: "Choose Folder" button calls `openLedger` → `detectExistingLedger`; if `'new'` → calls `createNewLedger`; if `'current'` → opens normally; if `'old'` → placeholder message "Migration required (Phase 14)"; persists handle via `saveDirectoryHandle`; on success transitions to `ImportScreen`

**Checkpoint**: App renders in Chrome; "Choose Folder" creates `budget-ledger.csv` in selected folder with correct seed data (meta, Household person, 19 categories, 3 format profiles); all nav links render

---

## Phase 3: User Story 1 — First-Time Setup and CSV Import (Priority: P1) 🎯 MVP

**Goal**: User selects a folder, imports a Nationwide or NewDay CSV, sees transactions auto-categorised and saved in the master ledger

**Independent Test**: Select a folder; import a Nationwide current account CSV; verify staged transactions show correct categories; confirm import; verify `TransactionRecord`s appended to `budget-ledger.csv` with `personName: "Household"`

### Tests for User Story 1 (TDD — write first, confirm they fail, then implement)

- [X] T026 [P] [US1] Write unit tests for column detection scoring in tests/unit/services/csv-parser/detection.test.ts: exact synonym match → score 1.0; regex match → 0.8; data-pattern sampling → 0.5; no match → 0.0; Nationwide Current headers auto-detected with confidence ≥ 0.8; NewDay headers auto-detected with confidence ≥ 0.7; completely unrecognised headers return `DetectionResult { status: 'unrecognised', suggestedMappings }`
- [X] T027 [P] [US1] Write unit tests for `ColumnTransform` functions in tests/unit/services/csv-parser/transforms.test.ts: `stripPound("£12.50")` → 1250 pence; `parseDDMonYYYY("15 Mar 2026")` → "2026-03-15"; `parseUKDate("15/03/2026")` → "2026-03-15"; paidOut/paidIn split correctly produces expense/income `transactionType`; NewDay signed amount (negative = expense) passes through without transform
- [X] T028 [P] [US1] Write unit tests for categoriser in tests/unit/services/categoriser.test.ts: "TESCO EXTRA" → "Groceries"; "NETFLIX.COM" → "Subscriptions"; "RANDOM UNKNOWN" → "Uncategorised"; case-insensitive match; deactivated category is not matched; first-match-wins when multiple keywords apply

### Implementation for User Story 1

- [X] T029 [US1] Implement `ColumnTransform` functions in src/services/csv-parser/transforms.ts: `stripPound`, `parseDDMonYYYY`, `parseUKDate`, `absAmount`, `negateAmount` — must satisfy T027
- [X] T030 [US1] Implement `ColumnDetectionRegistry` in src/services/csv-parser/detection-registry.ts: normalise headers (trim, lowercase); score each `(sourceHeader, canonicalField)` pair using priority-ordered synonym list → score 1.0, regex match → 0.8, data-pattern sampling on up to 10 rows → 0.5; greedy assignment above `CONFIDENCE_THRESHOLD`; if `date`, `description`, and at least one amount field cannot be mapped → return `{ status: 'unrecognised', suggestedMappings }` — must satisfy T026
- [X] T031 [US1] Implement `CsvParserService` in src/services/csv-parser/csv-parser.service.ts: `detect(file, profiles): Promise<DetectionResult>`; `parse(file, profiles): Promise<ParseResult>` (calls detect, then parseWithMapping); `parseWithMapping(file, mappings, hints): Promise<ParseResult>` (PapaParse with `metadataRowCount` rows skipped via `beforeFirstChunk`, apply transforms, produce `ParsedRow[]`, collect `ParseWarning[]` for zero-amount rows); throw `ParseError('NOT_CSV')` if file unreadable as CSV; throw `ParseError('NO_FINANCIAL_DATA')` if no financial columns found — must satisfy T026, T027
- [X] T032 [US1] Implement account name extractor in src/services/csv-parser/account-extractor.ts: `extractAccountName(rawLines: string[], profile: FormatProfileRecord | null): string | null` — for Nationwide formats reads account name from metadata rows (row 1 or 2 before the header); returns `null` for formats with `metadataRowCount: 0` (e.g. NewDay) or when name cannot be determined
- [X] T033 [US1] Implement categoriser service in src/services/categoriser/categoriser.service.ts: `buildKeywordIndex(categories: CategoryRecord[]): KeywordIndex` (active categories only; uses `DEFAULT_KEYWORD_MAP`; custom categories without explicit keywords match by exact name); `categorise(description: string, index: KeywordIndex): string` (case-insensitive substring; first-match-wins; fallback "Uncategorised") — must satisfy T028
- [X] T034 [US1] Implement `FileSelectScreen` component in src/components/import/FileSelectScreen.tsx: `<input type="file" accept=".csv">`; rejects non-CSV at read time with error message "Only CSV files are supported"; calls `CsvParserService.detect()` on valid file; routes to `ManualColumnMappingUI` if `status: 'unrecognised'`; routes to `AccountLabelPrompt` if account unresolvable; otherwise routes to `StagingView`
- [X] T035 [US1] Implement `ManualColumnMappingUI` component in src/components/import/ManualColumnMappingUI.tsx: displays source column headers; per-header dropdown to assign `CanonicalField`; highlights required fields (`date`, `description`, at least one amount column) in red until mapped; pre-populates from `DetectionResult.suggestedMappings`; "Save as Profile" checkbox + name input; "Apply Mapping" button calls `parseWithMapping` and advances to `AccountLabelPrompt` or `StagingView`
- [X] T036 [US1] Implement `AccountLabelPrompt` component in src/components/import/AccountLabelPrompt.tsx: shown when `extractAccountName` returns `null`; free-text input for account label; non-empty validation; note: "Filename-derived labels are not accepted"; mandatory step before staging screen is shown
- [X] T037 [US1] Implement `PersonAssignmentPrompt` component in src/components/import/PersonAssignmentPrompt.tsx: shown when imported account has no `AccountPersonMappingRecord` in the ledger; dropdown of active persons pre-selecting "Household"; `effectiveDate` input defaulting to earliest transaction date in the batch; on confirm appends `AccountPersonMappingRecord` to ledger via `useLedger.appendRecords`
- [X] T038 [US1] Implement `StagingView` component in src/components/import/StagingView.tsx: table of normalised, categorised transactions (date, description, amount in £, category, account, person derived from mapping); "Confirm Import" and "Cancel" buttons; Cancel returns to file select without writing; displays inline duplicate warning placeholder ("No duplicates detected" — US2 will populate)
- [X] T039 [US1] Implement `useImport` hook in src/hooks/useImport.ts: state machine (`file_selected → detecting → account_labelling? → person_assignment? → staging → confirming → committed | error`); coordinates `CsvParserService`, `extractAccountName`, `buildKeywordIndex` + `categorise`, `PersonAssignmentPrompt` step, and ledger commit
- [X] T040 [US1] Implement transaction committer in src/services/ledger/transaction-committer.ts: `buildTransactionRecord(row: ParsedRow, meta: { account, sourceFile, contentHash, importedDate, personName, category }): TransactionRecord`; `commitImport(records: TransactionRecord[], dirHandle): Promise<void>` calls `appendRecords`
- [X] T041 [US1] Implement format profile saver in src/services/csv-parser/profile-saver.ts: `saveFormatProfile(mappings: ColumnMapping[], hints: DetectionHints, profileName: string, dirHandle): Promise<void>` — validates `profileName` unique case-insensitively; appends `FormatProfileRecord` via `appendRecords`
- [X] T042 [US1] Implement `ImportScreen` page component in src/components/import/ImportScreen.tsx: composes `FileSelectScreen`, `ManualColumnMappingUI`, `AccountLabelPrompt`, `PersonAssignmentPrompt`, `StagingView` using `useImport` hook; renders the correct sub-component for each import state

**Checkpoint**: Select folder; import Nationwide current account CSV; staged view shows categorised transactions with personName "Household"; confirm → `TransactionRecord`s appended to `budget-ledger.csv`; saving an unrecognised format profile → `FormatProfileRecord` appears in ledger

---

## Phase 4: User Story 2 — Duplicate Detection (Priority: P1)

**Goal**: Every import is gated by hash and date-range duplicate checks before any data is written

**Independent Test**: Import the same Nationwide CSV twice; second attempt shows exact-file-duplicate warning before any ledger write

### Tests for User Story 2 (TDD — write first, confirm they fail, then implement)

- [X] T043 [P] [US2] Write unit tests for duplicate detection in tests/unit/services/duplicate.test.ts: exact hash match detected against existing `TransactionRecord.contentHash` values and prior `importedDate` returned; date-range overlap detected when new batch and existing records for same account share dates; non-overlapping ranges produce no warning; different account no overlap warning; cancellation confirmed by asserting `appendRecords` not called

### Implementation for User Story 2

- [X] T044 [US2] Implement duplicate detection service in src/services/duplicate/duplicate.service.ts: `detectExactDuplicate(hash: string, records: TransactionRecord[]): { isDuplicate: boolean; priorImportDate: string | null }`; `detectDateRangeOverlap(newRows: ParsedRow[], account: string, records: TransactionRecord[]): { hasOverlap: boolean; overlapRange: { start: string; end: string } | null }` — must satisfy T043
- [X] T045 [US2] Implement `DuplicateWarningModal` component in src/components/import/DuplicateWarningModal.tsx: exact-duplicate variant (shows prior import date; "Override Anyway" and "Cancel" buttons); date-range overlap variant (shows specific overlapping dates; "Proceed" and "Cancel" buttons); Cancel MUST invoke a `onCancel` prop that returns the import state machine to `staging` without calling `appendRecords`
- [X] T046 [US2] Integrate duplicate detection into `useImport` hook in src/hooks/useImport.ts: after staging confirmed, compute file hash via `hashFile`; call `detectExactDuplicate` then `detectDateRangeOverlap` against existing ledger records; if any duplicate detected → transition to `duplicate_warning` state and render `DuplicateWarningModal`; only advance to commit on explicit "Override" / "Proceed"; Cancel returns to staging

**Checkpoint**: Import same file twice → exact-duplicate warning; cancel → zero ledger writes; override → import proceeds; date-range overlap → overlap warning with specific dates shown

---

## Phase 5: User Story 11 — People and Accounts Management (Priority: P2)

**Goal**: Dedicated People screen to add, deactivate, and reactivate household members; view and reassign account-to-person mappings

**Independent Test**: Add "Alice" and "Bob"; verify both appear active; deactivate "Bob"; verify Bob shown as inactive; verify Household toggle not present; verify Bob's historic transactions still display "Bob"

### Tests for User Story 11 (TDD — write first, confirm they fail, then implement)

- [X] T047 [P] [US11] Write unit tests for people service in tests/unit/services/people.test.ts: `addPerson` rejects name identical case-insensitively to any existing person; `"Household"` person cannot be deactivated; deactivation appends `PersonRecord { status: 'inactive' }`; reactivation appends `PersonRecord { status: 'active' }`; `getActivePeople` excludes inactive; `getPersonStatus` returns status from most recent record for a name

### Implementation for User Story 11

- [X] T048 [US11] Implement people service in src/services/people/people.service.ts: `getActivePeople(records: PersonRecord[]): PersonRecord[]`; `getAllPeople(records: PersonRecord[]): PersonRecord[]`; `getPersonStatus(name, records): 'active' | 'inactive'`; `addPerson(name, dirHandle): Promise<void>` (case-insensitive uniqueness check; appends `PersonRecord`); `deactivatePerson(name, dirHandle): Promise<void>` (Household guard — throws if name is "Household"); `reactivatePerson(name, dirHandle): Promise<void>` — must satisfy T047
- [X] T049 [US11] Implement `usePeople` hook in src/hooks/usePeople.ts: exposes `{ allPeople, activePeople, addPerson, deactivatePerson, reactivatePerson, isLoading }` using people service with records from `useLedger`
- [X] T050 [US11] Implement `PeopleScreen` page component in src/components/people/PeopleScreen.tsx: lists all persons (active and inactive) from `usePeople`; "Add Person" form (name input, save button, inline error if name conflicts); per-row activate/deactivate toggle — Household row has no toggle; shows `createdDate`
- [X] T051 [US11] Implement `AccountMappingPanel` component in src/components/people/AccountMappingPanel.tsx: collects distinct `account` values from existing `TransactionRecord`s; for each account shows current person assignment and `effectiveDate` (most recent `AccountPersonMappingRecord` with `effectiveDate` ≤ today); "Reassign" button opens `AssignAccountModal`
- [X] T052 [US11] Implement `AssignAccountModal` component in src/components/people/AssignAccountModal.tsx: dropdown of active persons; `effectiveDate` input defaulting to today; on confirm appends new `AccountPersonMappingRecord` via `useLedger.appendRecords` (existing mapping records unchanged); modal closes on success

**Checkpoint**: Add Alice and Bob; deactivate Bob → absent from import person dropdown but visible in People screen as inactive; Household cannot be deactivated; reassign account → new mapping record appended

---

## Phase 6: User Story 3 — Transaction Categorisation and Manual Override (Priority: P2)

**Goal**: Auto-categorisation on import; users can override any category; overrides persist in ledger

**Independent Test**: Import CSV with a TESCO transaction → shows "Groceries"; override to "Shopping"; reload → "Shopping" persists

### Tests for User Story 3 (TDD — write first, confirm they fail, then implement)

- [X] T053 [P] [US3] Extend categoriser unit tests in tests/unit/services/categoriser.test.ts: `overrideCategory` appends a new `TransactionRecord` with updated `category` field; deactivated category remains valid for historic display (read from record, not from active list)

### Implementation for User Story 3

- [X] T054 [US3] Implement category override service in src/services/categoriser/category-override.service.ts: `overrideCategory(original: TransactionRecord, newCategory: string, dirHandle): Promise<void>` — appends a new `TransactionRecord` with all fields copied from `original` plus updated `category`; later records for the same transaction (matched by `contentHash + date + description`) supersede earlier ones in all read operations — must satisfy T053
- [X] T055 [US3] Implement `TransactionList` component in src/components/import/TransactionList.tsx: paginated table (date, description, amount £, category, account, person); category column is an inline `<select>` showing active categories only; on change shows confirmation modal "Change category from X to Y?"; on confirm calls `overrideCategory`; on success refreshes ledger records
- [X] T056 [US3] Implement `useCategories` hook in src/hooks/useCategories.ts: exposes `{ allCategories, activeCategories, defaultCategories, customCategories }` derived from `CategoryRecord` list in `useLedger` records; resolves current status using most-recent-record logic
- [X] T057 [US3] Verify `TransactionList` (T055) uses `activeCategories` from `useCategories` for the override dropdown; verify a transaction whose category was overridden to a now-deactivated category still displays that category name (read from the transaction record, not the active list)

**Checkpoint**: TESCO → "Groceries" on import; inline override to "Shopping"; ledger reload shows "Shopping"; deactivated category not in dropdown but visible in historic records

---

## Phase 7: User Story 4 — Custom Category Management (Priority: P2)

**Goal**: Create custom categories; deactivate and reactivate them; no delete action exists

**Independent Test**: Add "Child Care"; assign transaction; deactivate "Child Care" → absent from override dropdown; transaction history still shows "Child Care"

### Tests for User Story 4 (TDD — write first, confirm they fail, then implement)

- [x] T058 [P] [US4] Write unit tests for category management service in tests/unit/services/categories.test.ts: `addCategory` rejects name matching any existing category case-insensitively (including default names); deactivation appends `CategoryRecord { status: 'inactive' }`; reactivation appends `CategoryRecord { status: 'active' }`; `getActiveCategories` excludes inactive; no `deleteCategory` function exists in the service

### Implementation for User Story 4

- [x] T059 [US4] Implement category management service in src/services/categoriser/category.service.ts: `getActiveCategories(records: CategoryRecord[]): CategoryRecord[]`; `getAllCategories(records): CategoryRecord[]`; `getCategoryStatus(name, records)`: `'active' | 'inactive'`; `addCategory(name, dirHandle): Promise<void>` (case-insensitive uniqueness across all existing categories; rejects with message "A category with this name already exists"); `deactivateCategory(name, dirHandle): Promise<void>`; `reactivateCategory(name, dirHandle): Promise<void>` — must satisfy T058
- [x] T060 [US4] Implement `CategoriesScreen` page component in src/components/categories/CategoriesScreen.tsx: lists all categories (active and inactive) with type badge (Default / Custom); "Add Category" form with name input and inline duplicate error; per-row activate/deactivate toggle; no delete button or action anywhere on this screen
- [x] T061 [US4] Extend `useCategories` hook (T056) in src/hooks/useCategories.ts to also expose `addCategory`, `deactivateCategory`, `reactivateCategory` from category.service.ts
- [x] T062 [US4] Verify `TransactionList` override dropdown (T055) sources from `useCategories.activeCategories` and no longer includes "Child Care" after deactivation; verify historic transactions still display "Child Care" correctly (value comes from the transaction record field, not re-looked-up from the category list)

**Checkpoint**: "Child Care" created and available in override dropdown; deactivate → removed from dropdown; transaction record still shows "Child Care"; no delete button visible anywhere

---

## Phase 8: User Story 7 — Date Range Filtering (Priority: P2)

**Goal**: Custom date range persists across navigation within the session; preset replaces custom range; all views respect the active filter

**Independent Test**: Set custom date range; navigate to transaction list then to summaries; same filter active in both without re-entry

### Implementation for User Story 7

- [x] T063 [US7] Write unit tests for `useFilter` hook in tests/unit/hooks/useFilter.test.ts: monthly preset → first/last day of current month; weekly preset → current week Mon–Sun; yearly preset → Jan 1 – Dec 31; custom → user-supplied start/end passed through; filter object updates when `SessionState.dateFilter` changes
- [x] T064 [US7] Implement `DateRangePicker` component in src/components/shared/DateRangePicker.tsx: preset buttons (Weekly, Monthly, Yearly) and custom date inputs (start, end); on any change dispatches `SET_DATE_FILTER` to `SessionContext`; selecting a preset clears custom inputs; entering a custom date clears active preset selection
- [x] T065 [US7] Wire `DateRangePicker` into `Layout`/`NavBar` so it is visible from all views; verify `SessionContext` persists the filter across route changes (no re-entry required after navigation)
- [x] T066 [US7] Apply `useFilter` in `TransactionList` (T055): filter displayed transactions to those where `date ≥ start AND date ≤ end` from `useFilter`; verify filter changes immediately re-render the list

**Checkpoint**: Set custom range Jan–Feb; navigate to all views; filter active throughout; select "Monthly" preset → custom range replaced with current month

---

## Phase 9: User Story 12 — Person Filter (Priority: P2)

**Goal**: All views default to household aggregate; person filter scopes views to one member; composable with date filter

**Independent Test**: Import transactions for Alice and Bob; monthly summary shows household totals; select "Alice" → only Alice's figures; apply date filter simultaneously → both filters applied; clear → household aggregate restored

### Implementation for User Story 12

- [x] T067 [US12] Implement `PersonFilter` component in src/components/shared/PersonFilter.tsx: "All (Household)" option plus one entry per person from `usePeople.allPeople` (deactivated persons shown as "Name (inactive)" — accessible for historic data); on change dispatches `SET_PERSON_FILTER` to `SessionContext`; clearing dispatches `null`
- [x] T068 [US12] Wire `PersonFilter` into `Layout`/`NavBar` beside `DateRangePicker`; verify `SessionContext` persists `personFilter` across route changes
- [x] T069 [US12] Implement `usePersonFilter` hook in src/hooks/usePersonFilter.ts: `filterByPerson<T extends { personName: string }>(records: T[], personFilter: string | null): T[]` — returns all records when `personFilter` is `null`; otherwise returns records where `personName === personFilter`
- [x] T070 [US12] Apply `usePersonFilter` in `TransactionList` (T055): compose with `useFilter`; only transactions matching both date range AND person filter are displayed; switching person filter immediately re-renders

**Checkpoint**: Select "Alice" → only Alice's transactions; clear → household totals; active date filter + person filter both applied simultaneously

---

## Phase 10: User Story 5 — Monthly Budget Setting and Tracking (Priority: P2)

**Goal**: Set monthly budgets per category; actual vs budget with red/green/neutral indicators; past-month edits require reason; previous-month default when no current budget

**Independent Test**: Set £200 Groceries budget for Feb; view March → £200 shown as default; set £250 for March → persists; add £220 spend in March → red overspend indicator

### Tests for User Story 5 (TDD — write first, confirm they fail, then implement)

- [X] T071 [P] [US5] Write unit tests for budget resolution in tests/unit/services/budget.test.ts: `resolveBudget("2026-03", "Groceries", records)` returns latest record for month/category; falls back to previous month when no current-month record; falls back to 0 when no record at all; `getBudgetState(actual, budget)` returns `'over'` when actual > budget, `'under'` when actual < budget, `'exact'` when actual === budget; `saveBudget` for past month with empty reason throws validation error

### Implementation for User Story 5

- [X] T072 [US5] Implement budget service in src/services/budget/budget.service.ts: `resolveBudget(month, category, records): number` (latest record for month/category ?? previous month ?? 0); `getBudgetState(actual: number, budget: number): 'over' | 'under' | 'exact'`; `saveBudget(month, category, amount, reason, dirHandle): Promise<void>` (appends `BudgetRecord`; enforces non-empty reason for any month < current calendar month); `getBudgetChanges(category, records): BudgetRecord[]` (all records for category, chronological) — must satisfy T071
- [X] T073 [US5] Implement `useBudgets` hook in src/hooks/useBudgets.ts: exposes `{ resolveBudget, saveBudget, getBudgetState, getBudgetChanges }` using budget service with records from `useLedger`
- [X] T074 [US5] Implement `BudgetScreen` page component in src/components/budgets/BudgetScreen.tsx: month navigator (← prev / next → buttons); per-category rows showing budget amount, actual spend (sum of `TransactionRecord.amount` for that category in that month), and `BudgetStateIndicator`; overall budget health progress bar; clicking a row opens `BudgetEditPanel`
- [X] T075 [US5] Implement `BudgetEditPanel` component in src/components/budgets/BudgetEditPanel.tsx: amount input (pence-backed, displays £); past-month advisory: `"You are editing the budget for [Month Year], not your current budget. This will update the historical record for that period."`; reason textarea (required for past months — save button disabled until non-whitespace reason provided; optional for current/future months); save calls `useBudgets.saveBudget`
- [X] T076 [US5] Implement `BudgetStateIndicator` component in src/components/budgets/BudgetStateIndicator.tsx: `'over'` → red text with ↑ icon; `'under'` → green text with ↓ icon; `'exact'` → muted grey text, no directional icon (visually distinct from both red and green)
- [X] T077 [US5] Implement `BudgetHealthBar` component in src/components/budgets/BudgetHealthBar.tsx: Recharts `BarChart` (or styled `<progress>`) showing aggregate actual spend vs aggregate budget for the displayed month; label shows "£X / £Y" and percentage

**Checkpoint**: Feb Groceries £200 set; March view shows £200 default; set £250 for March → persists; £220 spend → red indicator; exact match → neutral grey; past-month edit without reason → save blocked

---

## Phase 11: User Story 6 — Financial Summaries with Charts (Priority: P2)

**Goal**: Weekly / monthly / yearly summary views with Recharts; YoY and MoM comparisons; budget-change stepped annotations on category charts

**Independent Test**: Import 13 months of statements; open yearly summary → YoY comparison panel shown; open category chart → `ReferenceLine` at budget-change month with reason on hover

### Tests for User Story 6 (TDD — write first, confirm they fail, then implement)

- [X] T078 [P] [US6] Write unit tests for summary aggregation in tests/unit/services/summaries.test.ts: `aggregateByPeriod` groups transactions by week/month/year correctly; `totalIncome` sums positive amounts; `totalExpenses` sums negative amounts; `netPosition = income + expenses`; category breakdown groups by category name; comparison panel only available when ≥ 2 comparable periods exist in the ledger

### Implementation for User Story 6

- [X] T079 [US6] Implement summary aggregation service in src/services/summaries/summary.service.ts: `aggregateByPeriod(records: TransactionRecord[], period: 'weekly'|'monthly'|'yearly', dateFilter, personFilter): PeriodSummary[]`; `getComparablePeriods(records, period): ComparablePeriod[] | null` (returns null when < 2 comparable periods) — must satisfy T078
- [X] T080 [US6] Implement `useSummaries` hook in src/hooks/useSummaries.ts: exposes `{ currentSummary, comparisons }` using summary service with current date filter, person filter, and records from `useSession` + `useLedger`
- [X] T081 [US6] Implement `WeeklySummaryView` component in src/components/summaries/WeeklySummaryView.tsx: current week income, expenses, net position; Recharts `PieChart` for category breakdown; respects active date and person filters from `useFilter` / `usePersonFilter`
- [X] T082 [US6] Implement `MonthlySummaryView` component in src/components/summaries/MonthlySummaryView.tsx: current month totals; actual vs budget per category using `resolveBudget`; `BudgetStateIndicator` per row; Recharts `BarChart` for category spend; respects date and person filters
- [X] T083 [US6] Implement `YearlySummaryView` component in src/components/summaries/YearlySummaryView.tsx: annual income, expenses, net; Recharts `LineChart` for month-by-month income/expense trend; respects date and person filters
- [X] T084 [US6] Implement `ComparisonPanel` component in src/components/summaries/ComparisonPanel.tsx: shown only when `getComparablePeriods` returns non-null; YoY or MoM side-by-side figures; Recharts `BarChart`; period labels clearly distinguish the two compared intervals
- [X] T085 [US6] Implement `BudgetChangeAnnotation` component in src/components/summaries/BudgetChangeAnnotation.tsx: Recharts `<ReferenceLine x={change.month} strokeDasharray="4 2">` with a custom `label` component that shows `change.reason` text on `onMouseEnter`/`onMouseLeave`; used in `MonthlySummaryView` and `YearlySummaryView` category charts to annotate each month where a budget changed
- [X] T086 [US6] Implement `SummariesScreen` page component in src/components/summaries/SummariesScreen.tsx: tab switcher (Weekly / Monthly / Yearly); renders appropriate view component; renders `ComparisonPanel` below active view when available

**Checkpoint**: All three views render with Recharts charts; YoY comparison panel shown after 13 months of data; stepped `ReferenceLine` annotation visible on category chart; hovering shows reason text

---

## Phase 12: User Story 8 — Transaction Search (Priority: P3)

**Goal**: Keyword search across all ledger transactions; composable with date and person filters

**Independent Test**: Import 100 transactions; search keyword present in 3 → exactly 3 results with all required fields

### Implementation for User Story 8

- [X] T087 [US8] Write unit tests for search service in tests/unit/services/search.test.ts: case-insensitive substring match returns correct records; no match returns `[]`; date filter applied; person filter applied; both filters applied simultaneously; empty keyword returns all records within filter
- [X] T088 [US8] Implement search service in src/services/search/search.service.ts: `searchTransactions(keyword: string, records: TransactionRecord[], dateFilter: { start: string; end: string } | null, personFilter: string | null): TransactionRecord[]` — case-insensitive substring match on `description`; applies date and person filters when provided — must satisfy T087
- [ ] T089 [US8] Implement `useSearch` hook in src/hooks/useSearch.ts: debounced keyword input (300 ms); calls `searchTransactions` with current `dateFilter` and `personFilter` from `useSession`; exposes `{ results, keyword, setKeyword, isSearching }`
- [X] T090 [US8] Implement `SearchScreen` page component in src/components/search/SearchScreen.tsx: auto-focus search input; result count displayed; results table (date, description, amount £, category, account, sourceFile, person); empty-state message "No matching transactions"; active `DateRangePicker` and `PersonFilter` from Layout apply to results automatically via `useSearch`

**Checkpoint**: Search "TESCO" returns all Tesco records; date filter reduces results; person filter reduces results; both applied together

---

## Phase 13: User Story 9 — CSV Export (Priority: P3)

**Goal**: Export filtered transactions as CSV with budget summary section and optional person breakdown; master ledger unchanged

**Independent Test**: Apply date filter, click Export → file contains transaction rows and budget summary section with mid-period changes; re-export with person breakdown → per-person section appended; ledger unchanged

### Implementation for User Story 9

- [X] T091 [US9] Write unit tests for export service in tests/unit/services/export.test.ts: transaction section has columns `date, description, amount, category, transactionType, account, sourceFile, person` in correct order; budget summary section lists each category with all `BudgetRecord`s active during export period including `effectiveDate` and `reason`; person breakdown section present when `options.personBreakdown` is true and absent when false; export service does not call `appendRecords` or mutate any record
- [X] T092 [US9] Implement export service in src/services/export/export.service.ts: `buildExportCsv(transactions: TransactionRecord[], budgetRecords: BudgetRecord[], options: { personBreakdown: boolean }): string` — Section 1: transaction rows; Section 2: budget summary (blank separator row, then header row, then per-category rows listing each budget amount with `effectiveDate` and `reason` that was active during the export period); Section 3 (if `options.personBreakdown`): per-person per-category spend totals; all sections RFC 4180-compliant — must satisfy T091
- [X] T093 [US9] Implement `ExportScreen` page component in src/components/export/ExportScreen.tsx: "Person Breakdown" toggle checkbox; "Export CSV" button; calls `buildExportCsv` with current filter state from `useSession` and matching records from `useLedger`; triggers browser download via `<a href="data:text/csv;charset=utf-8,..." download="budget-export-YYYY-MM-DD.csv">`; ledger records remain read-only throughout

**Checkpoint**: Export downloaded; opens in spreadsheet with transaction rows + budget summary section; mid-period budget changes shown with effectiveDate + reason; person breakdown appended when toggled; importing the export file would not affect the master ledger

---

## Phase 14: User Story 10 — Ledger Versioning and Migration (Priority: P3)

**Goal**: Detect old ledger format on open; offer automatic migration with backup; restore original on failure

**Independent Test**: Open a v1 ledger → migration prompt; confirm → `budget-ledger.backup-v1-YYYYMMDD` created; new ledger has all prior records; simulated failure → original file restored; decline → no files modified

### Tests for User Story 10 (TDD — write first, confirm they fail, then implement)

- [X] T094 [P] [US10] Write unit tests for migration service in tests/unit/services/migration.test.ts: `detectVersion` reads `meta.version` from ledger; `migrationNeeded` true when version < `LEDGER_VERSION`; backup filename matches `budget-ledger.backup-v{N}-YYYYMMDD`; record count check passes when counts match and throws when they mismatch; on simulated write failure: new file deleted, backup renamed back, error thrown

### Implementation for User Story 10

- [X] T095 [US10] Implement migration service in src/services/migration/migration.service.ts: `detectVersion(dirHandle): Promise<number>`; `performMigration(dirHandle, oldVersion): Promise<void>` — step 1: rename `budget-ledger.csv` → `budget-ledger.backup-v{N}-{YYYYMMDD}` (if backup filename collides, append `-2`, `-3` etc.); step 2: create fresh `budget-ledger.csv` with current header and `meta`; step 3: copy-transform all records from backup; step 4: verify record count matches; step 5 on any failure: delete new file, rename backup back to `budget-ledger.csv`, throw — must satisfy T094
- [X] T096 [US10] Implement `MigrationPromptModal` component in src/components/shared/MigrationPromptModal.tsx: explains that the original file will be backed up before any changes; "Migrate" and "Decline" buttons; Decline displays message "The ledger cannot be used until migration is performed." and returns without modifying any file
- [X] T097 [US10] Integrate migration check into `ChooseFolder` flow in src/components/shared/ChooseFolder.tsx: replace the v0.14 placeholder (T025); after `openLedger`, call `detectExistingLedger` → if `'old'` → show `MigrationPromptModal` → if confirmed → call `performMigration` → on success open normally; on migration failure show error: "Migration failed. Your original file has been restored."; on decline → close without modifying files
- [X] T098 [US10] Handle orphaned partial-write recovery in src/services/migration/migration.service.ts: on `detectExistingLedger`, if both `budget-ledger.csv` and any `budget-ledger.backup-v*` file exist simultaneously, detect that a prior migration may have been interrupted; show recovery prompt offering to resume or restore backup

**Checkpoint**: Open v1 test ledger → migration prompt; confirm → backup file created with correct name; new ledger contains all records; simulated failure → original restored; decline → no file changes

---

## Phase 15: Polish & Cross-Cutting Concerns

**Purpose**: Error handling, accessibility, performance validation, build verification

- [ ] T099 [P] Add `LedgerErrorBoundary` component in src/components/shared/LedgerErrorBoundary.tsx: catches File System Access API errors (folder inaccessible mid-session, write permission denied); shows actionable message with "Re-open Folder" button that re-triggers `openLedger`; wraps all views that access the ledger
- [ ] T100 [P] Performance validation: generate a synthetic `budget-ledger.csv` with 10,000 `TransactionRecord`s; load in the app and measure `MonthlySummaryView` render time; must complete within 3 seconds (SC-005); add `useMemo` to aggregation hooks if threshold exceeded
- [ ] T101 [P] Edge case hardening across all services: empty CSV (no data rows) → `ParseError('NO_FINANCIAL_DATA')`; malformed date in CSV row → `ParseWarning` + row skipped; non-numeric amount → `ParseWarning` + row skipped; category name submitted with only whitespace → validation error; budget reason with only whitespace → treated as empty (blocked for past months); duplicate person name on add → clear error message
- [ ] T102 [P] Keyboard navigation and ARIA: add `aria-label` to all icon-only buttons; ensure all modals trap focus and close on Escape; ensure all dropdowns and tables are navigable by keyboard; test with Chrome DevTools accessibility audit
- [ ] T103 Run `npm audit`; resolve all high and critical severity vulnerabilities before tagging as release-ready (Principle II — no third-party analytics, no leaked credentials)
- [ ] T104 Deployment validation: `npm run build` produces `dist/` without errors; deploy to GitHub Pages (or Netlify/Vercel preview); verify all 12 user stories function correctly when served from static host in Chrome and Edge

**Checkpoint**: All 12 user stories independently testable; `npm test && npm run lint` exits clean; no high/critical npm audit issues; app fully functional on static hosting

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 — Setup**: No dependencies; start immediately
- **Phase 2 — Foundational**: Depends on Phase 1; **BLOCKS all user story phases**
- **Phase 3 — US1 (P1)**: Depends on Phase 2 only
- **Phase 4 — US2 (P1)**: Depends on Phase 3 (integrates into import flow)
- **Phase 5 — US11 (P2)**: Depends on Phase 2; independent of US1/US2
- **Phase 6 — US3 (P2)**: Depends on Phase 3 (needs imported transactions)
- **Phase 7 — US4 (P2)**: Depends on Phase 6 (category management extends categoriser)
- **Phase 8 — US7 (P2)**: Depends on Phase 2 (SessionContext); independent of US1–US4
- **Phase 9 — US12 (P2)**: Depends on Phase 5 (people data) and Phase 8 (filter composability)
- **Phase 10 — US5 (P2)**: Depends on Phase 6 (categories) and Phase 8 (date filter)
- **Phase 11 — US6 (P2)**: Depends on Phase 10 (budget annotations), Phase 8, Phase 9
- **Phase 12 — US8 (P3)**: Depends on Phase 8 and Phase 9 (filter composability)
- **Phase 13 — US9 (P3)**: Depends on Phase 10 (budget records), Phase 11 (person breakdown)
- **Phase 14 — US10 (P3)**: Depends on Phase 2 (ledger services); can be developed in parallel with Phases 3–13
- **Phase 15 — Polish**: Depends on all desired user stories being complete

### Within Each User Story

- Tests MUST be written and confirmed failing before implementation (Principle III)
- Utility functions before services; services before hooks; hooks before components
- Each story phase should be independently testable before moving on

### Parallel Opportunities

- Phase 1 tasks T002–T006 run in parallel (different config files)
- Phase 2 foundational tasks T008–T010, T012, T014–T015 run in parallel
- US1 test tasks T026–T028 run in parallel before any implementation begins
- Once Phase 2 is complete: US1 (Phase 3), US11 (Phase 5), and US10 (Phase 14) can begin in parallel
- All tasks marked [P] within a phase touch different files with no inter-task dependencies

---

## Parallel Execution Example: User Story 1

```bash
# Step 1 — Run all US1 tests in parallel (all must fail):
Task: tests/unit/services/csv-parser/detection.test.ts   [T026]
Task: tests/unit/services/csv-parser/transforms.test.ts  [T027]
Task: tests/unit/services/categoriser.test.ts            [T028]

# Step 2 — Implement services in dependency order:
Task: transforms.ts     [T029]   ← no service deps
Task: account-extractor.ts [T032] ← no service deps
  → then: detection-registry.ts [T030]
  → then: csv-parser.service.ts  [T031]
  → then: categoriser.service.ts [T033]

# Step 3 — Implement UI components in parallel (different files):
Task: FileSelectScreen.tsx       [T034]
Task: ManualColumnMappingUI.tsx  [T035]
Task: AccountLabelPrompt.tsx     [T036]
Task: PersonAssignmentPrompt.tsx [T037]
  → then: StagingView.tsx        [T038]
  → then: useImport.ts           [T039]
  → then: ImportScreen.tsx       [T042]
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (**CRITICAL — blocks all stories**)
3. Complete Phase 3: US1 — CSV Import
4. Complete Phase 4: US2 — Duplicate Detection
5. **STOP and VALIDATE**: import a real Nationwide CSV; confirm transactions in ledger; import again and verify duplicate warning
6. Deploy to GitHub Pages and demo

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 + US2 → complete import pipeline (MVP)
3. US11 + US3 + US4 → people and categories
4. US7 + US12 + US5 + US6 → full budgeting and summaries
5. US8 + US9 → search and export
6. US10 → migration (can slot in any time after Phase 2)
7. Polish → production-ready

### Solo Developer Strategy

Work each phase sequentially in priority order. Use the TDD red-green-refactor cycle for every financial logic task before writing any implementation. Each phase checkpoint gives a working, independently demonstrable increment.

---

## Notes

- `[P]` marks tasks that touch different files with no dependencies on incomplete tasks in the same phase
- `[US#]` maps each task to its user story for traceability
- Tests for financial logic are **mandatory** (Principle III); tests for React components are included only where logic verification requires them
- `"Household"` invariant: enforced in code — `isDefault: true` is the persisted marker; no UI action can deactivate it
- All monetary values are pence integers throughout; floating-point only at display time (`formatPence`)
- `localStorage` stores no financial data — only filter state and the IndexedDB key for the directory handle
- Commit after each logical group; stop at any phase checkpoint to validate the story independently before proceeding
