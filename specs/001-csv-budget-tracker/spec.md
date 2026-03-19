# Feature Specification: UK Bank CSV Budget Tracker

**Feature Branch**: `001-csv-budget-tracker`
**Version**: 1.6.0
**Created**: 2026-03-19
**Status**: Draft
**Input**: User description: "Build a React budgeting application that imports UK bank and credit card statement CSV files, automatically categorises transactions, and displays financial summaries with historical comparison capability."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - First-Time Setup and CSV Import (Priority: P1)

A new user opens the app, selects a folder on their local filesystem where the master ledger will be stored, and imports their first bank statement CSV. The app detects the file format automatically (or guides them through column mapping if the format is unrecognised), normalises transactions to the canonical schema, categorises them automatically, and commits them to the master ledger after passing duplicate checks.

**Why this priority**: Without the ability to import transactions and persist them to the ledger, no other feature has data to work with. This is the foundational flow.

**Independent Test**: A user can select a folder, drop in a Nationwide current account CSV, and see their transactions categorised and saved in the master ledger — fully demonstrating data ingestion end to end.

**Acceptance Scenarios**:

1. **Given** a new user opens the app for the first time, **When** they choose a local folder, **Then** the app creates a master ledger file in that folder and transitions to the import screen.
2. **Given** a Nationwide current account CSV is selected for import, **When** the parser analyses the file, **Then** it strips 3 metadata rows, maps columns automatically, strips the £ symbol, converts amounts to pence, parses "DD Mon YYYY" dates, and presents a normalised transaction list.
3. **Given** a Nationwide credit card CSV is selected, **When** the parser analyses the file, **Then** it correctly identifies the Location column and the absence of a Balance column, producing a valid normalised list.
4. **Given** a NewDay credit card CSV is selected, **When** the parser analyses the file, **Then** it reads the single signed amount column (negative = expense), parses DD/MM/YYYY dates, and produces a valid normalised list.
5. **Given** a CSV from an unrecognised bank is selected, **When** the parser cannot confidently map columns, **Then** it presents a manual column mapping UI where the user can assign source columns to canonical fields.
6. **Given** the user completes manual column mapping, **When** they choose to save the mapping, **Then** the format is stored as a named profile in the master ledger and applied automatically on future imports of the same format.
7. **Given** the user reviews the staged transaction list, **When** they confirm the import, **Then** the transactions are appended to the master ledger with importedDate and contentHash populated.
8. **Given** the user selects a file for import that is not a CSV file (e.g. a PDF, Excel file, or image), **When** the file is loaded, **Then** the app rejects it immediately with a clear error message stating that only CSV files are supported, and returns the user to the file selection screen without writing anything to the master ledger.
9. **Given** the user selects a CSV file that contains no recognisable financial data (e.g. a CSV with completely unrelated column headers or no data rows), **When** the parser attempts to analyse it, **Then** the app displays a clear error message explaining that the file does not appear to be a bank statement, and offers the user the option to either try manual column mapping or cancel and return to file selection.

---

### User Story 2 - Duplicate Detection (Priority: P1)

Before committing imported transactions, the app checks for duplicate files and overlapping date ranges, presenting warnings and requiring user confirmation before proceeding.

**Why this priority**: Importing the same file twice would silently double-count all transactions, corrupting summaries. This must gate every import.

**Independent Test**: Import the same CSV twice. On the second attempt the app blocks with an exact-duplicate warning before any data is written.

**Acceptance Scenarios**:

1. **Given** a CSV that has already been imported, **When** the user attempts to import it again, **Then** the app computes the content hash, detects the match, and displays an exact-file-duplicate warning identifying the prior import date.
2. **Given** a new CSV whose date range overlaps with existing ledger transactions for the same account, **When** the user proceeds past any hash check, **Then** the app shows the overlapping date range and asks for explicit confirmation before appending.
3. **Given** the user cancels at either duplicate warning, **Then** no data is written to the master ledger.
4. **Given** the user confirms past a duplicate warning, **Then** the import proceeds and the transactions are appended.

---

### User Story 3 - Transaction Categorisation and Manual Override (Priority: P2)

Imported transactions are automatically categorised using keyword matching against the description field. Users can override any category assignment, and overrides persist in the master ledger.

**Why this priority**: Categorisation is the primary analytical value of the app; without it, summaries are meaningless. Manual overrides are essential for correctness.

**Independent Test**: Import a CSV containing a "TESCO" transaction; verify it is categorised as "Groceries". Then manually re-categorise it as "Shopping" and reload the ledger; verify "Shopping" is shown.

**Acceptance Scenarios**:

1. **Given** a transaction with description containing "TESCO", **When** automatic categorisation runs, **Then** it is assigned to "Groceries".
2. **Given** a transaction with no matching keyword, **When** automatic categorisation runs, **Then** it is assigned "Uncategorised".
3. **Given** the user selects a transaction and changes its category, **When** they save the override, **Then** the updated category is persisted in the master ledger as part of the transaction record.
4. **Given** a category has been deactivated, **When** automatic categorisation runs, **Then** it is not assigned to any new transaction; existing assignments remain valid.

---

### User Story 4 - Custom Category Management (Priority: P2)

Users can create custom categories, deactivate categories they no longer use, and reactivate them. A dedicated management screen shows all categories — active and inactive — with toggle controls. Categories cannot be deleted.

**Why this priority**: Users have expenses outside the default taxonomy (e.g. Child Care). Hardcoded categories would frustrate real-world use.

**Independent Test**: Create a "Child Care" category, assign a transaction to it, deactivate "Child Care", verify it disappears from the add/override dropdown, then verify the transaction still shows "Child Care" in history.

**Acceptance Scenarios**:

1. **Given** the user opens category management, **When** they add a new category name, **Then** the category is saved to the master ledger with isDefault=false, status=active, and is immediately available in override dropdowns.
2. **Given** the user deactivates a category, **When** they open any transaction override dropdown, **Then** the deactivated category is absent from the list.
3. **Given** a deactivated category is used by historic transactions, **When** the user views those transactions or summaries, **Then** the category name is displayed correctly.
4. **Given** the user attempts to delete a category, **Then** the UI must not provide a delete option; deactivation is the only available action.
5. **Given** the user reactivates a deactivated category, **Then** it reappears in override dropdowns and keyword matching rules.

---

### User Story 5 - Monthly Budget Setting and Tracking (Priority: P2)

Users set a monthly budget per category. The app displays actual spend vs budget with overspend highlighted in red, underspend in green, and exact budget match shown in a neutral visual treatment distinct from both states. Editing budgets for past months requires an explicit warning, confirmation, and a mandatory reason. Budgets default to the previous month's values when not set for the current month.

**Why this priority**: Budget tracking is the core financial discipline feature. Summaries without budgets are informational only; budgets make the app actionable.

**Independent Test**: Set a £200 budget for "Groceries" in February; view March with no budget set and verify it defaults to £200; set £250 for March and verify the override persists. Spend £220 in March "Groceries" and verify a red overspend indicator is shown.

**Acceptance Scenarios**:

1. **Given** the current month has no budget entry for a category, **When** the user views the monthly overview, **Then** the previous month's budget amount is displayed as the default.
2. **Given** the user edits the budget for the current month, **When** they save with or without a reason, **Then** a new budget record is appended to the master ledger (no existing record modified).
3. **Given** the user attempts to edit a budget for a past month, **When** the edit panel opens, **Then** a clear advisory is shown: "You are editing the budget for [Month Year], not your current budget. This will update the historical record for that period."
4. **Given** the user edits a past-month budget, **When** they attempt to save without providing a reason, **Then** the save is blocked and a reason is required.
5. **Given** the user confirms a past-month budget change with a reason, **When** saved, **Then** the new record is appended to the master ledger with the reason field populated.
6. **Given** actual spend exceeds budget for a category, **When** the monthly summary is viewed, **Then** the difference is highlighted in red.
7. **Given** actual spend is below budget for a category, **When** the monthly summary is viewed, **Then** the difference is highlighted in green.
8. **Given** actual spend exactly equals the budget for a category, **When** the monthly summary is viewed, **Then** the category row is displayed with a neutral visual treatment that is visually distinct from both the red overspend and green underspend states (e.g. a muted or grey palette with no directional indicator).
9. **Given** the monthly overview is viewed, **When** multiple categories have budgets, **Then** an overall budget health progress indicator is shown reflecting aggregate spend vs aggregate budget.

---

### User Story 6 - Financial Summaries with Charts (Priority: P2)

The app provides weekly, monthly, and yearly summary views showing total income, total expenses, net position, and a category breakdown. Recharts visualisations are used throughout. Where sufficient history exists, year-on-year and month-on-month comparisons are shown. Category charts spanning multiple months annotate budget changes as stepped lines with the reason shown on hover.

**Why this priority**: Summaries are the primary output the user reads. Without them, the import and categorisation work serves no purpose.

**Independent Test**: Import 13 months of statements; open a yearly summary and verify YoY comparison is shown; open a category chart and verify a stepped annotation appears at the month a budget was changed, with the reason shown on hover.

**Acceptance Scenarios**:

1. **Given** the user selects "Weekly" view, **When** the view loads, **Then** total income, total expenses, net position, and a category breakdown for the current week are shown.
2. **Given** the user selects "Monthly" view, **When** the view loads, **Then** the current month's figures are shown with actual vs budget per category.
3. **Given** the user selects "Yearly" view, **When** the view loads, **Then** annual totals and a month-by-month breakdown are shown.
4. **Given** at least two comparable periods exist in the ledger, **When** the user views a summary, **Then** a year-on-year or month-on-month comparison panel is available.
5. **Given** a category chart spans multiple months during which the budget changed, **When** the chart renders, **Then** a stepped reference line marks each budget change point; hovering reveals the reason if one was provided.
6. **Given** a date range filter is active, **When** any summary view loads, **Then** it reflects only transactions within the filtered range.

---

### User Story 7 - Date Range Filtering (Priority: P2)

Users can apply a custom date range filter in addition to the preset weekly/monthly/yearly views. The active filter persists across navigation within the session.

**Why this priority**: Fixed time windows do not match how people review finances (e.g. "last payday to this payday"). Persistence across navigation prevents repeated re-entry.

**Independent Test**: Apply a custom date range, navigate to transaction list, then to summaries, and verify the same filter is active in both views without re-entering it.

**Acceptance Scenarios**:

1. **Given** the user sets a custom date range, **When** they navigate between different views, **Then** the active filter remains applied throughout the session.
2. **Given** a custom date range is active, **When** the user selects a preset (weekly/monthly/yearly), **Then** the preset replaces the custom range.
3. **Given** a filter is active, **When** any summary or transaction view loads, **Then** only transactions within the date range are included.

---

### User Story 8 - Transaction Search (Priority: P3)

Users can search transactions by description keyword across the entire master ledger. Results show date, amount, category, account, and source file for each matching transaction.

**Why this priority**: Keyword search is a high-value diagnostic tool but not required for core budget tracking.

**Independent Test**: Import two files with 50 transactions each; search for a description keyword present in 3 transactions; verify exactly those 3 results are returned with all required fields shown.

**Acceptance Scenarios**:

1. **Given** a keyword is entered in the search field, **When** the search runs, **Then** all transactions whose description contains the keyword (case-insensitive) are returned.
2. **Given** search results are displayed, **Then** each result shows date, amount, category, account, source file, and person.
3. **Given** an active date range filter and a search keyword, **When** search runs, **Then** only transactions within the filtered range matching the keyword are returned.

---

### User Story 9 - CSV Export (Priority: P3)

Users can export a filtered, searched transaction list as a CSV file. The export includes a budget summary section showing the active budget for each category during the exported period, including any mid-period budget changes with effective dates and reasons. Optionally, the export includes a person breakdown section showing spending totals per person per category. Export does not modify the master ledger.

**Why this priority**: Export is useful for accountants or personal records but does not affect core app functionality.

**Independent Test**: Apply a date filter, run a search, click Export, open the downloaded file, and verify transaction rows and a separate budget summary section with mid-period changes are both present. Re-export with the person breakdown option enabled and verify a person-per-category totals section is appended.

**Acceptance Scenarios**:

1. **Given** the user clicks Export, **When** the file downloads, **Then** it contains columns: date, description, amount, category, type, account, sourceFile, person for each matching transaction.
2. **Given** the exported period contains budget changes, **When** the file is downloaded, **Then** a separate budget summary section lists each category with the budget amount(s) active during the period, including effective date and reason for any changes.
3. **Given** the export completes, **Then** the master ledger is unchanged.
4. **Given** the user enables the person breakdown option before exporting, **When** the file downloads, **Then** it includes an additional section showing total spending per person per category for the exported period.
5. **Given** the person breakdown option is not enabled, **When** the file downloads, **Then** no person breakdown section is included and the file format is otherwise identical.

---

### User Story 10 - Ledger Versioning and Migration (Priority: P3)

When the app opens an existing ledger, it checks the format version. If an older version is detected, it offers an automatic migration: it renames the existing file with a version-stamped backup suffix, creates a fresh ledger file with the new format version, migrates all records across, and confirms success only when every record has transferred without error. The backup file is retained permanently. If migration fails, the original file is restored and the user is informed.

**Why this priority**: Future-proofing; ensures upgrades don't break existing data.

**Independent Test**: Open a ledger created with a previous version of the format; verify the migration prompt appears; confirm; verify the original file has been renamed to a version-stamped backup (e.g. `budget-ledger.backup-v1-YYYYMMDD.csv`) and is present in the same folder; verify the new ledger file contains all prior records with the updated version header; then simulate a mid-migration failure and verify the original file is restored and an error message is shown.

**Acceptance Scenarios**:

1. **Given** an existing ledger with an older format version is opened, **When** the app detects the version mismatch, **Then** it prompts the user to migrate automatically, explaining that the original file will be backed up before any changes are made.
2. **Given** the user confirms migration, **When** migration begins, **Then** the app renames the existing ledger file in the same folder with the suffix `.backup-v{N}-{YYYYMMDD}` (where N is the old version number and the date is the migration date), before writing any new data.
3. **Given** the backup has been created, **When** the app creates the new ledger file and migrates records, **Then** every record from the backup must be written to the new file before migration is considered complete; a record-count check MUST confirm the totals match.
4. **Given** all records have transferred without error, **When** migration is confirmed, **Then** the app opens the new ledger normally; the backup file remains in the folder and is never deleted by the app.
5. **Given** any error occurs during migration (file write failure, record count mismatch, or any unhandled exception), **When** the error is detected, **Then** the app deletes the partially written new ledger file, renames the backup file back to the original ledger filename, and displays a clear error message informing the user that migration failed and the original file has been restored.
6. **Given** the user declines migration, **Then** the app informs them that the ledger cannot be used until migration is performed and closes the ledger without modifying any file.

---

### User Story 11 - People and Accounts Management (Priority: P2)

The app supports multiple household members. Each person owns one or more bank accounts. A built-in "Household" person exists for joint or shared accounts. People can be added, deactivated, and reactivated but never deleted. When a new account is encountered during import for the first time, the user must assign it to a person before the import can proceed. Account-to-person assignments record an effective date; reassigning an account creates a new mapping record rather than modifying an existing one. Budgets remain household-wide and are not split by person.

**Why this priority**: Without person tracking, summaries cannot distinguish individual spending from household spending, making the app inadequate for multi-member households. This is a core data modelling feature that all subsequent person-level views depend on.

**Independent Test**: Open the People screen, add "Alice" and "Bob". Import a Nationwide CSV for a new account; verify the assignment prompt appears; assign to Alice. Import a second CSV for a different account; assign to Bob. Navigate to the transaction list and verify each transaction shows the correct person. Deactivate "Bob"; verify Bob is no longer available for new assignments but Bob's historic transactions still display his name correctly.

**Acceptance Scenarios**:

1. **Given** the app is initialised, **When** the People screen is opened, **Then** a built-in "Household" person is present and cannot be deactivated or deleted.
2. **Given** the user adds a new person, **When** they save, **Then** the person record is written to the master ledger with a createdDate and status=active, and the person is immediately available for account assignments.
3. **Given** the user deactivates a person, **When** viewing the People screen, **Then** the person is shown as inactive and is no longer selectable for new account assignments; their historic transactions continue to display their name.
4. **Given** the user reactivates a deactivated person, **Then** they become selectable again for account assignments.
5. **Given** the UI is presented with a person, **Then** no delete option is available; deactivation is the only removal action.
6. **Given** a new account (one never seen before in the ledger) is encountered during import, **When** the user reaches the staging screen, **Then** they are required to assign that account to a person before confirmation is allowed; the prompt pre-selects "Household" as the default.
7. **Given** the user assigns an account to a person with a given effectiveDate, **When** they save, **Then** an accountPersonMapping record is appended to the master ledger with the account name, person name, and effective date.
8. **Given** the user reassigns an account to a different person, **When** they save, **Then** a new accountPersonMapping record is appended; the prior mapping record is unchanged; the most recent effective record is used for new transactions.
9. **Given** a transaction is imported, **When** the import is committed, **Then** the personName field on the transaction record is derived from the accountPersonMapping with the most recent effectiveDate on or before the transaction date; if no mapping exists for the account, personName defaults to "Household".

---

### User Story 12 - Person Filter on Summary and Transaction Views (Priority: P2)

All summary and transaction views default to the household aggregate view. A person filter is available as a drill-down, enabling the user to view data scoped to a single household member. The person filter is independent of but composable with the date range filter.

**Why this priority**: Without a person filter, per-person spending visibility — the primary value of tracking people — cannot be accessed from any view.

**Independent Test**: Import transactions assigned to Alice and Bob. Open the monthly summary; verify it shows household totals. Select "Alice" in the person filter; verify only Alice's transactions contribute to the displayed figures and charts. Apply a date range filter simultaneously; verify both filters are applied together. Switch to "All (Household)" and verify totals return to the full household view.

**Acceptance Scenarios**:

1. **Given** the user opens any summary or transaction view, **When** no person filter is active, **Then** the view shows household aggregate figures (all persons combined).
2. **Given** the user selects a specific person in the person filter, **When** any summary or transaction view loads, **Then** only transactions where personName matches the selected person are included.
3. **Given** both a person filter and a date range filter are active, **When** any view loads, **Then** both filters are applied together; only transactions matching both criteria are shown.
4. **Given** the user clears the person filter, **When** any view loads, **Then** the household aggregate view is restored.
5. **Given** a deactivated person has historic transactions, **When** the person filter list is shown, **Then** the deactivated person is still available as a filter option so their historical data remains accessible.

---

### Edge Cases

- What happens when a CSV file is empty or contains only headers with no data rows?
- What happens when a date field in a CSV cannot be parsed (malformed date)?
- What happens when an amount field contains non-numeric characters other than the £ symbol?
- How does the app behave when the selected folder becomes inaccessible mid-session (e.g. USB drive removed)?
- What happens if the master ledger CSV file is manually edited or corrupted externally?
- What happens if the version-stamped backup file already exists in the folder when migration is attempted (e.g. a previous failed migration left a file with the same name)?
- What happens if the folder containing the ledger has insufficient write permissions to create the backup file or the new ledger file during migration?
- What happens if the app is closed or the browser tab is killed partway through migration, leaving a partially written new ledger file alongside the backup?
- What happens when an imported file's account name cannot be determined (e.g. no metadata rows and no profile match)?
- A custom category name that matches an existing default or custom category name (case-insensitive) is rejected with a clear error message; the conflicting name is not saved.
- What happens when a budget reason field is submitted with only whitespace?
- What happens when the ledger contains transactions for a category that has since been deactivated?
- What happens when a format profile saved in the ledger no longer matches any columns in the uploaded file?
- What happens when a new account is imported and all existing people are deactivated (leaving only "Household" available for assignment)?
- What happens when an accountPersonMapping effectiveDate is later than all transactions for that account (no mapping covers any transaction date)?
- What happens when two accountPersonMapping records for the same account share an identical effectiveDate?
- What happens when the user attempts to add a person whose name is identical to an existing person (case-insensitive)?
- What happens when a person is deactivated while an import session is in progress and that person is assigned to the account being imported?
- What happens when the user selects a non-CSV file type (PDF, XLSX, image) from the file picker — is this prevented at the OS file picker level, at file read time, or at parse time, and what error is shown?

## Requirements *(mandatory)*

### Functional Requirements

**CSV Import & Parsing**

- **FR-001**: The app MUST accept one or more CSV files per import session from any UK bank or credit card provider.
- **FR-001a**: The app MUST restrict the file picker to CSV files only (.csv extension); if a non-CSV file is somehow submitted, the app MUST reject it at read time with a clear error message and must not attempt to parse it.
- **FR-001b**: The app MUST detect when a selected CSV file contains no parseable financial data and display a clear error message; the user MUST be offered the option to attempt manual column mapping or cancel.
- **FR-002**: The parser MUST automatically detect and support Nationwide current account format (quoted fields, 3 metadata rows before header, split Paid out/Paid in columns, £ symbol in amounts, "DD Mon YYYY" dates, Balance column).
- **FR-003**: The parser MUST automatically detect and support Nationwide credit card format (same as current account but with Location column and no Balance column).
- **FR-004**: The parser MUST automatically detect and support NewDay credit card format (no metadata rows, single signed amount column where negative = expense, DD/MM/YYYY dates, no £ symbol).
- **FR-005**: The parser MUST normalise all parsed transactions to the canonical schema: date (ISO), description, amount (pence integer), transactionType (expense/income), balance (optional pence integer), account name, source file.
- **FR-006**: For unrecognised CSV formats, the app MUST present a manual column mapping UI enabling the user to assign source columns to canonical schema fields.
- **FR-007**: A resolved manual column mapping MUST be saveable as a named format profile in the master ledger, with auto-detection applied on subsequent imports of matching files.
- **FR-008**: All imported transactions in a session MUST be visible in a unified staging view before the user commits them to the master ledger.
- **FR-009**: Every transaction MUST be traceable to its source file and account at all times.

**Duplicate Detection**

- **FR-010**: Before committing an import, the app MUST compute a content hash of the CSV file and compare it against all previously imported file hashes in the master ledger.
- **FR-011**: If an exact file hash match is found, the app MUST display a warning identifying the prior import date and block the import unless the user explicitly overrides.
- **FR-012**: The app MUST detect if the imported file's date range overlaps with existing ledger transactions for the same account and warn the user with the specific overlapping date range before proceeding.
- **FR-013**: The user MUST explicitly confirm to proceed past any duplicate warning; cancellation MUST leave the master ledger unmodified.

**Categorisation**

- **FR-014**: The app MUST automatically categorise transactions using description keyword matching against the following default categories: Housing, Groceries, Transport, Entertainment, Utilities, Health & Fitness, Shopping, Personal Care, Eating Out, Travel, Holidays, Subscriptions, Insurance, Savings & Investments, Fuel, Taxes, Income, Internal Transfer, Uncategorised.
- **FR-015**: Transactions with no matching keyword MUST be assigned to "Uncategorised".
- **FR-016**: The user MUST be able to manually override the category of any transaction; the override MUST be persisted in the master ledger.

**Custom Categories**

- **FR-017**: Users MUST be able to add custom categories at any time; new categories MUST be immediately available for manual override and keyword matching.
- **FR-018**: Custom and default categories MUST be stored in the master ledger as category records with fields: type, name, isDefault, createdDate, status.
- **FR-019**: Categories MUST support deactivation and reactivation; deactivated categories MUST NOT appear in add/edit dropdowns but MUST remain valid for all historic transactions and summaries.
- **FR-020**: A dedicated category management screen MUST display all categories (active and inactive) with the ability to activate or deactivate each.
- **FR-021**: Category deletion MUST be prohibited; the UI MUST NOT provide a delete action for any category.

**Budget Management**

- **FR-022**: Users MUST be able to set a monthly budget amount (in pence) per category for any month.
- **FR-023**: Budget records MUST be stored in the master ledger with fields: type, month (YYYY-MM), category, amount (pence), setDate, reason (optional text).
- **FR-024**: Budget records MUST always be appended; existing records MUST never be modified or deleted.
- **FR-025**: When reading the budget for a given month and category, the app MUST use the most recent budget record for that month/category combination.
- **FR-026**: When the current month has no budget entry for a category, the app MUST default to the previous month's most recent budget for that category.
- **FR-027**: Editing a budget for a past month MUST display the advisory: "You are editing the budget for [Month Year], not your current budget. This will update the historical record for that period."
- **FR-028**: Saving a past-month budget change MUST require explicit user confirmation and a non-empty reason field.
- **FR-029**: All summary views MUST display actual spend vs budget per category using three mutually exclusive visual states: overspend MUST be highlighted in red; underspend MUST be highlighted in green; exact budget match (actual spend equals budget amount) MUST use a neutral visual treatment that is visually distinct from both red and green.
- **FR-030**: The monthly overview MUST include an overall budget health progress indicator reflecting aggregate spend vs aggregate budget.

**Master Ledger**

- **FR-031**: On first use, the app MUST prompt the user to select a local folder and create a master ledger CSV file in that folder using the File System Access API.
- **FR-032**: The master ledger MUST store six record types identified by a type field: transaction, budget, category, formatProfile, person, and accountPersonMapping.
- **FR-033**: Transaction records MUST include fields: type, date, description, amount (pence), transactionType, category, account, sourceFile, importedDate, contentHash, personName.
- **FR-034**: The master ledger format MUST be versioned; if an older version is detected on open, the app MUST offer an automatic migration following this sequence: (1) rename the existing ledger file in the same folder with a `.backup-v{N}-{YYYYMMDD}` suffix before writing any new data; (2) create a fresh ledger file with the current format version; (3) migrate all records from the backup to the new file; (4) verify the migrated record count matches the source record count before declaring success. The backup file MUST be retained permanently and MUST NOT be deleted or overwritten by the app under any circumstance. If any step fails, the app MUST delete the partially written new file, restore the backup file to the original ledger filename, and display an error message stating that migration failed and the original file has been restored.
- **FR-035**: New records MUST always be appended to the master ledger; existing records MUST never be modified or deleted.

**Summaries & Visualisations**

- **FR-036**: The app MUST provide weekly, monthly, and yearly summary views showing total income, total expenses, net position, and category breakdown.
- **FR-037**: All summary views MUST use Recharts for visualisations.
- **FR-038**: Where at least two comparable periods exist, the app MUST provide year-on-year and month-on-month comparison views.
- **FR-039**: Category charts spanning multiple months MUST display budget changes as stepped annotations; if a reason was provided, it MUST be shown as a tooltip or label on the annotation.
- **FR-040**: All summary and transaction views MUST respect the active date range filter.

**Date Range Filtering**

- **FR-041**: The app MUST support a custom date range filter in addition to preset weekly, monthly, and yearly filters.
- **FR-042**: The active date range filter MUST persist across navigation for the duration of the session.

**Transaction Search**

- **FR-043**: Users MUST be able to search transactions by description keyword across all ledger data.
- **FR-044**: Search results MUST display: date, amount, category, account, source file, and person for each matching transaction.

**Export**

- **FR-045**: Users MUST be able to export a CSV file containing the currently filtered and searched transactions with columns: date, description, amount, category, type, account, sourceFile, person.
- **FR-046**: The export MUST include a separate budget summary section showing the budget amount active for each category during the exported period, including effective date and reason for any mid-period changes.
- **FR-061**: When the user enables the person breakdown option, the export MUST include an additional section listing total spending per person per category for the exported period; this section MUST be omitted when the option is not enabled.
- **FR-062**: Export MUST NOT modify the master ledger.

**People and Accounts**

- **FR-063**: The master ledger MUST contain a built-in "Household" person record present from initialisation; this person MUST NOT be deactivatable, deletable, or renameable.
- **FR-064**: Users MUST be able to add new person records at any time; each person MUST be stored in the master ledger with fields: type, name, createdDate, status (active/inactive).
- **FR-065**: Person records MUST support deactivation and reactivation; deactivated persons MUST NOT appear in account assignment dropdowns for new imports but MUST remain selectable in person filters for accessing historical data.
- **FR-066**: Person deletion MUST be prohibited; the UI MUST NOT provide a delete action for any person.
- **FR-067**: A dedicated people management screen MUST display all persons (active and inactive) with the ability to activate or deactivate each (except "Household").
- **FR-068**: When an import session encounters an account name that has no existing accountPersonMapping record in the ledger, the app MUST require the user to assign that account to a person before the import can be confirmed; the assignment prompt MUST pre-select "Household" as the default.
- **FR-069**: For CSV formats where the account name cannot be determined from file metadata, the app MUST prompt the user to provide an account label before proceeding to the staging screen; this prompt MUST appear before duplicate detection and person assignment.
- **FR-070**: AccountPersonMapping records MUST be stored in the master ledger with fields: type, accountName, personName, effectiveDate; multiple records may exist for the same account; the record with the most recent effectiveDate on or before a transaction's date is authoritative.
- **FR-071**: When a transaction is committed to the master ledger, the app MUST derive its personName from the accountPersonMapping with the most recent effectiveDate on or before the transaction date; if no mapping covers the transaction date, personName MUST default to "Household".
- **FR-072**: Reassigning an account to a different person MUST append a new accountPersonMapping record with the new person and effectiveDate; existing mapping records MUST NOT be modified or deleted.
- **FR-073**: All summary and transaction views MUST provide a person filter control; the default state MUST show household aggregate data (all persons combined).
- **FR-074**: When a person filter is active, all summary figures, category breakdowns, charts, and transaction lists MUST reflect only transactions where personName matches the selected person.
- **FR-075**: The person filter MUST be composable with the date range filter; both MUST be applied simultaneously when active.
- **FR-076**: Budgets are household-wide only; person-level budget setting is NOT supported.

### Key Entities

- **Transaction**: A single financial movement normalised from a bank CSV. Attributes: date, description, amount (pence), transactionType (expense/income), category, account, sourceFile, importedDate, contentHash, personName. Linked to one Category and one Person (via personName derived at import time).
- **Budget**: A point-in-time record of a monthly spending limit for a category. Attributes: month (YYYY-MM), category, amount (pence), setDate, reason. Multiple budget records can exist for the same month/category; only the most recent is active. Budgets are household-wide; no person-level budgets.
- **Category**: A classification label for transactions. Attributes: name, isDefault, createdDate, status (active/inactive). Cannot be deleted.
- **FormatProfile**: A saved column mapping for a specific bank CSV format. Attributes: profileName, columnMappings (structured mapping), detectionHints, createdDate.
- **Person**: A named household member who owns one or more bank accounts. Attributes: name, createdDate, status (active/inactive). A built-in "Household" person always exists and cannot be deactivated or deleted. All other persons can be deactivated and reactivated but never deleted. Deactivated persons remain valid for historic transaction display and person-filter access.
- **AccountPersonMapping**: A point-in-time record linking a bank account to a person, with an effective date. Attributes: accountName, personName, effectiveDate. Multiple records may exist for the same account (one per assignment event); the record with the most recent effectiveDate on or before a given transaction date is authoritative. Records are append-only and never modified. Required for every account before its first import is committed.
- **MasterLedger**: The single append-only CSV file on the user's local filesystem storing all six record types, identified by a type field and a format version header.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can import their first bank statement CSV and see categorised transactions within 60 seconds of selecting the file, with no prior configuration required for any of the three reference formats.
- **SC-002**: Importing the same file twice is blocked before any data is written, with a clear warning message displayed in all cases.
- **SC-003**: 100% of transactions can be traced back to their source file and account name at any point after import.
- **SC-004**: Users can set, view, and adjust monthly category budgets without data loss; all budget history is preserved in the ledger with no records overwritten.
- **SC-005**: Summary views load and render within 3 seconds for a ledger containing up to 5 years of transactions (approximately 10,000 records).
- **SC-006**: An unknown CSV format can be fully mapped and saved as a format profile in a single import session; the same profile is applied automatically on the next import without prompting.
- **SC-007**: A custom date range filter applied on one view is still active when the user navigates to any other view within the same session, with no additional user action required.
- **SC-008**: Exported CSV files open correctly in standard spreadsheet applications and contain both the transaction rows and the budget summary section with no missing fields.
- **SC-009**: Opening a master ledger created with an older format version results in a migration prompt; after confirmation all prior records are intact and the ledger is usable without manual intervention.
- **SC-010**: A category deactivated after transactions are assigned to it continues to display correctly in all historic summaries and transaction views without errors.
- **SC-011**: A new account encountered during import cannot be committed until the user assigns it to a person; the assignment prompt requires no more than two interactions to complete (select person, confirm).
- **SC-012**: Selecting a person filter updates all visible summary figures, charts, and transaction lists to reflect only that person's transactions; switching back to household aggregate restores full totals with no page reload required.
- **SC-013**: Every transaction in the master ledger carries a personName field populated at import time; no transaction record is stored without a personName value.
- **SC-014**: Exported CSV files produced with the person breakdown option contain a correctly aggregated per-person per-category section that matches the figures shown on-screen for the same filtered period.

## Assumptions

- The app runs entirely in the browser (client-side only) with no server component; all data resides in the user-selected local folder via the File System Access API.
- The File System Access API is available in the target browser; Chromium-based browsers are the primary target.
- "Account name" for Nationwide formats is derived from the file metadata rows; for any format where the account name cannot be determined from file metadata (such as NewDay), the user MUST provide a mandatory account label before the import staging screen is shown. Filename-derived account names are not acceptable; they produce poor account identifiers in the ledger and summaries.
- Keyword matching for auto-categorisation is case-insensitive and checks if the keyword appears as a substring of the description.
- The default keyword-to-category mapping is hardcoded in v1; users influence categorisation only through manual overrides and custom categories.
- All monetary amounts are stored as integers in pence; the UI displays values in pounds with two decimal places (e.g. £12.50).
- The session date range filter resets to the current month when the app is first loaded or when the page is refreshed.
- Format profile auto-detection uses a heuristic based on column header names and presence of metadata rows; the confidence threshold is a design-time constant.
- Recharts is the approved and only visualisation library.
- The master ledger CSV uses UTF-8 encoding with RFC 4180-compliant quoting.
- Budgets are household-wide; splitting budgets by person is out of scope for this feature.
- The "Household" person is the catch-all for accounts not assigned to a specific individual (e.g. joint accounts) and for any transaction whose account has no covering accountPersonMapping record at the transaction date.
- Person names are treated case-sensitively when stored; the uniqueness check at creation is case-insensitive to prevent accidental duplicates.
- Category names are treated case-sensitively when stored; the uniqueness check at creation is case-insensitive to prevent accidental duplicates. A custom category name that matches an existing default or custom category name (case-insensitive) is rejected with a clear error message.
- The primary deployment target for v1 is GitHub Pages (or equivalent static hosting such as Netlify or Vercel); the app is built as a static site using Vite and requires no server-side hosting. The app must be fully functional when served from a static host and accessed in a Chromium-based browser (Chrome or Edge).
- The sourceFile field on transaction records stores the original filename only (e.g. nationwide-march-2026.csv); full filesystem paths are not stored. The original bank statement CSV files are not copied or moved by the app — only their data is absorbed into the master ledger.
- A future Electron-based desktop distribution is a known v2 consideration but is out of scope for this version.
- Full ledger sharing between household members (e.g. sending the master ledger file directly) is achievable outside the app by copying the `budget-ledger.csv` file. A "seed export" feature — exporting household structure (categories, people, account mappings) without transaction history, to bootstrap a new instance — is a known v2 candidate and is explicitly out of scope for v1.
