# Research: User-Defined Keyword Rules

**Branch**: `002-user-keyword-rules` | **Date**: 2026-03-21

## Summary

All decisions below are derived from the existing codebase. No external research was required; the patterns established in 001-csv-budget-tracker fully constrain the implementation approach.

---

## Decision 1: Keyword Index Prepend Strategy

**Decision**: User-defined rules are prepended to the `KeywordIndex.entries` array, sorted by descending pattern length, before the default-map entries. No changes to the `categorise()` function's first-match loop are required.

**Rationale**: The `categorise()` function already iterates `entries` in order and returns on first match. If user-defined rules (sorted longest-first) precede the default entries, precedence and tie-breaking are achieved by list ordering alone — no algorithmic changes needed.

**Alternatives considered**:
- Separate pass: Check user rules first, then default map in a second call. Rejected — doubles the iteration and requires refactoring `categorise()` callers.
- Priority field on entries: Add a numeric priority. Rejected — over-engineered; ordering accomplishes the same thing more simply (Principle V).

**Implementation touch points**:
- `buildKeywordIndex()` in `src/services/categoriser/categoriser.service.ts` — add a `userRules` parameter; sort by descending `pattern.length` and prepend before default entries.
- `categorise()` — unchanged.

---

## Decision 2: Rule Prompt Trigger Point

**Decision**: The keyword rule prompt is displayed **only** from the post-commit `TransactionList.tsx` override flow (after `overrideCategory()` resolves). It is **not** shown during the pre-commit staging view (`StagingView.tsx`).

**Rationale**: FR-101 requires the override to be committed to the master ledger before the prompt appears. In the staging flow, no ledger writes occur until the user confirms the entire import — the category change is a tentative in-memory state. Applying the prompt there would violate the spec's commit-first requirement and complicate staging state management.

**Alternatives considered**:
- Prompt in both staging and post-commit views. Rejected — staging overrides are not yet persisted, contradicting FR-101. Deferred to a future amendment if needed.

---

## Decision 3: Non-Blocking Prompt UI Pattern

**Decision**: The rule prompt is rendered as an **inline, dismissible card** that appears below the overridden transaction row in `TransactionList.tsx`. It does not block interaction with the rest of the list.

**Rationale**: A modal dialog would prevent scrolling and interaction with other rows. An inline card meets the non-blocking requirement (the override is already committed) and is consistent with the existing inline-panel pattern used in `PersonAssignmentPrompt.tsx` and `AccountMappingPanel.tsx`.

**Alternatives considered**:
- Toast notification with an "Add rule" action button. Rejected — toasts auto-dismiss, making the action easy to miss and hard to act on in a table-dense view.
- Modal dialog. Rejected — blocks rest of UI, violating the non-blocking requirement in FR-102.

---

## Decision 4: Categoriser `buildKeywordIndex` Signature Change

**Decision**: `buildKeywordIndex` gains a third optional parameter `userRules: KeywordRuleRecord[]` (defaulting to `[]`). Callers that do not yet pass user rules continue to work unchanged.

**Rationale**: Backwards-compatible extension; the function already accepts categories and the default keyword map. Adding an optional third argument avoids touching existing call sites during an incremental rollout.

---

## Decision 5: Ledger Header Extension

**Decision**: A single new column `pattern` is added to `LEDGER_HEADER` in `ledger-writer.ts`. All existing record types emit an empty string for this column. `keywordRule` records emit empty strings for all existing columns they do not use.

**Rationale**: The existing approach (superset header, empty-string for unused fields) is already used for all six record types. `keywordRule` requires only `type`, `pattern`, `category`, `createdDate`, and `status` — of which only `pattern` is new. Adding one column is the minimal change.

---

## Decision 6: Rule Prompt Scope During Override Confirmation Modal

**Decision**: The rule prompt is triggered **after** the user confirms the existing override confirmation modal (the two-step flow: select category → confirm in modal → override committed). The rule prompt then replaces or follows the modal close.

**Rationale**: `overrideCategory()` is called on modal confirmation. The prompt must appear after this call resolves (FR-101). The modal close and the prompt display can be sequenced in the modal's `onConfirm` callback.

---

## Decision 7: Duplicate Rule Detection Scope

**Decision**: Duplicate detection (FR-109) compares the new pattern (case-insensitive) against the `pattern` field of all records with `type === 'keywordRule'` and the most-recent-record status of `active`, for the same `category`. A pattern that matches an existing active rule for a **different** category is not a duplicate — both rules are stored; the longer-pattern rule wins at categorisation time.

**Rationale**: Same pattern + same category = redundant write. Same pattern + different category = legitimate user intent to remap. Storing both and letting the precedence algorithm resolve them is simpler than blocking the second save.

---

## Decision 8: `keywordRule` Supersession Key

**Decision**: The authoritative status of a `keywordRule` record is determined by the **most recent `createdDate`** for a given `pattern` (case-insensitive). This mirrors the `accountPersonMapping` effective-date approach and the `budget` most-recent-record approach.

**Rationale**: Consistent with the append-only pattern already used in the ledger. The `parseLedgerCsv()` reader can apply the same supersession logic used for transactions (grouping by a composite key, keeping last).

---

## Open Items

None. All NEEDS CLARIFICATION items from the spec were resolved through codebase inspection. No external dependencies or API integrations are required.
