# UI Contracts: User-Defined Keyword Rules

**Branch**: `002-user-keyword-rules` | **Date**: 2026-03-21

---

## Component: `KeywordRulePrompt`

**File**: `src/components/rules/KeywordRulePrompt.tsx`

**Purpose**: Inline, non-blocking card rendered below an overridden transaction row. Allows the user to optionally save a keyword rule derived from the override. Appears after the category override is committed; dismissal has no side effects.

### Props

```typescript
interface KeywordRulePromptProps {
  /** The description of the just-overridden transaction — pre-fills the pattern field */
  transactionDescription: string;

  /** The category that was just applied — pre-fills the category field (read-only display) */
  category: string;

  /**
   * Called when the user confirms. The component validates before calling this.
   * @param pattern The (possibly edited) pattern to save
   * @param category The target category (always equals the override category for v1)
   */
  onConfirm: (pattern: string, category: string) => Promise<void>;

  /**
   * Called when the user dismisses the prompt without saving.
   * No rule is written; the committed override is unaffected.
   */
  onDismiss: () => void;

  /**
   * If provided and non-empty, the component displays this as an inline warning
   * (e.g. "An active rule for this pattern and category already exists.")
   * and the Confirm button remains disabled.
   */
  duplicateWarning?: string;

  /** When true, the Confirm button shows a loading state and is disabled */
  isSaving?: boolean;
}
```

### Behaviour Contract

| Condition | UI State |
|-----------|----------|
| Pattern field is empty or whitespace-only | Confirm button disabled; inline error: "Pattern cannot be empty" |
| `duplicateWarning` is set | Confirm button disabled; warning displayed below pattern field |
| `isSaving` is true | Confirm button shows loading indicator; all inputs disabled |
| Normal state | Confirm and Dismiss both enabled |

### Layout Contract

- Rendered as an inline card (not a modal) directly below the overridden row.
- Card contains: description of the transaction (read-only context), an editable pattern `<input>`, a read-only category label, a Confirm button, and a Dismiss button.
- Dismiss requires a single click — no confirmation required.
- The rest of the `TransactionList` remains interactive while the card is visible.

---

## Component: `KeywordRulesScreen`

**File**: `src/components/rules/KeywordRulesScreen.tsx`

**Purpose**: Management screen listing all keyword rules. Accessible from the main navigation alongside Category Management and People screens.

### Props

```typescript
interface KeywordRulesScreenProps {
  /** All keyword rules derived from ledger (most-recent-per-pattern, sorted by createdDate desc) */
  rules: ResolvedKeywordRule[];

  /** All current categories (active and inactive) — used to flag rules with deactivated categories */
  categories: CategoryRecord[];

  /**
   * Called when the user toggles a rule's status.
   * Implementor appends a new keywordRule record to the ledger.
   */
  onToggleStatus: (pattern: string, newStatus: 'active' | 'inactive') => Promise<void>;
}

interface ResolvedKeywordRule {
  pattern: string;
  category: string;
  createdDate: string;
  status: 'active' | 'inactive';
  /** True if the target category is currently inactive — rule will not fire */
  categoryIsInactive: boolean;
}
```

### Behaviour Contract

| Condition | UI State |
|-----------|----------|
| `categoryIsInactive === true` | Rule row shows a visual indicator (e.g. muted style + "(category inactive)" label); Deactivate/Activate toggle still available |
| Rule `status === 'active'` | Shows "Deactivate" action |
| Rule `status === 'inactive'` | Shows "Activate" action |
| No rules saved yet | Empty state message: e.g. "No keyword rules saved yet. Override a transaction category to create one." |
| No delete action | No delete button or option rendered for any rule |

### Column Layout Contract

| Column | Content |
|--------|---------|
| Pattern | The substring pattern (as saved) |
| Category | Target category name; muted if category is inactive |
| Created | `createdDate` formatted as human-readable date |
| Status | "Active" / "Inactive" badge |
| Action | "Deactivate" or "Activate" button |

---

## Hook: `useKeywordRules`

**File**: `src/hooks/useKeywordRules.ts`

**Purpose**: Provides access to resolved keyword rules and the save/toggle functions to all consumers.

### Interface

```typescript
interface UseKeywordRulesReturn {
  /** Resolved rules: most-recent per pattern, sorted by createdDate desc */
  rules: ResolvedKeywordRule[];

  /**
   * Save a new keyword rule to the ledger.
   * Returns 'saved' if successful, 'duplicate' if an identical active rule already exists.
   */
  saveRule: (pattern: string, category: string) => Promise<'saved' | 'duplicate'>;

  /** Toggle a rule's active/inactive status by appending a new ledger record */
  toggleStatus: (pattern: string, newStatus: 'active' | 'inactive') => Promise<void>;

  /** Whether a rule operation is in flight */
  isSaving: boolean;
}
```

---

## Service: `keyword-rules.service.ts`

**File**: `src/services/categoriser/keyword-rules.service.ts`

**Purpose**: Encapsulates all keyword rule ledger operations. Analogous to `category-override.service.ts`.

### Interface

```typescript
/**
 * Append a new keywordRule record to the master ledger.
 * Does not check for duplicates — caller is responsible for pre-checking via isDuplicateRule().
 */
export async function saveKeywordRule(
  pattern: string,
  category: string,
  dirHandle: FileSystemDirectoryHandle,
  appendFn?: (rows: string[]) => Promise<void>,
): Promise<void>

/**
 * Check whether an active rule with the same pattern (case-insensitive) and category already exists.
 * Returns true if a duplicate is found.
 */
export function isDuplicateRule(
  pattern: string,
  category: string,
  existingRules: ResolvedKeywordRule[],
): boolean

/**
 * Append a new keywordRule record to deactivate or reactivate an existing rule.
 * The prior record is unchanged (append-only).
 */
export async function setKeywordRuleStatus(
  pattern: string,
  category: string,
  status: 'active' | 'inactive',
  dirHandle: FileSystemDirectoryHandle,
  appendFn?: (rows: string[]) => Promise<void>,
): Promise<void>

/**
 * Resolve raw keywordRule records from the ledger into one authoritative record per pattern.
 * Groups by lowercased pattern, takes the most recent createdDate per group.
 */
export function resolveKeywordRules(rawRecords: KeywordRuleRecord[]): ResolvedKeywordRule[]
```

---

## `TransactionList.tsx` Integration Point

The existing confirmation modal's `onConfirm` handler is the integration point:

```
Current flow:
  user selects category → PendingOverride set → confirm modal opens
  → modal confirmed → overrideCategory() called → modal closed → list refresh

New flow:
  user selects category → PendingOverride set → confirm modal opens
  → modal confirmed → overrideCategory() called → KeywordRulePrompt card shown
  → user confirms rule → saveKeywordRule() called → card dismissed → list refresh
  OR
  → user dismisses card → card dismissed → list refresh (override already committed)
```

**State additions to `TransactionList.tsx`**:

```typescript
// Tracks which transaction (by its composite key) currently has the rule prompt open
const [rulePromptFor, setRulePromptFor] = useState<TransactionRecord | null>(null);
const [ruleSaveWarning, setRuleSaveWarning] = useState<string>('');
```
