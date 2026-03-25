# Data Model: Keyword Rule Prompt in Import Staging View

## Ledger Records

**No ledger schema changes.** The `keywordRule` record type was introduced in feature 002 and is fully specified in the constitution (v1.6.0). This feature writes `keywordRule` records using the existing append path — no new record type, no new fields, no migration.

---

## UI State Model

### StagingView component state (additions)

Two new state variables are added alongside the existing `categoryOverrides`:

```
rulePromptFor: {
  rowIndex:    number   // index into categorisedRows for the changed row
  description: string  // transaction description (pre-fills prompt pattern)
  category:    string  // the newly selected category (pre-fills prompt target)
} | null               // null = no prompt visible

ruleSaveWarning: string  // duplicate warning message from useKeywordRules.saveRule
                         // empty string = no warning
                         // reset to '' whenever rulePromptFor changes
```

**State transitions:**

```
idle (rulePromptFor = null)
  → user selects a different category on row i
      → newCategory !== categorisedRows[i].category
      → setRulePromptFor({ rowIndex: i, description: row.description, category: newCategory })
      → setRuleSaveWarning('')
      → prompt visible below row i

prompt visible
  → user selects a category on a different row j
      → setRulePromptFor({ rowIndex: j, ... })      // replaces previous prompt
      → setRuleSaveWarning('')

  → user reverts row i's dropdown to its auto-assigned category
      → newCategory === categorisedRows[i].category
      → setRulePromptFor(null)
      → setRuleSaveWarning('')
      → prompt dismissed, no rule written

  → user clicks Dismiss
      → setRulePromptFor(null)
      → setRuleSaveWarning('')
      → no rule written

  → user clicks Confirm (pattern non-empty, no duplicate)
      → saveRule(pattern, category)    // writes keywordRule to ledger immediately
      → setRulePromptFor(null)
      → setRuleSaveWarning('')
      → prompt dismissed

  → user clicks Confirm (duplicate rule exists)
      → saveRule returns 'duplicate'
      → setRuleSaveWarning('An active rule for this pattern and category already exists.')
      → prompt remains open (duplicate warning shown)

  → user clicks Confirm Import (import proceeds)
      → onConfirm(categoryOverrides) called
      → StagingView unmounts
      → rulePromptFor discarded (no rule written from prompt)
```

### Existing state (unchanged)

```
categoryOverrides: Record<number, string>
  // per-row category overrides; passed to onConfirm regardless of prompt state
```

---

## Component Props (unchanged externally)

`StagingView` props are unchanged from the previous session's `keywordRules` addition:

```
StagingViewProps {
  rows:          ParsedRow[]
  account:       string
  detectedProfile: string | null
  categories:    CategoryRecord[]
  keywordRules?: KeywordRuleRecord[]        // already present — used for keyword index
  onConfirm:     (overrides: Record<number, string>) => void
  onCancel:      () => void
  isConfirming:  boolean
}
```

The change is entirely internal: adding `useKeywordRules()`, new state, and inline `KeywordRulePrompt` rendering.
