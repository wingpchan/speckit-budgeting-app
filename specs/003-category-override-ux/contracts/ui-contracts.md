# UI Contracts: Post-Commit Transaction Category Override UX

## Affected Components

---

### TransactionList

**File**: `src/components/import/TransactionList.tsx`
**Props**: unchanged — `{ transactions, categories, onRefresh }`

#### Category Cell (revised)

Each transaction row's category cell MUST render:

```
<td>
  <span>{tx.category}</span>          // plain text, non-interactive
  <button onClick={() => handleEditTrigger(tx)}>Edit</button>
</td>
```

- The `<select>` is REMOVED from the row.
- The "Edit" button MUST be visible in the default (non-hover) row state.
- The `<button>` label "Edit" is the implementation default; an accessible equivalent is acceptable.

#### Edit Trigger Handler

```
handleEditTrigger(tx: TransactionRecord): void
  sets pending = { transaction: tx, fromCategory: tx.category }
  sets pendingCategory = tx.category
```

#### Confirmation Modal (revised)

The modal renders when `pending !== null`. It now includes the category selector:

```
Modal content:
  - Heading: "Change Category"
  - Context line: tx.description (so user knows which transaction)
  - Current category label: pending.fromCategory
  - <select>
      value={pendingCategory}
      onChange={(e) => setPendingCategory(e.target.value)}
      options: [pinned inactive if not active] + sortedActiveCategories
  - Error display (if overrideError)
  - Cancel button  → clears pending + pendingCategory
  - Confirm button → disabled when pendingCategory === pending.fromCategory OR isOverriding
                     label: isOverriding ? "Saving…" : "Confirm"
```

The `<select>` in the modal uses the same option-building logic as the old inline select:
- Pinned option at position 0 for `pending.fromCategory` if it is NOT in `sortedActiveCategories`
- `sortedActiveCategories` options follow in alphabetical order

#### Confirm Handler

```
handleConfirmOverride(): async void
  guard: if (!pending || pendingCategory === pending.fromCategory || !state.dirHandle) return
  await overrideCategory(pending.transaction, pendingCategory, state.dirHandle)
  const overriddenTx = { ...pending.transaction, category: pendingCategory }
  setPending(null)
  setPendingCategory('')
  setRulePromptFor(overriddenTx)
  setRuleSaveWarning('')
  await onRefresh?.()
```

---

### Layout

**File**: `src/components/shared/Layout.tsx`

`ViewId` type gains `'transactions'`:

```ts
export type ViewId =
  | 'import' | 'summaries' | 'budgets' | 'categories'
  | 'people' | 'transactions' | 'search' | 'export'
```

Default view remains `'import'`.

---

### NavBar

**File**: `src/components/shared/NavBar.tsx`

`NAV_LINKS` gains a "Transactions" entry. "Search" remains but is future-reserved:

```ts
const NAV_LINKS = [
  { id: 'import',        label: 'Import' },
  { id: 'summaries',     label: 'Summaries' },
  { id: 'budgets',       label: 'Budgets' },
  { id: 'categories',    label: 'Categories' },
  { id: 'people',        label: 'People' },
  { id: 'transactions',  label: 'Transactions' },   // NEW
  { id: 'search',        label: 'Search' },
  { id: 'export',        label: 'Export' },
]
```

---

### App

**File**: `src/App.tsx`

Route mapping in the `(currentView, navigate)` switch:

```ts
case 'transactions':
  return <TransactionsScreen />;
case 'search':
  return <ViewPlaceholder name="Search" />;    // was TransactionsScreen
```

Import-success navigation updated:

```tsx
<ImportScreen onNavigate={navigate} />
// ImportScreen onNavigate('transactions') replaces onNavigate('search')
```

`ImportScreen` `onNavigate` prop type updated from `(view: 'search') => void` to `(view: 'transactions') => void`.

---

## Test Contracts

### Pure-logic helpers to extract and test

```ts
// Can the Confirm button be activated?
function canConfirmOverride(fromCategory: string, pendingCategory: string): boolean {
  return pendingCategory !== fromCategory;
}

// What options appear in the modal selector?
// (Same as existing resolveDropdownOptions but driven by fromCategory instead of tx.category)
function resolveModalSelectorOptions(
  fromCategory: string,
  activeCategories: CategoryRecord[],
): string[]
```

These functions MUST be tested before the component is updated.

### Test scenarios (to add to `transaction-list-categories.test.ts`)

1. `canConfirmOverride('Groceries', 'Groceries')` → `false`
2. `canConfirmOverride('Groceries', 'Shopping')` → `true`
3. `resolveModalSelectorOptions` with active fromCategory: all active options, no pin
4. `resolveModalSelectorOptions` with inactive fromCategory: pinned at position 0
5. After edit trigger fires: `pending.fromCategory === tx.category` and `pendingCategory === tx.category`
6. After modal cancel: `pending === null` and `pendingCategory === ''`
