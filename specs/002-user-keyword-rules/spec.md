# Feature Specification: User-Defined Keyword Rules for Auto-Categorisation

**Feature Branch**: `002-user-keyword-rules`
**Created**: 2026-03-21
**Status**: Draft
**Input**: User description: "amend US3 — when a user overrides a transaction category, prompt them to optionally save a user-defined keyword rule (description pattern → category) that will be applied during auto-categorisation on all future imports. User-defined rules must take precedence over DEFAULT_KEYWORD_MAP. Rules must be persisted in the master ledger as a new record type or extension of an existing type. The prompt should be non-blocking — the override commits regardless of whether the user saves a rule. The rule match should use the same case-insensitive substring logic as the existing categoriser."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Save a Keyword Rule After Overriding a Category (Priority: P1)

When a user manually overrides a transaction's category, the app presents an optional, non-blocking prompt asking whether they would like to save a keyword rule. The prompt pre-fills a suggested pattern derived from the transaction description. The user can accept the suggestion, edit the pattern, or dismiss the prompt entirely. In all cases, the category override is committed immediately and the prompt outcome has no bearing on it.

**Why this priority**: This is the primary entry point for creating keyword rules. The non-blocking override must work correctly before any rule management is meaningful.

**Independent Test**: Override a transaction category. Verify the override is saved. Dismiss the rule prompt without saving. Import a new file with a matching transaction description; verify no rule was applied and the transaction is categorised by the default map.

**Acceptance Scenarios**:

1. **Given** a user changes a transaction's category via the override UI, **When** the override is saved, **Then** the category change is committed to the master ledger before any rule prompt is shown.
2. **Given** the override has been committed, **When** the rule prompt appears, **Then** it displays the transaction description, a pre-filled pattern field (defaulting to the full description), a category field pre-filled with the newly selected category, and Confirm and Dismiss actions.
3. **Given** the rule prompt is displayed, **When** the user edits the pattern field and confirms, **Then** a keyword rule record is saved to the master ledger with the edited pattern and selected category.
4. **Given** the rule prompt is displayed, **When** the user confirms without editing the pattern, **Then** a keyword rule record is saved using the full pre-filled description as the pattern.
5. **Given** the rule prompt is displayed, **When** the user dismisses without saving, **Then** no keyword rule record is written and the previously committed override remains unchanged.
6. **Given** the user clears the pattern field entirely, **When** they attempt to confirm, **Then** the confirm action is disabled and an inline message explains that the pattern cannot be empty.

---

### User Story 2 - User-Defined Rules Applied During Auto-Categorisation (Priority: P1)

On every import, the auto-categorisation engine applies user-defined keyword rules before consulting the built-in default keyword map. Any transaction whose description contains a matching user-defined rule pattern is assigned the rule's category without further lookup. Only transactions that do not match any active user-defined rule fall through to the default map.

**Why this priority**: Without this precedence behaviour, the rules saved in US1 have no effect. This is the functional output of the entire feature.

**Independent Test**: Save a keyword rule mapping "AMAZON" → "Shopping". Import a file containing a transaction with description "AMAZON.CO.UK". Verify it is categorised as "Shopping" rather than whatever the default map would assign. Then deactivate the rule and re-import a matching transaction; verify the default-map category is applied instead.

**Acceptance Scenarios**:

1. **Given** an active user-defined keyword rule for pattern "AMAZON" → "Shopping", **When** a transaction with description "AMAZON.CO.UK PRIME" is auto-categorised, **Then** it is assigned "Shopping" (user-defined rule wins over the default map).
2. **Given** no user-defined rule matches a transaction description, **When** auto-categorisation runs, **Then** the default keyword map is consulted as normal.
3. **Given** a user-defined keyword rule whose target category has been deactivated, **When** auto-categorisation runs, **Then** that rule is skipped and the default keyword map is consulted for the transaction.
4. **Given** multiple active user-defined rules match the same transaction description, **When** auto-categorisation runs, **Then** the rule with the longest matching pattern is applied; if two rules share identical pattern length, the most recently created rule takes precedence.
5. **Given** an auto-categorisation run completes with a user-defined rule applied, **When** the transaction is committed to the master ledger, **Then** the assigned category reflects the rule result, indistinguishable in storage from any other categorised transaction.

---

### User Story 3 - Keyword Rule Management (Priority: P2)

A dedicated keyword rules management screen shows all user-defined keyword rules — active and inactive — with their pattern, target category, and creation date. Users can deactivate rules they no longer want applied and reactivate previously deactivated rules. Rules cannot be deleted.

**Why this priority**: Without a management view, users have no way to inspect, audit, or disable rules that produce incorrect categorisations on future imports.

**Independent Test**: Save three keyword rules. Open the rules management screen. Verify all three are listed with their patterns and target categories. Deactivate one rule. Import a file with a transaction matching the deactivated rule's pattern; verify it falls through to the default map. Reactivate the rule; import again and verify it applies.

**Acceptance Scenarios**:

1. **Given** the user opens the keyword rules management screen, **When** it loads, **Then** all keyword rule records in the master ledger are listed with pattern, target category, creation date, and current status (active/inactive).
2. **Given** the user deactivates a keyword rule, **When** auto-categorisation runs on a subsequent import, **Then** the deactivated rule is not applied; the transaction falls through to the default map.
3. **Given** the user reactivates a deactivated keyword rule, **When** auto-categorisation runs on a subsequent import, **Then** the reactivated rule is applied again.
4. **Given** the rules management screen is open, **Then** no delete action is available for any rule; deactivation is the only removal action.
5. **Given** the rules management screen is open, **When** a rule's target category has been deactivated, **Then** the rule is shown with a visual indicator that its category is inactive, and the rule is treated as inactive for auto-categorisation regardless of the rule's own status field.

---

### Edge Cases

- What happens when a user-defined rule pattern is a single character or whitespace only? (A minimum pattern length of one non-whitespace character is enforced; whitespace-only patterns are rejected at input with an inline error.)
- What happens when two user-defined rules have identical patterns pointing to different categories? (Both are stored; at categorisation time the most recently created rule wins, consistent with the tiebreaker for pattern-length ties.)
- What happens when a user-defined rule matches a transaction that was previously auto-categorised using the default map and already committed? (Existing committed transactions are not retroactively re-categorised; rules apply only during active import sessions.)
- What happens if the rule prompt is shown but the session ends before the user responds? (The already-committed override is preserved; no partial rule record is written.)
- What happens when the user attempts to save a rule with the same pattern and category as an existing active rule? (A duplicate warning is shown; the user is informed the rule already exists and a new record is not created.)
- What happens when a user-defined rule's category is subsequently deactivated and then reactivated? (While deactivated the rule is suspended; upon reactivation of the category the rule becomes effective again without further user action.)
- What happens when a rule pattern exactly matches a description that appears in the skip list (e.g. "OPENING BALANCE")? (The skip list is evaluated before categorisation; skipped rows never reach the categoriser, so the rule would never fire — but saving it is not prohibited.)

## Requirements *(mandatory)*

### Functional Requirements

**Keyword Rule Prompt (Override Flow)**

- **FR-101**: When a category override is saved by the user, the app MUST commit the override to the master ledger before presenting the keyword rule prompt.
- **FR-102**: The keyword rule prompt MUST be presented after every successful category override; it MUST be non-blocking and dismissible without any penalty to the committed override.
- **FR-103**: The keyword rule prompt MUST pre-fill the pattern field with the full transaction description of the overridden transaction.
- **FR-104**: The keyword rule prompt MUST pre-fill the category field with the category that was just applied in the override.
- **FR-105**: The user MUST be able to edit the pre-filled pattern before confirming; the edited pattern is what is saved.
- **FR-106**: The app MUST prevent saving a keyword rule with an empty or whitespace-only pattern; the confirm action MUST be disabled and an inline error shown when the pattern field is empty or contains only whitespace.
- **FR-107**: When the user confirms the rule prompt, a keyword rule record MUST be appended to the master ledger.
- **FR-108**: When the user dismisses the rule prompt, no keyword rule record is written; the master ledger remains unchanged except for the already-committed override.

**Duplicate Rule Detection**

- **FR-109**: Before saving a new keyword rule, the app MUST check whether an active keyword rule with an identical pattern (case-insensitive comparison) and identical category already exists in the master ledger.
- **FR-110**: If an identical active rule exists, the app MUST display an inline warning to the user and NOT write a duplicate record; the user MUST be informed which existing rule conflicts.

**Auto-Categorisation Precedence**

- **FR-111**: During auto-categorisation, the app MUST evaluate all active user-defined keyword rules before consulting the default keyword map.
- **FR-112**: A transaction MUST be assigned the category from the matching user-defined rule with the longest pattern; if two active rules share identical pattern length, the most recently created rule takes precedence. The default keyword map MUST NOT be consulted for that transaction.
- **FR-113**: A transaction that matches no active user-defined rule MUST be categorised using the existing default keyword map logic, unchanged.
- **FR-114**: A user-defined keyword rule whose target category is deactivated MUST be treated as inactive for the purposes of auto-categorisation, regardless of the rule's own status field.
- **FR-115**: Rule matching MUST use the same case-insensitive substring logic as the existing default-map categoriser: a rule fires if the rule pattern appears anywhere within the transaction description, case-insensitively.
- **FR-116**: User-defined rules MUST NOT retroactively re-categorise transactions already committed to the master ledger; rules apply only at the point of categorisation during an active import session.

**Keyword Rule Persistence**

- **FR-117**: Keyword rule records MUST be stored in the master ledger as a new record type `keywordRule`, with fields: type, pattern, category, createdDate, status (active/inactive).
- **FR-118**: Keyword rule records MUST follow the master ledger's append-only constraint; existing records MUST never be modified or deleted.
- **FR-119**: Deactivating or reactivating a keyword rule MUST append a new `keywordRule` record with the updated status; the prior record is unchanged; the most recent record for a given pattern is authoritative.

**Keyword Rule Management Screen**

- **FR-120**: A dedicated keyword rules management screen MUST list all keyword rule records in the master ledger, showing pattern, target category, creation date, and current status (active/inactive).
- **FR-121**: The management screen MUST provide the ability to deactivate an active rule and reactivate an inactive rule.
- **FR-122**: The management screen MUST NOT provide a delete action for any keyword rule.
- **FR-123**: Rules whose target category is currently deactivated MUST be visually distinguished on the management screen to indicate they will not fire during auto-categorisation.

### Key Entities

- **KeywordRule**: A user-defined mapping from a description substring pattern to a category. Attributes: pattern (case-insensitive substring to match), category, createdDate, status (active/inactive). Multiple records may exist for the same pattern (one per status-change event); the most recent record for a given pattern is authoritative. Cannot be deleted. Takes precedence over the built-in default keyword map during auto-categorisation when active.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-101**: After a category override and rule save, the next import containing a transaction whose description includes the saved pattern is auto-categorised to the rule's category with no user intervention required.
- **SC-102**: A category override always completes and is visible in the transaction list within the same interaction, regardless of whether the user engages with the keyword rule prompt.
- **SC-103**: The keyword rule prompt requires no more than two interactions to either save a rule (edit if desired, then confirm) or dismiss it (a single dismiss action).
- **SC-104**: All active user-defined keyword rules are visible in the management screen; a user can deactivate a rule, import a matching transaction, and confirm the rule no longer fires — all within a single session without reloading the app.
- **SC-105**: No transaction already present in the master ledger changes category as a result of a new keyword rule being saved, modified, or deactivated.

## Assumptions

- Keyword rules are created exclusively through the category-override prompt flow in v1; a direct "add rule" action from the management screen is out of scope.
- The categoriser evaluates user-defined rules ordered by descending pattern length, with most-recently-created as the tiebreaker; no weighting or scoring beyond these two criteria is applied.
- Retroactive re-categorisation of committed transactions using new or modified keyword rules is explicitly out of scope for this feature.
- The rule prompt is presented as a non-modal, inline action (e.g. a dismissible card or inline panel) rather than a blocking dialog, to preserve the non-blocking requirement.
- Pattern matching uses the same algorithm as the existing categoriser: the rule pattern is a literal case-insensitive substring; no wildcard or regex syntax is supported in v1.
- A minimum pattern length of one non-whitespace character is enforced; patterns consisting entirely of whitespace are rejected at the point of input.
- The `keywordRule` record type is added to the master ledger as its seventh record type, extending FR-032 of the 001-csv-budget-tracker spec.
- Duplicate detection (FR-109) prevents saving identical active rules; it does not prevent storing two rules with the same pattern pointing to different categories.
- The management screen is accessible from the same navigation area as the category management and people management screens.
