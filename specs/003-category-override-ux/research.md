# Research: Post-Commit Transaction Category Override UX

## Overview

No external unknowns require investigation. This feature is a pure UI interaction refactor within an existing React component. All decisions are resolved by the existing codebase and the feature spec.

---

## Decision 1: Edit Trigger Form

**Decision**: Use a small labelled button ("Edit") rather than an icon-only trigger.

**Rationale**: The spec (FR-008) requires the edit trigger to be visible without hover interaction. A labelled button satisfies discoverability without requiring an icon library or custom SVG — consistent with the project's Tailwind-only styling approach (Principle V: Simplicity, no new dependencies).

**Alternatives considered**:
- Pencil icon (SVG inline): discoverable, but requires custom icon or icon library dependency. Rejected — no icon library is in the approved stack.
- Hover-reveal button: violates FR-008 (must be visible in default state). Rejected.
- Text link ("change"): acceptable but less obviously interactive than a button. Kept as a fallback if the "Edit" button reads as too prominent.

---

## Decision 2: Modal Category Selector State

**Decision**: Introduce a separate `pendingCategory: string` state variable (initialized to `tx.category` when the edit trigger is activated) to track the user's in-modal selection independently from `pending.toCategory`.

**Rationale**: The existing `PendingOverride.toCategory` was pre-set by the inline `<select>` before the modal opened. With the selector now inside the modal, `toCategory` cannot be known until the user interacts with the selector. Initialising `pendingCategory` to the current category ensures the modal opens in a sensible pre-selected state and the Confirm button is correctly disabled until a different category is chosen.

**Alternatives considered**:
- Keep `toCategory` in `PendingOverride` and update it on each modal-select change: works, but mutating an object inside `useState` is less idiomatic; a separate flat state is simpler and easier to test.
- Open modal with no pre-selection (blank / placeholder): violates FR-004 (must show current category). Rejected.

---

## Decision 3: Confirm Button Guard

**Decision**: Disable the Confirm button when `pendingCategory === pending.fromCategory`.

**Rationale**: FR-006 states that selecting the same category must result in a no-op or a disabled Confirm. Disabling is the simpler approach — no write attempted, no error to surface, and the button state communicates intent clearly.

**Alternatives considered**:
- Allow confirm with same category and skip the write in `handleConfirmOverride`: works but writes to the ledger on a false positive. Rejected for cleanliness.
- Show a warning message: more complex, no added value. Rejected.

---

## Decision 4: Navigation Rename (Search → Transactions)

**Decision**: Add `'transactions'` as a new `ViewId` value. Map the existing `TransactionsScreen` to `case 'transactions'`. Add a "Transactions" nav item. The existing `'search'` view ID is retained in the union but mapped to a `ViewPlaceholder` ("Coming in a future phase.").

**Rationale**: The user note explicitly states Search is reserved for future search/filter functionality. Adding a new view ID is the minimal change — it avoids renaming existing state or breaking any navigation links already used (e.g., the `onNavigate('search')` call added in the previous session is stale and can simply be updated to `onNavigate('transactions')`).

**Alternatives considered**:
- Rename `'search'` to `'transactions'` throughout: would require updating all string literals including the import-success navigation added in the prior session. More invasive than necessary.
- Keep `'search'` as the Transactions host and add a new 'search' variant: confusing semantics. Rejected.

---

## Summary of Resolved Decisions

| # | Topic | Decision |
|---|-------|----------|
| 1 | Edit trigger form | Labelled "Edit" button (no icon library) |
| 2 | Modal selector state | Separate `pendingCategory` state, initialised to current category |
| 3 | Confirm guard | Disabled when `pendingCategory === fromCategory` |
| 4 | Nav rename | New `'transactions'` ViewId; `'search'` kept as placeholder |
