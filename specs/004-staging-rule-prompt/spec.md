# Feature Specification: Keyword Rule Prompt in Import Staging View

**Feature Branch**: `004-staging-rule-prompt`
**Created**: 2026-03-25
**Status**: Draft
**Input**: User description: "amend feature 002 US1 — KeywordRulePrompt must fire after any category change regardless of screen; explicitly add StagingView coverage: after a user changes a category in the StagingView dropdown during import staging, the KeywordRulePrompt must appear and offer to save a keyword rule; the rule must be saved to the ledger immediately before import is confirmed; non-blocking — import can proceed whether or not the user saves a rule"

## Context

This feature amends User Story 1 of feature 002 (User-Defined Keyword Rules). Feature 002 US1 specified that the keyword rule prompt fires after a category override is committed in the committed-transactions view. This amendment extends that coverage to the import staging screen: the rule prompt must also fire when a user manually changes a category in the staging dropdown during the import review step — before any transactions have been committed.

The critical timing difference from the committed-transactions flow: in staging, the category change has not yet been written to the ledger. The rule, however, must be written to the ledger immediately when the user confirms it, so that subsequent imports in the same session benefit from the new rule without requiring the user to reload the app.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Keyword Rule Prompt in Import Staging (Priority: P1)

A user reviewing a batch of staged transactions before confirming an import sees each transaction's auto-assigned category in a dropdown. When the user selects a different category for any row, a keyword rule prompt immediately appears inline below that row — the same prompt used in the committed-transactions view. The user can save a rule, edit the pattern, or dismiss the prompt. The rule, if saved, is written to the ledger at that moment, before the import is confirmed. The import can be confirmed at any time regardless of the prompt's state.

**Why this priority**: This is the entire scope of this amendment. Without it, users who correct categories during staging have no way to capture that correction as a reusable rule — they must repeat the override every time they import a matching transaction.

**Independent Test**: Begin an import. On the staging screen, change a transaction's category from the auto-assigned value to a different category. Verify a keyword rule prompt appears below that row, pre-filled with the transaction description and the newly chosen category. Confirm the rule. Without confirming the import, begin a second import containing a transaction with the same description. Verify the staging screen auto-categorises it to the rule's category. Return to the first import and confirm it. Verify both imports commit correctly.

**Acceptance Scenarios**:

1. **Given** a user is reviewing staged transactions, **When** the user selects a different category in the dropdown for any row, **Then** a keyword rule prompt appears inline below that row, pre-filled with the transaction description and the newly selected category.
2. **Given** the keyword rule prompt is visible for a staging row, **When** the user confirms the rule (with or without editing the pattern), **Then** the rule is written to the master ledger immediately — before the import is confirmed.
3. **Given** the keyword rule prompt is visible, **When** the user dismisses the prompt, **Then** no rule is written; the staging category override is preserved and the import may still be confirmed.
4. **Given** the keyword rule prompt is visible for a staging row, **When** the user changes a different row's category, **Then** the previous prompt is dismissed and a new prompt appears for the newly changed row.
5. **Given** the keyword rule prompt is visible, **When** the user changes the same row's dropdown back to the original auto-assigned category, **Then** the rule prompt is dismissed (no override, no rule needed).
6. **Given** the user confirms a rule during staging and then confirms the import, **When** a subsequent import session begins, **Then** the newly saved rule is applied during auto-categorisation on the new staging screen without any additional user action.
7. **Given** the rule prompt is visible in staging, **When** the user clicks Confirm Import without engaging with the prompt, **Then** the import proceeds normally and the prompt state is discarded without writing a rule record.
8. **Given** the user attempts to confirm a rule with an empty or whitespace-only pattern, **When** the confirm action is triggered, **Then** the confirm button is disabled and an inline error is shown, matching the behaviour in the committed-transactions flow.
9. **Given** the user confirms a rule whose pattern and category exactly match an existing active rule, **When** the rule prompt is submitted, **Then** a duplicate warning is shown, no new record is written, and the prompt remains open.

---

### Edge Cases

- What happens when the user selects the same category that was already auto-assigned (no real change)? The rule prompt must not appear — the dropdown value is unchanged.
- What happens when the import is cancelled after a rule has already been saved? The rule remains in the ledger (it was written when the user confirmed the rule prompt); the cancelled import does not affect it.
- What happens when the staging batch contains multiple rows with the same description but different categories? Each row's dropdown operates independently; the user is responsible for ensuring the saved pattern does not produce unintended matches on other rows.
- What happens when a rule is saved during staging for a category that is later deactivated before the import is confirmed? The rule record exists in the ledger but is treated as inactive while its target category is deactivated, consistent with feature 002 FR-114.

## Requirements *(mandatory)*

### Functional Requirements

**Staging Keyword Rule Prompt**

- **FR-001**: When a user selects a different category in the import staging dropdown for any transaction row, the app MUST display the keyword rule prompt inline below that row immediately.
- **FR-002**: The keyword rule prompt in staging MUST be pre-filled with the transaction description of the changed row as the pattern, and the newly selected category as the target category.
- **FR-003**: The keyword rule prompt MUST be non-blocking: the user MUST be able to confirm the import at any time without engaging with, saving, or dismissing the prompt.
- **FR-004**: When the user confirms the keyword rule prompt during staging, the rule MUST be written to the master ledger immediately — not deferred until import confirmation.
- **FR-005**: When the user dismisses the keyword rule prompt during staging, no rule record is written; the staging category override remains in place and the import may proceed normally.
- **FR-006**: When the user changes a staging row's dropdown back to its original auto-assigned category, the keyword rule prompt for that row MUST be dismissed without writing any rule.
- **FR-007**: When the user changes the category of a different staging row while a prompt is already visible, the existing prompt MUST be dismissed and a new prompt MUST appear for the newly changed row.
- **FR-008**: When the user confirms the import without engaging with the rule prompt, the prompt state is discarded and no rule record is written.
- **FR-009**: The keyword rule prompt in staging MUST enforce the same validation rules as the committed-transactions flow: empty or whitespace-only patterns are rejected with an inline error and the confirm button is disabled.
- **FR-010**: The duplicate detection check from feature 002 (FR-109) MUST apply equally in staging: if an identical active rule already exists, the user is shown a duplicate warning and no new record is written.

### Key Entities

- **Staged Category Override**: A user-initiated category change applied to a transaction row during import review, before the import batch is committed to the ledger. Captured in staging state only until the import is confirmed.
- **Immediately-Saved Keyword Rule**: A keyword rule record written to the ledger at the moment the user confirms the rule prompt during staging — independently of, and prior to, any import confirmation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can save a keyword rule during import staging and verify that a subsequent staged import (started in the same session, without reloading) auto-categorises matching transactions to the rule's category — no manual intervention required on the second import.
- **SC-002**: Saving or dismissing the keyword rule prompt during staging introduces no additional required steps to the import confirmation flow — the user can still confirm the import in a single action at any point.
- **SC-003**: Every staging category change where the new category differs from the auto-assigned category triggers the keyword rule prompt on the same row with no extra user action.
- **SC-004**: A rule saved during staging is visible in the keyword rules management screen immediately after being confirmed, before the import is committed.
- **SC-005**: Cancelling an import after saving a rule during staging leaves the rule intact in the master ledger; the cancelled import does not remove or affect the rule record.

## Assumptions

- The keyword rule prompt in staging reuses the same component used in the committed-transactions flow (feature 002); no new prompt UI is introduced.
- The staging screen's existing category dropdown behaviour (inline override before commit) is unchanged; only the addition of the inline rule prompt after a change is new.
- Rules saved during staging use the same ledger append mechanism as rules saved from the committed-transactions view.
- "Immediately saved" means the ledger write occurs at rule-confirm time; the import confirmation is a separate, subsequent ledger write that is fully independent.
- If the user saves a rule and then cancels the import, this is a valid and expected state: the rule is retained (explicitly confirmed by the user) while the import batch is discarded.
- The auto-assigned category for a staging row is the category produced by the current keyword index (including any user rules already in the ledger) at the time the staging screen loads; this is the baseline against which "different category" is evaluated for triggering the prompt.
