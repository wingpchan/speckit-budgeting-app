# Quickstart: User-Defined Keyword Rules

**Branch**: `002-user-keyword-rules` | **Date**: 2026-03-21

## Prerequisites

1. Node.js 18+ and npm installed.
2. Repository cloned; run `npm install` from repo root.
3. A Chromium-based browser (Chrome or Edge) — File System Access API is required.

> **⚠️ Before beginning implementation**: The constitution amendment documented in `plan.md` (adding `keywordRule` as the seventh ledger record type) **must be approved and committed** to `constitution.md` before any code changes begin.

## Development Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test -- --watch

# Run specific test file
npm run test -- tests/unit/services/keyword-rules.test.ts

# Lint
npm run lint

# Dev server (open in Chrome or Edge)
npm run dev
```

## Key Files for This Feature

| File | Role |
|------|------|
| `src/models/index.ts` | Add `KeywordRuleRecord` type and update unions |
| `src/services/ledger/ledger-writer.ts` | Add `pattern` column, add `keywordRule` serialiser case |
| `src/services/ledger/ledger-reader.ts` | Add `keywordRule` parser case |
| `src/services/categoriser/categoriser.service.ts` | Extend `buildKeywordIndex()` with user rules |
| `src/services/categoriser/keyword-rules.service.ts` | New service — all rule ledger operations |
| `src/hooks/useKeywordRules.ts` | New hook — rules state and operations for UI |
| `src/components/rules/KeywordRulePrompt.tsx` | New inline prompt card component |
| `src/components/rules/KeywordRulesScreen.tsx` | New management screen component |
| `src/components/import/TransactionList.tsx` | Integrate prompt after override confirmation |

## TDD Order

Follow the Red-Green-Refactor cycle strictly (Principle III):

1. **`ledger.test.ts`** — add failing tests for `keywordRule` serialise/parse round-trip.
2. **`ledger-writer.ts` + `ledger-reader.ts`** — make tests green.
3. **`keyword-rules.test.ts`** — add failing tests for `resolveKeywordRules`, `isDuplicateRule`, `saveKeywordRule`, `setKeywordRuleStatus`.
4. **`keyword-rules.service.ts`** — make tests green.
5. **`categoriser.test.ts`** — add failing tests for `buildKeywordIndex` with user rules (precedence, longest-match, deactivated category, empty rules).
6. **`categoriser.service.ts`** — make tests green.
7. **`KeywordRulePrompt.tsx`** — implement component (UI tests if applicable).
8. **`KeywordRulesScreen.tsx`** — implement component.
9. **`useKeywordRules.ts`** — implement hook.
10. **`TransactionList.tsx`** — integrate prompt; test override → prompt → save/dismiss flow.

## Checking the Ledger CSV

To inspect `keywordRule` records written to the ledger, open `budget-ledger.csv` in any text editor or spreadsheet. Records will have `keywordRule` in the `type` column and the pattern value in the `pattern` column (last column). All other columns will be empty for these rows.
