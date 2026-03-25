# Feature Specification: Post-Commit Transaction Category Override UX

**Feature Branch**: `003-category-override-ux`
**Created**: 2026-03-22
**Status**: Draft
**Input**: User description: "amend US3 in feature 001 — post-commit transaction category override UX: replace inline <select> with a plain text category display plus an explicit edit trigger (button or icon) per row; the confirmation modal contains the category selector; this prevents accidental overrides and clarifies intent"

## Context

This feature amends User Story 3 of feature 001 (CSV Budget Tracker). Feature 001 US3 specified that users can override a transaction's category, but left the interaction model open. The current implementation shows an inline `<select>` dropdown per row, which means any casual click can accidentally trigger a category change. This amendment locks down the interaction to require explicit user intent.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Intentional Category Override via Edit Trigger (Priority: P1)

A user reviewing committed transactions sees each category displayed as plain, non-interactive text. To change a category, they must explicitly click an edit trigger (button or icon) on the row. This opens a modal dialogue that presents the current category, a selector to choose a new one, and Cancel / Confirm buttons. The override is only written to the ledger when the user clicks Confirm.

**Why this priority**: This is the entire scope of the feature — preventing accidental overrides by requiring a deliberate trigger before any category selector is shown. It directly fixes the UX gap and is the only user story.

**Independent Test**: Open the transactions view with at least one committed transaction. Confirm that no dropdown or interactive control is visible on the category cell by default. Click the edit trigger on a row; verify the modal opens with the current category shown and a selector present. Cancel — verify no change is written. Re-open, select a different category, and confirm — verify the ledger is updated and the row displays the new category.

**Acceptance Scenarios**:

1. **Given** a user views the transactions list, **When** the page renders, **Then** each transaction row shows its category as plain read-only text — no dropdown or select control is visible inline.
2. **Given** a transaction row with a category, **When** the user clicks the edit trigger for that row, **Then** a modal opens containing the current category label and a category selector pre-set to the current category.
3. **Given** the override modal is open, **When** the user selects a different category and clicks Confirm, **Then** the modal closes, the row updates to show the new category, and the change is persisted to the ledger.
4. **Given** the override modal is open, **When** the user clicks Cancel (or closes the modal without confirming), **Then** the modal closes and the transaction's category is unchanged.
5. **Given** the override modal is open and the user has not changed the selected category, **When** the user clicks Confirm, **Then** the action is either a no-op (nothing written) or the modal prevents confirming when no change has been made.
6. **Given** a transaction whose current category has been deactivated, **When** the edit trigger is clicked, **Then** the modal shows the deactivated category as the current value and the selector lists only active categories (plus the current deactivated one, visually distinguished).
7. **Given** the override has been confirmed and persisted, **When** the post-override keyword-rule prompt is shown (feature 002), **Then** it appears correctly below the row as before — the edit trigger change does not break the rule-saving flow.

---

### Edge Cases

- What happens when the transaction list is empty — the edit trigger renders no rows, so no modal can be opened.
- What happens if the category selector in the modal has only one option — the Confirm button should still function, but selecting the same category results in a no-op.
- What happens if the ledger write fails mid-confirmation — the modal must remain open (or re-open with an error message) so the user knows the change was not saved.
- What happens when multiple rows have their edit triggers visible simultaneously — each trigger is independent; opening one modal does not affect other rows.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each transaction row in the committed transaction list MUST display its category as plain, non-interactive text by default.
- **FR-002**: Each transaction row MUST include a visible edit trigger (button or icon) that, when activated, opens the category override modal.
- **FR-003**: The category override modal MUST be the only place where a category selector (dropdown or equivalent control) is shown for committed transactions — no inline selectors on the row itself.
- **FR-004**: The category override modal MUST display the transaction's current category and allow the user to select a replacement from the list of available active categories.
- **FR-005**: The category override modal MUST provide Cancel and Confirm actions; the override is written to the ledger only when Confirm is activated.
- **FR-006**: If the user selects the same category that is already assigned, the Confirm action MUST either be disabled or result in no ledger write.
- **FR-007**: When the current category is inactive, the override modal MUST still display it (so the user understands the current state) and MUST include it in the selector alongside active categories, visually marked as inactive.
- **FR-008**: The edit trigger MUST be discoverable without requiring hover interaction — it must be visible in the default state of the row (not hidden until hover).
- **FR-009**: Confirming an override MUST trigger the keyword-rule prompt (feature 002) where applicable, exactly as the previous interaction model did.

### Key Entities

- **Transaction Row**: A read-only display unit in the committed transactions list. Contains date, description, amount, category (plain text), account, person, and an edit trigger for category.
- **Category Override Modal**: A dialogue that opens on explicit user action. Contains the transaction description (for context), the current category label, a category selector, and Cancel/Confirm actions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero accidental category overrides are possible through passive interaction (scrolling, tab navigation, casual click on a non-trigger area of the row).
- **SC-002**: A user can complete a deliberate category override — from clicking the edit trigger to seeing the updated category in the row — in 5 or fewer interactions.
- **SC-003**: The edit trigger is visible without any hover or focus event on 100% of transaction rows that display a category.
- **SC-004**: Cancelling the modal at any point leaves the transaction record unchanged, verifiable by reloading the ledger.
- **SC-005**: The post-override keyword-rule prompt (feature 002) continues to appear correctly after a confirmed override, with no regression in its display logic.

## Assumptions

- The edit trigger visual form (button vs icon) is left to implementation; the spec requires only that it is consistently visible and clearly associated with the category cell.
- The modal re-uses the same confirmation flow already built for feature 001/002 (modal with Cancel/Confirm) — the category selector moves into the modal rather than being a separate pre-modal step.
- No new data model changes are required; this is a pure interaction-layer change.
- The transactions view (Search tab) is the only surface affected; the pre-commit staging view (StagingView) is out of scope and retains its existing inline category selector behaviour.
