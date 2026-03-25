---

description: "Task list for User-Defined Keyword Rules for Auto-Categorisation"
---

# Tasks: User-Defined Keyword Rules for Auto-Categorisation

**Input**: Design documents from `/specs/002-user-keyword-rules/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ui-contracts.md ✅

**Constitution**: v1.6.0 — `keywordRule` amendment applied. Gate cleared.

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Core data types and ledger read/write support for `keywordRule` records. No user story can begin until this phase is complete.

**⚠️ CRITICAL**: All user story work is blocked until T001–T004 are complete and tests are green.

- [X] T001 [P] Add `KeywordRuleRecord` interface, add `'keywordRule'` to `RecordType` union, and add `KeywordRuleRecord` to `AllRecordTypes` union in `src/models/index.ts`
- [X] T002 Write failing unit tests for `keywordRule` ledger serialise/parse round-trip (serialise all fields to CSV row; parse back to `KeywordRuleRecord`; empty-string for unused columns on other record types) in `tests/unit/services/ledger.test.ts` — tests MUST fail before T003/T004
- [X] T003 [P] Add `pattern` to end of `LEDGER_HEADER` constant and implement `keywordRule` case in `serialiseRecord()` in `src/services/ledger/ledger-writer.ts` — make T002 tests pass (depends on T001, T002)
- [X] T004 [P] Implement `keywordRule` parser case in `parseRecord()` (or equivalent record-parsing function) in `src/services/ledger/ledger-reader.ts` — make T002 tests pass (depends on T001, T002)

**Checkpoint**: `npm test` passes all ledger round-trip tests. `keywordRule` records can be written to and read from the master ledger CSV.

---

## Phase 2: User Story 1 — Save Keyword Rule After Category Override (Priority: P1) 🎯 MVP

**Goal**: After a category override is committed, an inline non-blocking prompt offers the user the option to save a keyword rule (pattern → category). Saving or dismissing the prompt has no effect on the already-committed override.

**Independent Test**: Override a transaction category. Verify the override is persisted in the ledger. Dismiss the rule prompt. Verify no `keywordRule` record was written. Override a second transaction, confirm the prompt, verify a `keywordRule` record is written with the correct pattern and category.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST and confirm they FAIL before implementing T006**

- [X] T005 [P] [US1] Write failing unit tests for `isDuplicateRule()` (exact match active rule, different category not duplicate, inactive rule not duplicate), `saveKeywordRule()` (appends record to ledger), `resolveKeywordRules()` (groups by lowercase pattern, most-recent wins, returns correct status), and `setKeywordRuleStatus()` (appends new status record, prior unchanged) in `tests/unit/services/keyword-rules.test.ts`

### Implementation for User Story 1

- [X] T006 [US1] Implement `src/services/categoriser/keyword-rules.service.ts` exporting `saveKeywordRule()`, `isDuplicateRule()`, `resolveKeywordRules()`, and `setKeywordRuleStatus()` per contracts/ui-contracts.md — make T005 tests pass (depends on T003, T004, T005)
- [X] T007 [US1] Implement `useKeywordRules` hook in `src/hooks/useKeywordRules.ts` exporting `rules`, `saveRule()` (returns `'saved' | 'duplicate'`), `toggleStatus()`, and `isSaving` per contracts/ui-contracts.md (depends on T006)
- [X] T008 [US1] Implement `KeywordRulePrompt` component in `src/components/rules/KeywordRulePrompt.tsx` per contracts/ui-contracts.md: pre-filled pattern and category fields, inline validation (disable Confirm when pattern empty or whitespace-only), duplicate warning display, loading state, Confirm and Dismiss actions (depends on T007)
- [X] T009 [US1] Integrate `KeywordRulePrompt` into `src/components/import/TransactionList.tsx`: add `rulePromptFor` and `ruleSaveWarning` state; after override confirmation modal calls `overrideCategory()` and resolves, set `rulePromptFor` to the overridden transaction; render `<KeywordRulePrompt>` inline below the overridden row; wire `onConfirm` to `saveRule()` (checking for duplicate first) and `onDismiss` to clear `rulePromptFor` (depends on T008)

**Checkpoint**: User Story 1 is fully functional. Override a category → prompt appears → save or dismiss. Override persists regardless of prompt outcome. Duplicate rule detection warns correctly.

---

## Phase 3: User Story 2 — User-Defined Rules Applied During Auto-Categorisation (Priority: P1)

**Goal**: During every import, all active user-defined keyword rules are evaluated before the built-in default keyword map. The longest matching user rule wins; ties resolved by most-recently-created. Deactivated rules and rules with inactive categories are skipped.

**Independent Test**: Save a rule mapping "AMAZON" → "Shopping" via the US1 prompt. Start a new import session with a transaction description of "AMAZON.CO.UK PRIME". Verify it is auto-categorised as "Shopping" in the staging view. Deactivate the rule and repeat; verify the default map result is applied instead.

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST and confirm they FAIL before implementing T011**

- [X] T010 [P] [US2] Write failing unit tests for `buildKeywordIndex()` with the new `userRules` parameter: user rule takes precedence over matching default-map entry; longest pattern wins over shorter conflicting user rule; user rule with deactivated target category is skipped; empty `userRules` array produces unchanged default-map behaviour; tied pattern length resolved by most-recently-created rule in `tests/unit/services/categoriser.test.ts`

### Implementation for User Story 2

- [X] T011 [US2] Extend `buildKeywordIndex()` in `src/services/categoriser/categoriser.service.ts` to accept an optional third parameter `userRules?: KeywordRuleRecord[]`: filter to active rules whose category is in the active-category set; sort by descending `pattern.length` (stable, preserving createdDate-desc tie-breaking); prepend as `source: 'user'` entries before the existing default-map entries — make T010 tests pass (depends on T001, T010)
- [X] T012 [US2] Update all callers of `buildKeywordIndex()` to load resolved `keywordRule` records from the ledger and pass them as the third argument — locate callers (expected: `src/hooks/useImport.ts` and any other entry points that invoke the categoriser); use `resolveKeywordRules()` from `keyword-rules.service.ts` to derive the active user rules before calling `buildKeywordIndex()` (depends on T011, T006)

**Checkpoint**: User Story 2 is fully functional. Saved rules are applied on the next import. Deactivating a rule stops it from firing. Longest-pattern and recency tie-breaking work correctly.

---

## Phase 4: User Story 3 — Keyword Rule Management Screen (Priority: P2)

**Goal**: A dedicated screen lists all keyword rules with their pattern, target category, creation date, and status. Users can deactivate active rules and reactivate inactive ones. Rules with deactivated categories are visually flagged. No delete action is provided.

**Independent Test**: Save three keyword rules via the US1 prompt. Open the Rules screen. Verify all three are listed. Deactivate one. Verify a new import with a matching description uses the default map instead. Reactivate the rule. Verify the rule fires again on import.

### Implementation for User Story 3

- [x] T013 [P] [US3] Implement `KeywordRulesScreen` component in `src/components/rules/KeywordRulesScreen.tsx` per contracts/ui-contracts.md: table with columns Pattern, Category, Created, Status, Action; "Deactivate"/"Activate" toggle button per row; visual indicator for rules whose category is inactive (`categoryIsInactive: true`); empty-state message when no rules exist; no delete action (depends on T007)
- [x] T014 [US3] Add a "Rules" navigation entry to `src/components/shared/NavBar.tsx` linking to the keyword rules screen (depends on T013)
- [x] T015 [US3] Register `KeywordRulesScreen` as a navigable view in `src/App.tsx`, accessible from the NavBar entry added in T014 (depends on T013, T014)

**Checkpoint**: All three user stories are independently functional. The Rules screen lists rules, toggles work, and deactivated rules do not fire during import.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T016 [P] Run `npm test` and confirm all tests pass — baseline was 172 tests; new test count should include ledger round-trip tests (T002), keyword-rules service tests (T005), and categoriser precedence tests (T010)
- [X] T017 [P] Run `npm run lint` and confirm zero lint errors across all new and modified files
- [ ] T018 End-to-end validation per `specs/002-user-keyword-rules/quickstart.md`: (1) override a category → save rule → import file with matching description → verify rule applied in staging; (2) deactivate rule → re-import → verify default map used; (3) open Rules screen → verify listing, toggle, and inactive-category visual indicator all work correctly

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately
- **User Story 1 (Phase 2)**: Depends on Foundational (T001–T004) — BLOCKS Phase 2 work
- **User Story 2 (Phase 3)**: Depends on Foundational (T001–T004) and US1 service (T006) — can start after T006
- **User Story 3 (Phase 4)**: Depends on Foundational (T001–T004) and `useKeywordRules` hook (T007) — can start after T007
- **Polish (Phase 5)**: Depends on all desired user stories complete

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational only
- **US2 (P1)**: Depends on Foundational + `keyword-rules.service.ts` (T006) for `resolveKeywordRules()`
- **US3 (P2)**: Depends on Foundational + `useKeywordRules` hook (T007)

### Within Each Phase

- Tests MUST be written and confirmed FAILING before their implementation tasks begin
- `src/models/index.ts` (T001) before any service or component
- Service (T006) before hook (T007) before components (T008, T013)
- `KeywordRulePrompt` (T008) before `TransactionList` integration (T009)
- `KeywordRulesScreen` (T013) before NavBar (T014) before App routing (T015)

### Parallel Opportunities

- T001 can run in parallel with no other tasks (pure type additions, no deps)
- T003 and T004 can run in parallel (different files, both depend on T001 + T002)
- T005 and the start of US2/US3 (T010, T013) can run in parallel once Foundational is done
- T016 and T017 (Polish) can run in parallel

---

## Parallel Execution Examples

### Phase 1 — Foundational

```bash
# Start immediately:
Task T001: "Add KeywordRuleRecord to src/models/index.ts"

# After T001:
Task T002: "Write failing ledger tests in tests/unit/services/ledger.test.ts"

# After T001 + T002 (run in parallel):
Task T003: "Add pattern column + keywordRule serialiser in src/services/ledger/ledger-writer.ts"
Task T004: "Add keywordRule parser in src/services/ledger/ledger-reader.ts"
```

### Phase 2 — US1 + US2 tests in parallel (after T006)

```bash
# After T003 + T004 (run in parallel):
Task T005: "Write failing keyword-rules service tests in tests/unit/services/keyword-rules.test.ts"
Task T010: "Write failing categoriser precedence tests in tests/unit/services/categoriser.test.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Foundational (T001–T004)
2. Complete Phase 2: User Story 1 (T005–T009) — rule prompt works end-to-end
3. Complete Phase 3: User Story 2 (T010–T012) — rules fire during import
4. **STOP and VALIDATE**: Override a category, save a rule, import a matching file — verify it applies
5. Demo: The core value of the feature is fully deliverable at this point

### Incremental Delivery

1. Foundation → `keywordRule` persists in ledger ✓
2. US1 → User can create rules via override prompt ✓
3. US2 → Rules fire during subsequent imports ✓ (MVP complete)
4. US3 → User can manage rules via dedicated screen ✓

---

## Notes

- `[P]` tasks = different files, no dependencies on in-progress tasks — safe to run in parallel
- `[US1]`/`[US2]`/`[US3]` maps each task to its user story for traceability
- Tests marked ⚠️ MUST be written and confirmed FAILING before their implementation tasks begin (Principle III)
- T002, T005, T010 are all RED-phase TDD tasks — do not implement until tests exist and fail
- The `pattern` column is the only new ledger CSV column; all existing record serialisers must emit `''` for it (handled in T003)
- `resolveKeywordRules()` (in T006) is shared by both US1 (hook) and US2 (buildKeywordIndex callers) — complete T006 before starting T010/T011/T012
