# Budget Tracker

A client-side UK bank CSV budget tracker built with React, TypeScript and Vite using **Spec-Driven Development (Speckit)**.

![Budget Tracker](https://img.shields.io/badge/React-18.x-61DAFB?logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript) ![Vite](https://img.shields.io/badge/Vite-Latest-646CFF?logo=vite) ![Tests](https://img.shields.io/badge/Tests-343%20passing-22c55e) ![License](https://img.shields.io/badge/License-MIT-blue)

---

## Overview

Budget Tracker imports UK bank statement CSV files, automatically categorises transactions, and provides weekly, monthly and yearly financial summaries with charts. All data is stored privately on your own device — no server, no cloud, no accounts required.

Built as a portfolio project to demonstrate **Spec-Driven Development (Speckit)** methodology, modern React/TypeScript patterns, and Test-Driven Development.

---

## Screenshots

> _Add screenshots here once deployed to GitHub Pages_

---

## Features

- **CSV Import** — Auto-detects Nationwide Current Account, Nationwide Credit Card and NewDay Credit Card formats. Unknown formats can be mapped manually and saved as reusable profiles.
- **Transaction Management** — View, filter, search and categorise transactions. Weekly, monthly and yearly navigation with Prev/Next controls.
- **Financial Summaries** — Income, expenses and net position with Recharts charts. Year-on-year and week-on-week comparison panels.
- **Monthly Budgets** — Set monthly spending limits per category. Actual vs budget with red/green status indicators and health bar.
- **Keyword Rules** — Define keyword patterns to auto-categorise transactions on import. Apply rules retroactively to existing transactions.
- **People & Accounts** — Assign bank accounts to household members. Filter all views by person.
- **Export** — Export filtered transactions to CSV with optional per-person breakdown.
- **Ledger Migration** — Automatic version detection and migration with full rollback on failure.
- **Privacy by Design** — All data stored in a local CSV file on your filesystem via the File System Access API. Nothing leaves your device.

---

## Tech Stack

| Concern | Choice |
|---|---|
| UI Framework | React 18.x |
| Language | TypeScript (strict mode) |
| Bundler | Vite |
| Styling | Tailwind CSS |
| Data Visualisation | Recharts |
| Testing | Vitest |
| File Persistence | File System Access API |

---

## Development Methodology

This project was built using **Spec-Driven Development (Speckit)**, a structured workflow for AI-assisted development:

1. **Specify** — User stories and acceptance scenarios defined before any implementation
2. **Plan** — Architecture, data model and component contracts documented
3. **Tasks** — Dependency-ordered, independently testable task list generated
4. **Implement** — TDD red-green-refactor cycle enforced throughout

A living **Constitution** governed all technical decisions — defining non-negotiable principles around data integrity, security, test-driven development, and simplicity. Every PR was checked against Principles I–VI before merging.

343 tests written test-first across 17 test files.

---

## Getting Started

### Prerequisites

- Node.js 18+
- Chrome or Edge (Firefox and Safari are not supported — requires File System Access API)

### Installation

```bash
git clone https://github.com/wingpchan/speckit-budgeting-app.git
cd speckit-budgeting-app
npm install
npm run dev
```

Open [http://localhost:5173/speckit-budgeting-app/](http://localhost:5173/speckit-budgeting-app/) in Chrome or Edge.

### First Run

1. Click **Choose Your Working Folder to Get Started**
2. Select a folder on your filesystem — this is where `budget-ledger.csv` will be created
3. Go to **Import** and select a UK bank statement CSV file
4. Review staged transactions, adjust categories if needed, and confirm import
5. Explore your finances in **Transactions**, **Summaries** and **Monthly Budgets**

### Sample Files

A `samples/` folder contains synthetic CSV files in each supported format for testing:
- `sample-nationwide-current.csv`
- `sample-nationwide-credit.csv`
- `sample-newday-credit.csv`

---

## Supported CSV Formats

| Bank | Format | Auto-detected |
|---|---|---|
| Nationwide | Current Account | ✅ |
| Nationwide | Credit Card | ✅ |
| NewDay | Credit Card (v1 and v2) | ✅ |
| Any UK bank | Unknown format | Manual mapping + save profile |

---

## Project Structure

```
src/
├── components/         # React components by screen
│   ├── budgets/
│   ├── categories/
│   ├── import/
│   ├── people/
│   ├── rules/
│   ├── search/
│   ├── shared/
│   └── summaries/
├── hooks/              # Custom React hooks
├── models/             # TypeScript interfaces and constants
├── services/           # Business logic and data services
│   ├── budget/
│   ├── categoriser/
│   ├── csv-parser/
│   ├── export/
│   ├── ledger/
│   ├── migration/
│   └── summaries/
├── store/              # SessionContext and LedgerContext
└── utils/              # Date, pence, crypto utilities
tests/
└── unit/               # Vitest unit tests mirroring src structure
```

---

## Architecture

**Client-side only** — no backend, no API, no database.

The app uses the **File System Access API** to read and write a master ledger CSV file (`budget-ledger.csv`) on the user's local filesystem. This is the sole source of truth for all data.

The ledger is **append-only** — records are never modified or deleted, only appended. This ensures a complete audit trail and makes the format resilient to corruption.

Seven record types are stored in a single superset CSV: `transaction`, `budget`, `category`, `formatProfile`, `person`, `accountPersonMapping`, `keywordRule`.

---

## Known Limitations

- **Chrome and Edge only** — the File System Access API is not supported in Firefox or Safari
- **Do not open `budget-ledger.csv` in Excel or LibreOffice while the app is running** — this locks the file and prevents writes. Close the spreadsheet first.
- **Undo import** — there is no undo button. To reverse an import, open `budget-ledger.csv` in a text editor and delete the rows where `sourceFile` matches the filename of the incorrectly imported file. Take a backup before editing.
- **Format profiles are seeded on first run** — if a format profile is updated in a new version, delete `budget-ledger.csv` and let the app reseed, or add the new profile manually via the Rules screen.

---

## Running Tests

```bash
npm run test:run        # Run all tests once
npm test                # Run in watch mode
npm run test:coverage   # Run with coverage report
npm run lint            # ESLint
npm run build           # Production build
```

---

## V2 Roadmap

- **Undo last import** — reverse an import session without manual ledger editing
- **UI/UX improvements** — typography scale review, improved spacing and layout consistency across all screens, better responsiveness on smaller desktop/laptop screens
- **Person-level budgets** — currently budgets are household-wide only
- **Format profile reset** — UI option to reseed reference format profiles without deleting the ledger
- **Seed export** — export household structure (categories, people, account mappings) without transaction history to bootstrap a new instance
- **Location column for Nationwide Credit Card** — concatenate Location and Transactions columns for richer descriptions
- **Electron desktop distribution** — packaged desktop app for a more native feel
- **Tablet support** — optimise layout for tablet screen sizes (mobile is out of scope due to File System Access API limitations)

---

## License

MIT

---

## Author

Built by Wing Chan as a portfolio project demonstrating Spec-Driven Development (Speckit) methodology.
