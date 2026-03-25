# Research: Keyword Rule Prompt in Import Staging View

## Overview

No external unknowns require investigation. This feature is a pure UI state addition within an existing React component (`StagingView`). All prompt logic, rule-saving, and duplicate detection are already implemented and tested in the existing `KeywordRulePrompt` component, `useKeywordRules` hook, and `TransactionList` component. The only work is wiring them into `StagingView` using the same pattern.

---

## Decision 1: Rule Prompt State Placement

**Decision**: Prompt state (`rulePromptFor`, `ruleSaveWarning`) lives inside `StagingView` as local component state.

**Rationale**: Matches the pattern established by `TransactionList`, which manages its own rule prompt state locally. `StagingView` already manages `categoryOverrides` locally — prompt state follows the same ownership model. Lifting state to `ImportScreen` would require additional prop threading without benefit.

**Alternatives considered**:
- Lift to `ImportScreen` and pass callbacks: Works but adds prop surface to `ImportScreen` for concern that belongs to the staging step only. Rejected — violates Principle V (Simplicity).
- Separate hook for staging prompt state: Unnecessary abstraction for two state variables. Rejected — YAGNI.

---

## Decision 2: Rule Write Timing

**Decision**: Rule is written immediately when the user confirms the `KeywordRulePrompt` during staging — not deferred to import confirmation time.

**Rationale**: Spec FR-004 explicitly requires this. The practical benefit: a rule saved during staging of Import A is visible during staging of Import B (started in the same session), because `useKeywordRules` reads from the shared `useLedger` records which reflect appended records immediately. If the write were deferred to import confirmation, the rule would only be available after the import completes, which may be too late for the user's next import in the same session.

**Implementation note**: `useKeywordRules.saveRule` calls `appendRecords` from `useLedger`, which writes through the File System Access API. This is the same path used by `TransactionList`. No special handling needed — the existing hook already satisfies the "immediate write" requirement.

**Alternatives considered**:
- Defer rule write to import confirmation: Violates spec FR-004. Rejected.
- Queue rule writes and flush on confirm: More complex, same outcome as immediate write for single-session use. Rejected — YAGNI.

---

## Decision 3: Prompt Trigger Condition

**Decision**: The rule prompt fires when `newCategory !== row.category`, where `row.category` is the auto-categorised value from `buildKeywordIndex` at staging-screen load time.

**Rationale**: `row.category` (the value produced by `categorise(row.description, keywordIndex)`) is the baseline. A user override is only meaningful — and a rule only sensible — when the user has selected something different from the auto-assigned value. If the user reverts to the auto-assigned category, the prompt is dismissed (spec FR-006).

**Edge case**: If `categoryOverrides[i]` already differs from `row.category` (user changed it previously) and the user changes it again, the prompt updates to the new selection. This is handled naturally since `handleCategoryChange` always sets `rulePromptFor` based on the new value vs. `row.category`.

**Alternatives considered**:
- Use `categoryOverrides[i] ?? row.category` as the baseline: Would suppress the prompt when the user re-selects the same previously overridden category. Rejected — uses the wrong baseline.

---

## Decision 4: Single Prompt at a Time

**Decision**: Only one `KeywordRulePrompt` is visible at a time. Changing a different row's category dismisses the existing prompt without saving.

**Rationale**: Spec FR-007 requires this. A single shared `rulePromptFor` state variable (tracking `rowIndex`) achieves this naturally — setting a new `rulePromptFor` for a different row index replaces the previous one.

**Alternatives considered**:
- Allow multiple simultaneous prompts (one per changed row): More complex state management; the user would face multiple simultaneous save decisions. Rejected — violates Principle V.

---

## Decision 5: Import Confirm Without Rule Engagement

**Decision**: If the user clicks "Confirm Import" while the rule prompt is visible, the import proceeds and the prompt state is discarded (no rule written).

**Rationale**: Spec FR-003 and FR-008. The rule prompt is non-blocking. `StagingView` passes `categoryOverrides` to `onConfirm` regardless of prompt state. Since `rulePromptFor` is local state in `StagingView`, it is automatically discarded when the component unmounts after confirmation.

**Alternatives considered**:
- Block import confirmation if prompt is open: Violates the non-blocking requirement in spec and feature 002. Rejected.
- Show a warning if user confirms with prompt open: Adds friction with no clear benefit — the user explicitly chose to confirm. Rejected.

---

## Summary of Resolved Decisions

| # | Topic | Decision |
|---|-------|----------|
| 1 | State placement | Local to `StagingView` |
| 2 | Rule write timing | Immediate on prompt confirm (via `useKeywordRules.saveRule`) |
| 3 | Prompt trigger | `newCategory !== row.category` (auto-categorised baseline) |
| 4 | Multiple prompts | One at a time; switching row replaces previous prompt |
| 5 | Confirm without rule | Import proceeds; prompt state discarded naturally |
