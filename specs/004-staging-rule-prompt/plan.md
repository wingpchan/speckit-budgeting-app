# Implementation Plan: Keyword Rule Prompt in Import Staging View

**Branch**: `004-staging-rule-prompt` | **Date**: 2026-03-25 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-staging-rule-prompt/spec.md`

## Summary

Add the existing `KeywordRulePrompt` component and `useKeywordRules` hook to `StagingView` so that when a user changes a category in the staging dropdown, an inline rule prompt appears immediately below that row. If the user confirms the rule, it is written to the ledger before the import is confirmed — making it immediately available for subsequent imports in the same session. The import flow remains non-blocking: the user can confirm the import at any time regardless of prompt state. No new components, no ledger schema changes, no new dependencies.

## Technical Context

**Language/Version**: TypeScript (latest stable)
**Primary Dependencies**: React 18.x, Tailwind CSS (latest stable), Vitest (latest stable)
**Storage**: File System Access API — master ledger CSV (no schema changes in this feature)
**Testing**: Vitest
**Target Platform**: Chrome / Edge (File System Access API requirement)
**Project Type**: Client-side web application
**Performance Goals**: Interaction response < 100 ms; rule save is a fast ledger append — same as existing `TransactionList` flow
**Constraints**: No new dependencies; pure component/state addition in `StagingView`
**Scale/Scope**: Single component (`StagingView`) + test additions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I — Data Integrity | ✓ PASS | `keywordRule` is an existing record type (constitution v1.6.0); rule written to ledger immediately via existing `appendRecords` path; no data loss risk |
| II — Security & Privacy | ✓ PASS | No new dependencies or external data paths |
| III — Test-Driven Development | ✓ PASS | Tests written before implementation (enforced in tasks.md) |
| IV — User-Centric Design | ✓ PASS | Maps directly to spec US1; concrete user need with 9 acceptance scenarios |
| V — Simplicity | ✓ PASS | Reuses `KeywordRulePrompt`, `useKeywordRules`, `Fragment`; no new abstractions |
| VI — Generic CSV Parsing | ✓ PASS | Not affected |

**Gate result**: PASS — no violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/004-staging-rule-prompt/
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
└── components/
    └── import/
        └── StagingView.tsx     # Core change: add useKeywordRules, rulePromptFor state,
                                # handleCategoryChange, KeywordRulePrompt inline row

tests/
└── unit/
    └── services/
        └── transaction-list-categories.test.ts  # Add: shouldShowRulePrompt logic tests,
                                                  # staging prompt state transition tests
```

**Structure Decision**: Single-project layout, existing directory tree. No new files required except test additions.

## Complexity Tracking

No constitution violations to justify.
