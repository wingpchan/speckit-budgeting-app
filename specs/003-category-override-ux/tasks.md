# Tasks: Post-Commit Transaction Category Override UX

**Input**: Design documents from `/specs/003-category-override-ux/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ui-contracts.md ✓, quickstart.md ✓

**Tests**: Included — TDD is constitutionally required (Principle III); contracts explicitly state test tasks MUST run before implementation.

**Organization**: Single user story (US1). Phases: Setup → Foundational (nav rename) → US1 (tests then implementation) → Polish.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1)

---

## Phase 1: Setup

**Purpose**: Establish a clean baseline before any changes.

- [x] T001 Confirm all existing tests pass before any changes by running `npm test` — baseline must be green

---

## Phase 2: Foundational (Navigation Rename — Blocks US1 Validation)

**Purpose**: Add the `'transactions'` ViewId and wire it to the nav and router. The TransactionsScreen must be reachable via the new nav item before the category-override UX work can be end-to-end validated.

**⚠️ CRITICAL**: Complete this phase before verifying US1 end-to-end.

- [x] T002 Add `'transactions'` to the `ViewId` union type in `src/components/shared/Layout.tsx`
- [x] T003 [P] Add `{ id: 'transactions', label: 'Transactions' }` entry to `NAV_LINKS` (before the existing `'search'` entry) in `src/components/shared/NavBar.tsx`
- [x] T004 Add `case 'transactions': return <TransactionsScreen />;` and update `case 'search': return <ViewPlaceholder name="Search" />;` in the view-switch block in `src/App.tsx`
- [x] T005 Update the import-success navigation call from `onNavigate('search')` to `onNavigate('transactions')` in `src/App.tsx` and update the `onNavigate` prop type in `src/components/import/ImportScreen.tsx` from `(view: 'search') => void` to `(view: 'transactions') => void`

**Checkpoint**: Navigation to "Transactions" works; "Search" shows placeholder; import success routes to Transactions.

---

## Phase 3: User Story 1 — Intentional Category Override via Edit Trigger (Priority: P1) 🎯 MVP

**Goal**: Replace the inline `<select>` on committed-transaction rows with plain read-only category text plus an explicit "Edit" button. The category selector moves into the existing confirmation modal. Override is only written on Confirm; Confirm is disabled when no category change has been made.

**Independent Test**: Open the Transactions view with at least one committed transaction. Confirm no dropdown is visible on any row by default. Click "Edit" on a row; verify the modal opens pre-selected to the current category. Cancel — confirm no change. Re-open, pick a different category, Confirm — confirm the row updates and the change persists after reload. Verify the keyword-rule prompt still fires after a confirmed override.

### Tests for User Story 1 ⚠️ Write first — must FAIL before implementation

- [x] T006 [US1] Add `canConfirmOverride` unit tests — same category returns `false`; different category returns `true` — in `tests/unit/services/transaction-list-categories.test.ts`
- [x] T007 [US1] Add `resolveModalSelectorOptions` unit tests — active `fromCategory` produces no pinned option; inactive `fromCategory` is pinned at position 0 — in `tests/unit/services/transaction-list-categories.test.ts`
- [x] T008 [US1] Add edit-trigger state tests — after trigger fires, `pending.fromCategory === tx.category` and `pendingCategory === tx.category` — in `tests/unit/services/transaction-list-categories.test.ts`
- [x] T009 [US1] Add modal-cancel state tests — after cancel, `pending === null` and `pendingCategory === ''` — in `tests/unit/services/transaction-list-categories.test.ts`

### Implementation for User Story 1

- [x] T010 [US1] Simplify `PendingOverride` interface: remove `toCategory`, ensure `fromCategory: string` is present; add `pendingCategory` (`string`) state variable initialised to `''` alongside `pending` in `src/components/import/TransactionList.tsx`
- [x] T011 [US1] Implement `handleEditTrigger(tx: TransactionRecord)`: sets `pending = { transaction: tx, fromCategory: tx.category }` and `pendingCategory = tx.category` in `src/components/import/TransactionList.tsx`
- [x] T012 [US1] Replace the inline `<select>` in the category cell with `<span>{tx.category}</span>` and `<button onClick={() => handleEditTrigger(tx)}>Edit</button>` — button must be visible in default row state (not hover-only) in `src/components/import/TransactionList.tsx`
- [x] T013 [US1] Add category `<select>` inside the confirmation modal: `value={pendingCategory}`, `onChange={(e) => setPendingCategory(e.target.value)}`; build options using existing logic — pin `pending.fromCategory` at position 0 if it is not in `sortedActiveCategories`, followed by `sortedActiveCategories` in alphabetical order; add `pending.fromCategory` context line above the selector in `src/components/import/TransactionList.tsx`
- [x] T014 [US1] Update Confirm button: `disabled={pendingCategory === pending?.fromCategory || isOverriding}`; label `isOverriding ? 'Saving…' : 'Confirm'` in `src/components/import/TransactionList.tsx`
- [x] T015 [US1] Update `handleConfirmOverride`: guard returns early if `!pending || pendingCategory === pending.fromCategory || !state.dirHandle`; call `overrideCategory(pending.transaction, pendingCategory, state.dirHandle)`; on success clear `pending`, `pendingCategory`, set `rulePromptFor(overriddenTx)`, clear `ruleSaveWarning`, call `onRefresh?.()` in `src/components/import/TransactionList.tsx`

**Checkpoint**: All 4 new tests pass. No inline dropdown visible on any row. Edit → modal opens pre-selected. Cancel → no change. Confirm (different category) → row updates, ledger persists. Confirm (same category) → button disabled. Keyword-rule prompt fires after override.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [ ] T016 [P] Run all quickstart.md scenarios manually: Scenario 1 (deliberate override), Scenario 2 (cancel unchanged), Scenario 3 (confirm disabled same category), Scenario 4 (keyword rule prompt regression), Scenario 5 (inactive category in modal), plus Navigation Verification section in `specs/003-category-override-ux/quickstart.md`
- [x] T017 [P] Run `npm test && npm run lint` and confirm zero failures and zero lint errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — run immediately
- **Foundational (Phase 2)**: Depends on Phase 1 green baseline — BLOCKS end-to-end nav validation
- **User Story 1 (Phase 3)**: Tests (T006–T009) can start in parallel with Phase 2; implementation (T010–T015) requires Phase 2 complete for end-to-end testing, but the component changes themselves are independent
- **Polish (Phase 4)**: Depends on all Phase 3 tasks complete

### User Story Dependencies

- **User Story 1 (P1)**: Only story — entire scope of this feature

### Within User Story 1

- Tests T006–T009 MUST be written and confirmed FAILING before T010–T015
- T010 (state model) before T011 (handler), T011 before T012–T015
- T012, T013, T014, T015 all modify TransactionList.tsx — work sequentially within the file
- T016, T017 run in parallel once all prior tasks complete

### Parallel Opportunities

- T003 (NavBar) can be worked in parallel with T002 (Layout) and T004–T005 (App)
- T006–T009 (test authoring) can be started in parallel with Phase 2 nav work
- T016 (manual quickstart) and T017 (automated tests) run in parallel at the end

---

## Parallel Example: Phase 2 + Early Test Authoring

```bash
# Can start concurrently:
Task T002: Add 'transactions' to ViewId in src/components/shared/Layout.tsx
Task T003: Add Transactions nav item in src/components/shared/NavBar.tsx
Task T006: Write canConfirmOverride tests in tests/unit/services/transaction-list-categories.test.ts
```

---

## Implementation Strategy

### MVP (Single Story — Full Feature)

1. Complete Phase 1: baseline green
2. Complete Phase 2: nav rename — Transactions view reachable
3. Complete Phase 3 tests first (T006–T009) — confirm they fail
4. Complete Phase 3 implementation (T010–T015) — confirm tests now pass
5. **STOP and VALIDATE**: run quickstart.md manually + `npm test`
6. Feature complete

### Delivery is Atomic

There is only one user story. The MVP is the complete feature. There is no partial delivery increment.

---

## Notes

- [P] tasks target different files — no write conflicts
- Tests MUST fail before implementation begins (TDD, constitution Principle III)
- The `<select>` is removed from the row entirely — do not leave it hidden or conditionally rendered inline
- The "Edit" button must be visible in the default row state per FR-008 — do not use hover or focus to reveal it
- `pendingCategory` is a flat state variable, not a field on `PendingOverride` (research Decision 2)
- Confirm guard uses strict equality: `pendingCategory === pending.fromCategory` (research Decision 3)
- `'search'` ViewId is RETAINED in the union as a future placeholder — do not remove it
