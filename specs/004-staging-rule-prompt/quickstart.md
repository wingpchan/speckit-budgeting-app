# Quickstart: Keyword Rule Prompt in Import Staging View

## Prerequisites

- A folder with an existing `budget-ledger.csv` (may be empty of transactions, but must have the header row).
- At least one category record in the ledger (e.g. the 20 default categories).
- A CSV file ready to import with at least one transaction whose description does NOT match any existing keyword rule (so the auto-categorisation falls to the default map or Uncategorised).
- Chrome or Edge browser.

---

## Scenario 1 — Rule prompt appears after staging category change

1. Open the app and choose the folder. Navigate to **Import**.
2. Select the CSV file. Step through detection, account labelling, and person assignment until the **Review Transactions** staging screen appears.
3. Locate a transaction whose auto-assigned category is (e.g.) "Uncategorised".
4. Change its category dropdown to "Groceries".
5. **Verify**: A keyword rule prompt appears inline below that row immediately.
6. **Verify**: The prompt's pattern field is pre-filled with the transaction description.
7. **Verify**: The prompt shows "Groceries" as the target category.

---

## Scenario 2 — Confirm rule saves before import is confirmed

1. Following Scenario 1, click **Confirm** in the keyword rule prompt (without editing the pattern).
2. **Verify**: The prompt disappears. The category dropdown for the row still shows "Groceries".
3. **Do NOT click Confirm Import yet.**
4. Open a new browser tab (or reload the app in the same folder). Navigate to the keyword rules management screen.
5. **Verify**: The newly saved rule appears in the list with the transaction description as pattern and "Groceries" as category.
6. Return to the first tab. Click **Confirm Import**.
7. **Verify**: Import completes successfully. The transaction is committed with category "Groceries".

---

## Scenario 3 — Dismiss leaves category override intact

1. On the staging screen, change a transaction's category to a different value.
2. **Verify**: Rule prompt appears.
3. Click **Dismiss** in the rule prompt.
4. **Verify**: The prompt disappears. The category dropdown still shows the overridden value.
5. Click **Confirm Import**.
6. **Verify**: Import completes. The transaction is committed with the overridden category (not the auto-assigned one). No rule was saved (verify by checking the keyword rules management screen).

---

## Scenario 4 — Reverting to auto-assigned category dismisses prompt

1. On the staging screen, change a transaction's category dropdown from its auto-assigned value (e.g. "Groceries") to a different value (e.g. "Shopping").
2. **Verify**: Rule prompt appears for "Shopping".
3. Change the same row's dropdown back to "Groceries" (the original auto-assigned value).
4. **Verify**: The rule prompt disappears without saving anything.

---

## Scenario 5 — Changing a different row replaces the prompt

1. On the staging screen with at least two rows, change the first row's category.
2. **Verify**: Rule prompt appears for the first row.
3. Change the second row's category.
4. **Verify**: The prompt for the first row disappears and a new prompt appears for the second row.

---

## Scenario 6 — Confirm Import without engaging the rule prompt

1. On the staging screen, change a transaction's category.
2. **Verify**: Rule prompt appears.
3. Without clicking Confirm or Dismiss in the prompt, click **Confirm Import**.
4. **Verify**: Import completes. No rule was saved (verify by checking the keyword rules management screen).

---

## Scenario 7 — Duplicate rule warning

1. Save a rule for a description (e.g. "TESCO") → "Groceries" either via a previous import or the keyword rules management screen.
2. Start a new import. On the staging screen, change a transaction with "TESCO" in its description from "Groceries" to "Groceries" — wait, it must already be "Groceries". Instead, change it to "Shopping", then the rule prompt appears for "Shopping". Dismiss.
3. Now change the same row's category back to "Uncategorised" (if "TESCO" mapped to "Groceries" auto, pick a description that auto-maps to "Uncategorised").
4. For a cleaner test: find a transaction that auto-maps to "Uncategorised". Change its category to "Groceries". If a rule for description → "Groceries" already exists: confirm the rule prompt. **Verify**: duplicate warning appears; no second rule written.

---

## Scenario 8 — Rule saved during staging is used on next import

1. On the staging screen, change a transaction's category and save the keyword rule.
2. Click **Cancel** (do not confirm the first import).
3. Start a second import with a CSV file containing a transaction whose description matches the saved rule's pattern.
4. On the staging screen for the second import, **verify**: the matching transaction is auto-categorised to the rule's category (not "Uncategorised" or the default map value).
