# Feature Specification: UK Bank CSV Budget Tracker

**Feature Branch**: `001-csv-budget-tracker`
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

**Independent Test**: Import a CSV containing a "TESCO" transaction; verify it is categorised as "Food & Drink". Then manually re-categorise it as "Shopping" and reload the ledger; verify "Shopping" is shown.

**Acceptance Scenarios**:

1. **Given** a transaction with description containing "TESCO", **When** automatic categorisation runs, **Then** it is assigned to "Food & Drink".
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

Users set a monthly budget per category. The app displays actual spend vs budget with overspend highlighted in red and underspend in green. Editing budgets for past months requires an explicit warning, confirmation, and a mandatory reason. Budgets default to the previous month's values when not set for the current month.

**Why this priority**: Budget tracking is the core financial discipline feature. Summaries without budgets are informational only; budgets make the app actionable.

**Independent Test**: Set a £200 budget for "Food & Drink" in February; view March with no budget set and verify it defaults to £200; set £250 for March and verify the override persists. Spend £220 in March "Food & Drink" and verify a red overspend indicator is shown.

**Acceptance Scenarios**:

1. **Given** the current month has no budget entry for a category, **When** the user views the monthly overview, **Then** the previous month's budget amount is displayed as the default.
2. **Given** the user edits the budget for the current month, **When** they save with or without a reason, **Then** a new budget record is appended to the master ledger (no existing record modified).
3. **Given** the user attempts to edit a budget for a past month, **When** the edit panel opens, **Then** a clear advisory is shown: "You are editing the budget for [Month Year], not your current budget. This will update the historical record for that period."
4. **Given** the user edits a past-month budget, **When** they attempt to save without providing a reason, **Then** the save is blocked and a reason is required.
5. **Given** the user confirms a past-month budget change with a reason, **When** saved, **Then** the new record is appended to the master ledger with the reason field populated.
6. **Given** actual spend exceeds budget for a category, **When** the monthly summary is viewed, **Then** the difference is highlighted in red.
7. **Given** actual spend is below budget for a category, **When** the monthly summary is viewed, **Then** the difference is highlighted in green.
8. **Given** the monthly overview is viewed, **When** multiple categories have budgets, **Then** an overall budget health progress indicator is shown reflecting aggregate spend vs aggregate budget.

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
2. **Given** search results are displayed, **Then** each result shows date, amount, category, account, and source file.
3. **Given** an active date range filter and a search keyword, **When** search runs, **Then** only transactions within the filtered range matching the keyword are returned.

---

### User Story 9 - CSV Export (Priority: P3)

Users can export a filtered, searched transaction list as a CSV file. The export includes a budget summary section showing the active budget for each category during the exported period, including any mid-period budget changes with effective dates and reasons. Export does not modify the master ledger.

**Why this priority**: Export is useful for accountants or personal records but does not affect core app functionality.

**Independent Test**: Apply a date filter, run a search, click Export, open the downloaded file, and verify transaction rows and a separate budget summary section with mid-period changes are both present.

**Acceptance Scenarios**:

1. **Given** the user clicks Export, **When** the file downloads, **Then** it contains columns: date, description, amount, category, type, account, sourceFile for each matching transaction.
2. **Given** the exported period contains budget changes, **When** the file is downloaded, **Then** a separate budget summary section lists each category with the budget amount(s) active during the period, including effective date and reason for any changes.
3. **Given** the export completes, **Then** the master ledger is unchanged.

---

### User Story 10 - Ledger Versioning and Migration (Priority: P3)

When the app opens an existing ledger, it checks the format version. If an older version is detected, it offers an automatic migration with no data loss.

**Why this priority**: Future-proofing; ensures upgrades don't break existing data.

**Independent Test**: Open a ledger created with a previous version of the format; verify the migration prompt appears; confirm; verify all prior records are intact and the version header is updated.

**Acceptance Scenarios**:

1. **Given** an existing ledger with an older format version is opened, **When** the app detects the version mismatch, **Then** it prompts the user to migrate automatically.
2. **Given** the user confirms migration, **When** migration completes, **Then** all existing records are intact and the ledger version is updated.
3. **Given** the user declines migration, **Then** the app informs them that the ledger cannot be used until migration is performed.

---

### Edge Cases

- What happens when a CSV file is empty or contains only headers with no data rows?
- What happens when a date field in a CSV cannot be parsed (malformed date)?
- What happens when an amount field contains non-numeric characters other than the £ symbol?
- How does the app behave when the selected folder becomes inaccessible mid-session (e.g. USB drive removed)?
- What happens if the master ledger CSV file is manually edited or corrupted externally?
- What happens when an imported file's account name cannot be determined (e.g. no metadata rows and no profile match)?
- What happens when a custom category name conflicts with an existing default category name?
- What happens when a budget reason field is submitted with only whitespace?
- What happens when the ledger contains transactions for a category that has since been deactivated?
- What happens when a format profile saved in the ledger no longer matches any columns in the uploaded file?

## Requirements *(mandatory)*

### Functional Requirements

**CSV Import & Parsing**

- **FR-001**: The app MUST accept one or more CSV files per import session from any UK bank or credit card provider.
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

- **FR-014**: The app MUST automatically categorise transactions using description keyword matching against the following default categories: Housing, Food & Drink, Transport, Entertainment, Utilities, Health & Fitness, Shopping, Personal Care, Eating Out, Travel, Income, Internal Transfer, Uncategorised.
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
- **FR-029**: All summary views MUST display actual spend vs budget per category, with overspend highlighted in red and underspend in green.
- **FR-030**: The monthly overview MUST include an overall budget health progress indicator reflecting aggregate spend vs aggregate budget.

**Master Ledger**

- **FR-031**: On first use, the app MUST prompt the user to select a local folder and create a master ledger CSV file in that folder using the File System Access API.
- **FR-032**: The master ledger MUST store four record types identified by a type field: transaction, budget, category, formatProfile.
- **FR-033**: Transaction records MUST include fields: type, date, description, amount (pence), transactionType, category, account, sourceFile, importedDate, contentHash.
- **FR-034**: The master ledger format MUST be versioned; if an older version is detected on open, the app MUST offer an automatic migration with no data loss.
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
- **FR-044**: Search results MUST display: date, amount, category, account, and source file for each matching transaction.

**Export**

- **FR-045**: Users MUST be able to export a CSV file containing the currently filtered and searched transactions with columns: date, description, amount, category, type, account, sourceFile.
- **FR-046**: The export MUST include a separate budget summary section showing the budget amount active for each category during the exported period, including effective date and reason for any mid-period changes.
- **FR-047**: Export MUST NOT modify the master ledger.

### Key Entities

- **Transaction**: A single financial movement normalised from a bank CSV. Attributes: date, description, amount (pence), transactionType (expense/income), category, account, sourceFile, importedDate, contentHash. Linked to one Category.
- **Budget**: A point-in-time record of a monthly spending limit for a category. Attributes: month (YYYY-MM), category, amount (pence), setDate, reason. Multiple budget records can exist for the same month/category; only the most recent is active.
- **Category**: A classification label for transactions. Attributes: name, isDefault, createdDate, status (active/inactive). Cannot be deleted.
- **FormatProfile**: A saved column mapping for a specific bank CSV format. Attributes: profileName, columnMappings (structured mapping), detectionHints, createdDate.
- **MasterLedger**: The single append-only CSV file on the user's local filesystem storing all record types, identified by a type field and a format version header.

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

## Assumptions

- The app runs entirely in the browser (client-side only) with no server component; all data resides in the user-selected local folder via the File System Access API.
- The File System Access API is available in the target browser; Chromium-based browsers are the primary target.
- "Account name" for Nationwide formats is derived from the file metadata rows; for NewDay format it is derived from a user-supplied label at import time or falls back to the filename.
- Keyword matching for auto-categorisation is case-insensitive and checks if the keyword appears as a substring of the description.
- The default keyword-to-category mapping is hardcoded in v1; users influence categorisation only through manual overrides and custom categories.
- All monetary amounts are stored as integers in pence; the UI displays values in pounds with two decimal places (e.g. £12.50).
- The session date range filter resets to the current month when the app is first loaded or when the page is refreshed.
- Format profile auto-detection uses a heuristic based on column header names and presence of metadata rows; the confidence threshold is a design-time constant.
- Recharts is the approved and only visualisation library.
- The master ledger CSV uses UTF-8 encoding with RFC 4180-compliant quoting.
