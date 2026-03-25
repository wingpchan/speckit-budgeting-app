# Implementation Plan: Post-Commit Transaction Category Override UX

**Branch**: `003-category-override-ux` | **Date**: 2026-03-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-category-override-ux/spec.md`

## Summary

Replace the inline `<select>` category control in the committed-transactions list with a read-only plain-text display plus a per-row explicit edit trigger. Move the category selector into the existing confirmation modal. Additionally, rename the nav item that hosts `TransactionList` from "Search" to "Transactions" (adding a `'transactions'` view), reserving "Search" for a future search/filter feature. No ledger schema changes are required; this is a pure UI interaction-layer change.

## Technical Context

**Language/Version**: TypeScript (latest stable)
**Primary Dependencies**: React 18.x, Tailwind CSS (latest stable), Vitest (latest stable)
**Storage**: File System Access API — master ledger CSV (no schema changes in this feature)
**Testing**: Vitest
**Target Platform**: Chrome / Edge (File System Access API requirement)
**Project Type**: Client-side web application
**Performance Goals**: Interaction response < 100 ms; no new async operations introduced
**Constraints**: No new dependencies; pure component/state refactor + nav rename
**Scale/Scope**: Single component (`TransactionList`) + nav/routing changes in `NavBar`, `Layout`, `App`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I — Data Integrity | ✓ PASS | No ledger schema changes; override write path unchanged |
| II — Security & Privacy | ✓ PASS | No new dependencies or external data paths |
| III — Test-Driven Development | ✓ PASS | Tests written before implementation (enforced in tasks.md) |
| IV — User-Centric Design | ✓ PASS | Maps directly to spec US1; prevents accidental overrides |
| V — Simplicity | ✓ PASS | Fewer interactive controls on the row; modal already exists |
| VI — Generic CSV Parsing | ✓ PASS | Not affected |

**Gate result**: PASS — no violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/003-category-override-ux/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (affected files)

```text
src/
├── components/
│   ├── shared/
│   │   ├── Layout.tsx              # Add 'transactions' to ViewId union
│   │   └── NavBar.tsx              # Add "Transactions" nav item; keep "Search" as placeholder
│   └── import/
│       └── TransactionList.tsx     # Core change: plain-text category + edit trigger; selector into modal
├── App.tsx                         # Add case 'transactions'; move TransactionsScreen to 'transactions'

tests/
└── unit/
    └── services/
        └── transaction-list-categories.test.ts  # Add: edit-trigger logic, modal selector state, confirm guard
```

**Structure Decision**: Single-project layout, existing directory tree. No new files required except test additions.

## Complexity Tracking

No constitution violations to justify.
