# UI Contracts: Keyword Rule Prompt in Import Staging View

## Affected Components

---

### StagingView

**File**: `src/components/import/StagingView.tsx`
**Props**: unchanged — `{ rows, account, detectedProfile, categories, keywordRules?, onConfirm, onCancel, isConfirming }`

#### New imports

```ts
import { useState, Fragment } from 'react';       // Fragment already needed
import { useKeywordRules } from '../../hooks/useKeywordRules';
import { KeywordRulePrompt } from '../rules/KeywordRulePrompt';
```

#### New hook call (inside component)

```ts
const { saveRule, isSaving: isRuleSaving } = useKeywordRules();
```

#### New state variables (inside component)

```ts
const [rulePromptFor, setRulePromptFor] = useState<{
  rowIndex: number;
  description: string;
  category: string;
} | null>(null);

const [ruleSaveWarning, setRuleSaveWarning] = useState<string>('');
```

#### Category change handler (replaces inline onChange)

```ts
function handleCategoryChange(i: number, newCategory: string, autoCategory: string): void {
  setCategoryOverrides((prev) => ({ ...prev, [i]: newCategory }));
  if (newCategory !== autoCategory) {
    setRulePromptFor({ rowIndex: i, description: categorisedRows[i].description, category: newCategory });
    setRuleSaveWarning('');
  } else {
    // Reverted to auto-assigned — dismiss prompt
    setRulePromptFor(null);
    setRuleSaveWarning('');
  }
}
```

#### Rule confirm handler

```ts
async function handleRuleConfirm(pattern: string, category: string): Promise<void> {
  const result = await saveRule(pattern, category);
  if (result === 'duplicate') {
    setRuleSaveWarning('An active rule for this pattern and category already exists.');
  } else {
    setRulePromptFor(null);
    setRuleSaveWarning('');
  }
}
```

#### Rule dismiss handler

```ts
function handleRuleDismiss(): void {
  setRulePromptFor(null);
  setRuleSaveWarning('');
}
```

#### tbody rendering (revised)

Each `<tr>` in `categorisedRows.map` is wrapped in a `<Fragment>`. The `<select>` onChange is delegated to `handleCategoryChange`. A `KeywordRulePrompt` row follows each data row when that row's index matches `rulePromptFor?.rowIndex`:

```tsx
<tbody className="divide-y divide-gray-100">
  {categorisedRows.map((row, i) => (
    <Fragment key={i}>
      <tr className="hover:bg-gray-50">
        {/* ...date, description, amount cells unchanged... */}
        <td className="px-3 py-2">
          <select
            value={categoryOverrides[i] ?? row.category}
            onChange={(e) => handleCategoryChange(i, e.target.value, row.category)}
            className="text-sm text-gray-700 border border-gray-200 rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            {activeCategories.map((cat) => (
              <option key={cat.name} value={cat.name}>{cat.name}</option>
            ))}
          </select>
        </td>
      </tr>
      {rulePromptFor?.rowIndex === i && (
        <tr>
          <td colSpan={4} className="p-0">
            <KeywordRulePrompt
              transactionDescription={rulePromptFor.description}
              category={rulePromptFor.category}
              onConfirm={handleRuleConfirm}
              onDismiss={handleRuleDismiss}
              duplicateWarning={ruleSaveWarning || undefined}
              isSaving={isRuleSaving}
            />
          </td>
        </tr>
      )}
    </Fragment>
  ))}
</tbody>
```

---

## Test Contracts

### Pure-logic helpers to extract and test

```ts
// Should the rule prompt appear for this category change?
function shouldShowRulePrompt(newCategory: string, autoCategory: string): boolean {
  return newCategory !== autoCategory;
}
```

### Test scenarios (to add to `transaction-list-categories.test.ts`)

1. `shouldShowRulePrompt('Shopping', 'Groceries')` → `true` (different → prompt)
2. `shouldShowRulePrompt('Groceries', 'Groceries')` → `false` (same → no prompt)
3. `shouldShowRulePrompt('', 'Uncategorised')` → `true` (edge: empty new category — prompt shown; validation is prompt's responsibility)
4. After `handleCategoryChange(i, newCategory, autoCategory)` with `newCategory !== autoCategory`: `rulePromptFor.rowIndex === i` and `rulePromptFor.category === newCategory`
5. After `handleCategoryChange(i, autoCategory, autoCategory)`: `rulePromptFor === null`
6. After changing row j while prompt is open for row i: `rulePromptFor.rowIndex === j`
7. After `handleRuleDismiss()`: `rulePromptFor === null` and `ruleSaveWarning === ''`
8. After `handleRuleConfirm` returns `'duplicate'`: `ruleSaveWarning` non-empty, `rulePromptFor` unchanged
9. After `handleRuleConfirm` returns `'saved'`: `rulePromptFor === null` and `ruleSaveWarning === ''`
