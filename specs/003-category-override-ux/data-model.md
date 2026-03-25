# Data Model: Post-Commit Transaction Category Override UX

## Ledger Records

**No ledger schema changes.** This feature is a pure UI interaction-layer change. The `transaction` record and all other record types remain unchanged (constitution v1.6.0).

---

## UI State Model

### TransactionList component state (revised)

The existing `PendingOverride` interface is simplified. `toCategory` is removed because the modal now holds the selection; the edit trigger only supplies the transaction and its current category.

```
PendingOverride {
  transaction: TransactionRecord   // the row being edited
  fromCategory: string             // current category at the time edit was triggered
}
```

New state variable added alongside `pending`:

```
pendingCategory: string            // the category currently selected in the modal's selector
                                   // initialised to fromCategory when edit trigger is clicked
                                   // updated on every modal-select onChange event
```

**State transitions:**

```
idle
  → edit trigger clicked
      → setPending({ transaction, fromCategory: tx.category })
      → setPendingCategory(tx.category)
      → modal visible

modal open
  → user selects different category in modal selector
      → setPendingCategory(newCategory)
      → Confirm button: enabled when pendingCategory !== fromCategory

  → user clicks Cancel / closes modal
      → setPending(null)
      → setPendingCategory('')
      → modal hidden, transaction unchanged

  → user clicks Confirm (pendingCategory !== fromCategory)
      → overrideCategory(transaction, pendingCategory, dirHandle)
      → setPending(null)
      → setPendingCategory('')
      → setRulePromptFor(overriddenTx)   // triggers keyword-rule prompt (feature 002)
      → onRefresh()
```

### ViewId (Layout)

The `ViewId` union gains one new member:

```
type ViewId = 'import' | 'summaries' | 'budgets' | 'categories'
            | 'people' | 'transactions' | 'search' | 'export'
```

`'transactions'` hosts `TransactionsScreen` (previously on `'search'`).
`'search'` is retained as a future-reserved placeholder.

---

## Component Interfaces (unchanged externally)

`TransactionList` props are unchanged:

```
TransactionListProps {
  transactions: TransactionRecord[]
  categories:   CategoryRecord[]
  onRefresh?:   () => Promise<void>
}
```

The change is entirely internal to the component's JSX and state.
