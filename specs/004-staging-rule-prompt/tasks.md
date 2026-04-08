# Tasks: Keyword Rule Prompt in Import Staging View

**Input**: Design documents from `/specs/004-staging-rule-prompt/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ui-contracts.md ✓, quickstart.md ✓

**Tests**: Included — TDD is constitutionally required (Principle III); contracts list 9 test scenarios that must be written and failing before implementation.

**Organization**: Single user story (US1). Phases: Setup → US1 tests (TDD) → US1 implementation → Polish.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1)

---

## Phase 1: Setup

**Purpose**: Establish a clean baseline before any changes.

- [x] T001 Confirm all existing tests pass before any changes by running `npm test` — baseline must be green

---

## Phase 2: Foundational

**Purpose**: No blocking prerequisites beyond the green baseline — all existing hook and component infrastructure is already in place. This phase is satisfied by T001.

**Checkpoint**: Green baseline confirmed → US1 work can begin.

---

## Phase 3: User Story 1 — Keyword Rule Prompt in Import Staging (Priority: P1) 🎯 MVP

**Goal**: When a user changes a category in the `StagingView` dropdown to a value different from the auto-assigned category, a `KeywordRulePrompt` appears inline below that row. If confirmed, the rule is written to the ledger immediately (before import). If dismissed or if the user confirms the import without engaging, no rule is written. The import remains non-blocking throughout.

**Independent Test**: Open the staging screen for an import. Change any row's category dropdown to a different value. Verify the `KeywordRulePrompt` appears below that row, pre-filled with the transaction description and the new category. Confirm the rule. Start a second import — verify the new rule is applied during staging auto-categorisation. Cancel the second import and start a third; rule still visible in management screen. Return to first import and confirm it — import succeeds.

### Tests for User Story 1 ⚠️ Write first — must FAIL before implementation

- [x] T002 [US1] Add `shouldShowRulePrompt` unit tests — `('Shopping', 'Groceries')` → `true`; `('Groceries', 'Groceries')` → `false` — in `tests/unit/services/transaction-list-categories.test.ts`
- [x] T003 [US1] Add staging edit-trigger state tests — after `handleCategoryChange(i, newCategory, autoCategory)` with `newCategory !== autoCategory`: `rulePromptFor.rowIndex === i` and `rulePromptFor.category === newCategory` — in `tests/unit/services/transaction-list-categories.test.ts`
- [x] T004 [US1] Add staging revert-to-auto tests — after `handleCategoryChange(i, autoCategory, autoCategory)`: `rulePromptFor === null` — in `tests/unit/services/transaction-list-categories.test.ts`
- [x] T005 [US1] Add staging row-switch tests — after changing row j while prompt is open for row i: `rulePromptFor.rowIndex === j` — in `tests/unit/services/transaction-list-categories.test.ts`
- [x] T006 [US1] Add staging dismiss tests — after `handleRuleDismiss()`: `rulePromptFor === null` and `ruleSaveWarning === ''` — in `tests/unit/services/transaction-list-categories.test.ts`
- [x] T007 [US1] Add staging duplicate-warning tests — after `handleRuleConfirm` returns `'duplicate'`: `ruleSaveWarning` is non-empty, `rulePromptFor` unchanged — in `tests/unit/services/transaction-list-categories.test.ts`
- [x] T008 [US1] Add staging save-success tests — after `handleRuleConfirm` returns `'saved'`: `rulePromptFor === null` and `ruleSaveWarning === ''` — in `tests/unit/services/transaction-list-categories.test.ts`

### Implementation for User Story 1

- [x] T009 [US1] Add `import { Fragment } from 'react'`, `useKeywordRules` from `../../hooks/useKeywordRules`, and `KeywordRulePrompt` from `../rules/KeywordRulePrompt` imports to `src/components/import/StagingView.tsx`
- [x] T010 [US1] Add `RulePromptTarget` interface and `rulePromptFor`/`ruleSaveWarning` state variables; call `useKeywordRules()` inside `StagingView` in `src/components/import/StagingView.tsx`
- [x] T011 [US1] Implement `handleCategoryChange(i, newCategory, autoCategory)` — calls `setCategoryOverrides`, sets `rulePromptFor` when `newCategory !== autoCategory`, clears it when equal — in `src/components/import/StagingView.tsx`
- [x] T012 [US1] Implement `handleRuleConfirm(pattern, category)` — calls `saveRule`, on `'duplicate'` sets `ruleSaveWarning`, on `'saved'` clears `rulePromptFor` and `ruleSaveWarning` — in `src/components/import/StagingView.tsx`
- [x] T013 [US1] Implement `handleRuleDismiss()` — clears `rulePromptFor` and `ruleSaveWarning` — in `src/components/import/StagingView.tsx`
- [x] T014 [US1] Wrap `categorisedRows.map` tbody entries in `<Fragment key={i}>`, delegate `<select>` `onChange` to `handleCategoryChange(i, e.target.value, row.category)`, and add inline `<KeywordRulePrompt>` row when `rulePromptFor?.rowIndex === i` — in `src/components/import/StagingView.tsx`

**Checkpoint**: All 7 new tests pass. Change a staging category → prompt appears. Dismiss → no rule. Confirm rule → rule in ledger before import confirm. Confirm Import without rule engagement → import succeeds, no rule. Duplicate pattern → warning shown. Revert to auto category → prompt dismissed.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [x] T015 [P] Run all quickstart.md scenarios manually: Scenarios 1–8 against the running app in `specs/004-staging-rule-prompt/quickstart.md`
- [x] T016 [P] Run `npm test && npm run lint` and confirm zero failures and zero lint errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — run immediately
- **Foundational (Phase 2)**: Satisfied by T001 green baseline
- **User Story 1 tests (T002–T008)**: Can begin immediately after T001; all write to the same test file — run sequentially
- **User Story 1 implementation (T009–T014)**: Require T002–T008 to be written and confirmed failing; T009–T013 can run in parallel (different concerns within the same file), T014 requires T009–T013
- **Polish (Phase 4)**: T015 and T016 run in parallel after all T001–T014 complete

### User Story Dependencies

- **User Story 1 (P1)**: Only story — entire feature scope

### Within User Story 1

- Tests T002–T008 MUST be written and confirmed FAILING before T009–T014
- T009 (imports) before T010 (state); T010 before T011–T013; T011–T013 before T014 (JSX)
- T002–T008 all write to the same test file — run sequentially (no write conflicts)
- T015 and T016 run in parallel at the end

### Parallel Opportunities

- T002–T008 are logically independent but must be sequential (same file)
- T009–T013 affect different concerns within `StagingView.tsx` but are safest run sequentially
- T015 (manual quickstart) and T016 (automated suite) run in parallel

---

## Parallel Example: Phase 4 Polish

```bash
# Launch simultaneously:
Task T015: Run quickstart.md scenarios 1–8 manually
Task T016: npm test && npm run lint
```

---

## Implementation Strategy

### MVP (Single Story — Full Feature)

1. Complete Phase 1: baseline green (T001)
2. Complete Phase 3 tests T002–T008: confirm they FAIL
3. Complete Phase 3 implementation T009–T014: confirm tests now PASS
4. **STOP and VALIDATE**: run quickstart.md scenarios + `npm test`
5. Feature complete

### Delivery is Atomic

There is only one user story. The MVP is the complete feature. No partial delivery increment exists.

---

## Notes

- [P] tasks target different files or concerns — no write conflicts
- Tests T002–T008 MUST fail before implementation begins (TDD, constitution Principle III)
- `handleCategoryChange` compares `newCategory` to `autoCategory` (the `row.category` value from `categorisedRows[i]`) — NOT to the current `categoryOverrides[i]` value
- `Fragment` must be imported from React (not a default import)
- The `KeywordRulePrompt` spans all 4 columns (`colSpan={4}`) in the staging table
- The import Confirm button remains fully enabled regardless of rule prompt state — non-blocking by design (spec FR-003)
- `ruleSaveWarning` is passed as `duplicateWarning={ruleSaveWarning || undefined}` to avoid passing empty string to the prompt
