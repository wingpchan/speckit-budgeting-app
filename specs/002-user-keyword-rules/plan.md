# Implementation Plan: User-Defined Keyword Rules for Auto-Categorisation

**Branch**: `002-user-keyword-rules` | **Date**: 2026-03-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-user-keyword-rules/spec.md`

## Summary

When a user manually overrides a transaction category, a non-blocking inline prompt appears (after the override is committed) offering to save a user-defined keyword rule (description substring → category). On subsequent imports, user-defined rules are evaluated before the default keyword map using the same case-insensitive substring logic; the longest matching pattern wins. Rules are persisted in the master ledger as a new `keywordRule` record type and managed through a dedicated management screen.

**Technical approach**: Extend `buildKeywordIndex()` to accept user-defined rules and prepend them (longest-first) to the `KeywordIndex.entries` array; add `KeywordRuleRecord` as the seventh ledger record type; integrate an inline `KeywordRulePrompt` card into `TransactionList.tsx` after the existing override confirmation flow.

> **✅ CONSTITUTION AMENDMENT APPLIED — constitution v1.6.0 (2026-03-21)**

## Technical Context

**Language/Version**: TypeScript (latest stable)
**Primary Dependencies**: React 18.x, Vite (latest stable), Tailwind CSS (latest stable), Recharts (latest stable), PapaParse 5.x
**Storage**: File System Access API — master ledger CSV (`budget-ledger.csv`) on local filesystem
**Testing**: Vitest (latest stable)
**Target Platform**: Browser (Chrome / Edge only — File System Access API requirement)
**Project Type**: Client-side single-page web application
**Performance Goals**: Rule evaluation adds negligible overhead — user rule count will be in the hundreds at most; linear scan of the prepended entries is sufficient
**Constraints**: Offline-capable (no network calls); append-only ledger; no backend
**Scale/Scope**: Single-user household; ledger expected to hold up to 10,000 transaction records and at most a few hundred keyword rules

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

### ✅ Principle I — Data Integrity

- `keywordRule` records follow the append-only ledger constraint (FR-118, FR-119).
- Status changes are represented as new records; existing records are never mutated.
- No monetary calculations are involved; Principle I's fixed-point arithmetic rule does not apply.
- The `createdDate` field on each rule record satisfies the mutation-timestamp requirement.

### ✅ Principle II — Security & Privacy

- No new network calls, credentials, or third-party scripts are introduced.
- Keyword rule patterns and categories contain no sensitive financial data.

### ✅ Principle III — Test-Driven Development

- New unit tests required for: `buildKeywordIndex()` with user rules, `isDuplicateRule()`, `saveKeywordRule()`, `resolveKeywordRules()`, `KeywordRulePrompt` component, `KeywordRulesScreen` component, and ledger reader/writer for the new record type.
- Existing `categoriser.test.ts` must be extended to cover user-rule precedence scenarios.

### ✅ Principle IV — User-Centric Design

- Three independently testable user stories are defined in spec.md.
- Each increment is demonstrable to a non-technical stakeholder.

### ✅ Principle V — Simplicity

- No new architectural layers. User rules are prepended to the existing `KeywordIndex`; no second pass, no priority system.
- `buildKeywordIndex()` gains one optional parameter; all existing call sites are unchanged.
- Single new column (`pattern`) in the ledger CSV header.

### ✅ Principle VI — Generic CSV Parsing

- No CSV parsing changes. `keywordRule` records use the existing superset-column approach.

---

### ✅ GATE CLEARED: Constitution Amendment Applied (Technology Standards)

**Amendment applied**: Constitution v1.5.1 → v1.6.0 on 2026-03-21.

**Changes made**:
- Record type count updated: "exactly six" → "exactly seven"
- `keywordRule` row added to the record types table with fields: type, pattern, category, createdDate, status
- Ledger CSV Superset Header section added, documenting all column names including the new `pattern` column (appended at end)

**Migration plan**: No migration of existing ledger files required. The `pattern` column appends to the existing superset header; all existing record types emit an empty string for this column, which is valid under the superset-column scheme already in use.

---

## Project Structure

### Documentation (this feature)

```text
specs/002-user-keyword-rules/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── ui-contracts.md  # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (changes to repository root)

```text
src/
├── models/
│   └── index.ts                  MODIFY — add KeywordRuleRecord, update AllRecordTypes, RecordType
├── services/
│   ├── categoriser/
│   │   ├── categoriser.service.ts          MODIFY — extend buildKeywordIndex()
│   │   └── keyword-rules.service.ts        NEW — saveKeywordRule, isDuplicateRule, setKeywordRuleStatus, resolveKeywordRules
│   └── ledger/
│       ├── ledger-reader.ts       MODIFY — parse 'keywordRule' record type
│       └── ledger-writer.ts       MODIFY — serialise 'keywordRule', add 'pattern' column to LEDGER_HEADER
├── components/
│   ├── import/
│   │   └── TransactionList.tsx    MODIFY — integrate KeywordRulePrompt after override confirmation
│   └── rules/                     NEW directory
│       ├── KeywordRulePrompt.tsx  NEW — inline rule prompt card
│       └── KeywordRulesScreen.tsx NEW — management screen
└── hooks/
    └── useKeywordRules.ts         NEW — resolveKeywordRules, saveRule, toggleStatus

tests/
└── unit/
    └── services/
        ├── categoriser.test.ts             MODIFY — add user-rule precedence test cases
        ├── keyword-rules.test.ts           NEW — service + resolution logic tests
        └── ledger.test.ts                  MODIFY — add keywordRule serialise/parse test cases
```

**Structure Decision**: Single-project (Option 1). All changes are within the existing `src/` and `tests/` structure. A new `src/components/rules/` directory is introduced to isolate the two new UI components.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| New `keywordRule` record type (7th) | User-defined rules must persist durably in the master ledger across sessions and survive browser restarts; the ledger is the only durable store in this client-side app | Storing rules in `localStorage` rejected — constitution Principle I explicitly prohibits using `localStorage` as a durable or authoritative store; rules are authoritative data that must survive browser storage resets |
| New `pattern` column in ledger header | `keywordRule` records require a `pattern` field not covered by any existing column | Reusing an existing column (e.g. `description`) rejected — misrepresents the semantic meaning of the field, makes the ledger harder to audit, and contradicts the spec's definition of a `keywordRule` entity |
