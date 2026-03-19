# Implementation Plan: UK Bank CSV Budget Tracker

**Branch**: `001-csv-budget-tracker` | **Date**: 2026-03-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-csv-budget-tracker/spec.md`

## Summary

A fully client-side React/TypeScript SPA (no backend, no server) that imports UK bank CSV files via a generic data-driven parser, categorises transactions by keyword matching, persists everything as append-only records to a versioned master ledger CSV via the File System Access API, and provides weekly/monthly/yearly budget-vs-actual summaries with Recharts visualisations, per-person filtering, duplicate detection, and CSV export.

## Technical Context

**Language/Version**: TypeScript (latest stable)
**Primary Dependencies**: React 18.x, Vite (latest stable), Tailwind CSS (latest stable), Recharts (latest stable), Vitest (latest stable), PapaParse 5.x (CSV parsing — only non-constitution dependency; justified by RFC 4180 correctness requirement)
**Storage**: File System Access API (browser built-in, Chrome/Edge only) — append-only `budget-ledger.csv` on user's local filesystem; `localStorage` for current-session filter state only (no financial data); `IndexedDB` for `FileSystemDirectoryHandle` persistence across page loads
**Testing**: Vitest with `@testing-library/react` and `jsdom`
**Target Platform**: Chromium-based browsers (Chrome 89+, Edge 89+); deployed as static site on GitHub Pages / Netlify / Vercel
**Project Type**: Web application (client-side SPA)
**Performance Goals**: Summary views render within 3 seconds for ~10,000 ledger records (SC-005)
**Constraints**: Client-side only, no backend, offline-capable; File System Access API (Chrome/Edge only); all amounts stored as pence integers; no floating-point in financial logic; max 3 architectural layers (Principle V)
**Scale/Scope**: ~10,000 records (≈5 years), single household, 2–5 persons

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Evidence | Status |
|-----------|----------|--------|
| **I — Data Integrity** (NON-NEGOTIABLE) | All amounts stored as pence integers (no float); master ledger append-only with versioned `meta` record; migration sequence preserves all records with count verification; `localStorage` stores no financial data | ✅ PASS |
| **II — Security & Privacy** | No API keys; no console.log of financial data; `npm audit` required before release; no third-party analytics | ✅ PASS |
| **III — TDD** (NON-NEGOTIABLE) | Vitest; Red-Green-Refactor enforced for all financial logic; feature not complete until all tests pass | ✅ PASS |
| **IV — User-Centric Design** | 12 user stories with acceptance scenarios; all mapped to measurable success criteria (SC-001 – SC-014) | ✅ PASS |
| **V — Simplicity** | Single SPA, no backend; 3 architectural layers (components → hooks/store → services); React Context + useReducer instead of Redux; no YAGNI abstractions | ✅ PASS |
| **VI — Generic CSV Parsing** (NON-NEGOTIABLE) | Data-driven `FormatProfileRecord` system; no bank-specific branches in parser code; column detection by scoring, not bank identity; new formats added via data only | ✅ PASS |

**Post-Phase 1 Re-check**: ✅ All pass. Design in `data-model.md` and `contracts/` introduces no violations.

**Gate result: ALL PASS.**

## Project Structure

### Documentation (this feature)

```text
specs/001-csv-budget-tracker/
├── plan.md              # This file
├── research.md          # Phase 0 output — all decisions resolved
├── data-model.md        # Phase 1 output — all 6 record types, TypeScript interfaces
├── quickstart.md        # Phase 1 output — dev setup and first-use guide
├── contracts/
│   ├── ledger-format.md    # Master ledger CSV schema (byte-level contract)
│   └── csv-parser-api.md   # Generic parser TypeScript interface + reference profiles
└── tasks.md             # Phase 2 output (/speckit.tasks — not created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── import/          # File selection, staging view, manual column mapping UI
│   ├── categories/      # Category management screen (list, activate/deactivate)
│   ├── budgets/         # Budget setting, monthly overview with overspend indicators
│   ├── summaries/       # Weekly / monthly / yearly summary views + comparisons
│   ├── people/          # People & accounts management screen
│   ├── search/          # Transaction keyword search
│   ├── export/          # CSV export with budget summary and optional person breakdown
│   └── shared/          # Date range filter, person filter, navigation layout, modals
├── services/
│   ├── csv-parser/      # Generic PapaParse wrapper + column scoring/detection registry
│   ├── ledger/          # File System Access API: open, read, append, create; migration
│   ├── categoriser/     # Keyword-to-category matching; default keyword map
│   ├── duplicate/       # SHA-256 content hash + date-range overlap detection
│   └── migration/       # Ledger version detection, backup/restore, record migration
├── models/              # TypeScript interfaces for all 6 record types + session state
├── hooks/               # useFilter, useLedger, usePeople, useCategories, useSearch
├── store/               # SessionContext + useReducer (date filter, person filter, handle)
└── utils/               # pence.ts, dates.ts, crypto.ts (WebCrypto SHA-256 hash)

tests/
├── unit/
│   ├── services/        # csv-parser, categoriser, duplicate, migration — financial logic TDD
│   └── utils/           # pence arithmetic boundary cases
└── integration/         # Full user-journey tests: import flow, duplicate detection, export
```

**Structure Decision**: Single web application (Option 1 variant). No backend exists. 3 layers:
1. `components/` — React UI, no business logic
2. `hooks/` + `store/` — React state coordination, no file I/O
3. `services/` + `models/` + `utils/` — pure business logic, no React imports

This satisfies Principle V's 3-layer maximum.

## Complexity Tracking

> No constitution violations found. No entries required.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| PapaParse dependency | RFC 4180 correctness (quoted fields, metadata row skip, BOM) | Custom CSV parser — non-trivial; reliability risk for financial data |
