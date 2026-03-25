# Quickstart: Post-Commit Transaction Category Override UX

## Prerequisites

- A folder with an existing `budget-ledger.csv` containing at least one committed transaction and the 20 default categories.
- Chrome or Edge browser.

---

## Scenario 1 — Deliberate category override

1. Open the app and choose the folder. The app opens on the **Import** tab.
2. Click **Transactions** in the nav bar.
3. The transactions list loads. Verify: each row shows its category as plain text. **No dropdown or select is visible on any row.**
4. Locate any transaction. Verify: an **Edit** button is visible in the category cell without hovering.
5. Click **Edit** on a row whose category is e.g. "Uncategorised".
6. A modal opens. Verify: the modal heading is "Change Category"; the transaction description is shown; the category selector is pre-selected to "Uncategorised".
7. Change the selector to "Groceries". Verify: the Confirm button is now enabled.
8. Click **Confirm**. Verify: modal closes; the row now shows "Groceries"; no further errors.
9. Reload the app (choose the same folder again). Verify: the transaction still shows "Groceries".

---

## Scenario 2 — Cancel leaves transaction unchanged

1. From the Transactions view, click **Edit** on any row.
2. Change the category selector to a different value.
3. Click **Cancel**.
4. Verify: modal closes; the row still shows the original category; no ledger write occurred (reload to confirm).

---

## Scenario 3 — Confirm disabled when same category selected

1. Click **Edit** on any row. The selector opens pre-selected to the current category.
2. Without changing the selector, observe the **Confirm** button is disabled (greyed out, not clickable).
3. Change to a different category. Verify: Confirm becomes enabled.
4. Change back to the original category. Verify: Confirm becomes disabled again.

---

## Scenario 4 — Keyword rule prompt still fires after override (feature 002 regression)

1. Click **Edit** on a transaction and change its category.
2. Click **Confirm**. The modal closes.
3. Verify: an inline prompt appears below that transaction row offering to save a keyword rule for the new category.
4. Click **Dismiss**. Verify: prompt disappears; no rule saved; transaction keeps new category.

---

## Scenario 5 — Inactive category shown in modal

1. Deactivate a category from the Categories tab (if that tab is functional in the current build).
2. If a transaction exists with that now-inactive category, click its **Edit** button.
3. Verify: the inactive category appears as the pre-selected option in the modal selector (distinct position or label).
4. Verify: the active categories are listed as alternatives.

---

## Navigation Verification

1. Open the nav bar. Verify: "Transactions" appears as a distinct nav item.
2. Verify: "Search" also appears and shows "Coming in a future phase." when clicked.
3. After a successful import, click **View Transactions** on the success screen. Verify: it navigates to the Transactions view (not Search).
