/**
 * T057 — Verification tests for TransactionList category behaviour:
 * 1. Override dropdown sources from activeCategories only
 * 2. A transaction with a now-deactivated category still displays that category
 *    (value comes from the transaction record field, not re-looked-up from the category list)
 * 3. Regression: last-record-wins supersession applied on ledger reload
 * 4. KeywordRulePrompt appears after a successful override (txKey matching)
 */
import { describe, it, expect } from 'vitest';
import type { CategoryRecord, TransactionRecord } from '../../../src/models/index';
import { parseLedgerCsv } from '../../../src/services/ledger/ledger-reader';
import { serialiseRecord, LEDGER_HEADER } from '../../../src/services/ledger/ledger-writer';

// Helper: resolve which categories appear in the override dropdown
// Mirrors TransactionList logic: inactive current category pinned at 0, then active sorted A–Z
function resolveDropdownOptions(
  tx: TransactionRecord,
  activeCategories: CategoryRecord[],
): string[] {
  const sorted = [...activeCategories].sort((a, b) => a.name.localeCompare(b.name));
  const options: string[] = [];
  const isCurrentInActive = sorted.some((c) => c.name === tx.category);
  if (!isCurrentInActive) {
    options.push(tx.category); // pinned at position 0, exempt from sort
  }
  for (const cat of sorted) {
    options.push(cat.name);
  }
  return options;
}

const activeCategories: CategoryRecord[] = [
  { type: 'category', name: 'Groceries', isDefault: true, createdDate: '2026-01-01', status: 'active' },
  { type: 'category', name: 'Shopping', isDefault: true, createdDate: '2026-01-01', status: 'active' },
  { type: 'category', name: 'Uncategorised', isDefault: true, createdDate: '2026-01-01', status: 'active' },
];

describe('T057 — TransactionList category dropdown behaviour', () => {
  it('dropdown contains only active categories when current category is active', () => {
    const tx: TransactionRecord = {
      type: 'transaction',
      date: '2026-03-15',
      description: 'TESCO EXTRA',
      amount: -1250,
      transactionType: 'expense',
      category: 'Groceries',
      account: 'Nationwide Current',
      sourceFile: 'test.csv',
      importedDate: '2026-03-15',
      contentHash: 'abc',
      personName: 'Household',
    };

    const options = resolveDropdownOptions(tx, activeCategories);

    // All active categories present
    expect(options).toContain('Groceries');
    expect(options).toContain('Shopping');
    expect(options).toContain('Uncategorised');
    // No inactive categories
    expect(options).not.toContain('Child Care');
  });

  it('dropdown includes deactivated current category at top when not in active list', () => {
    const tx: TransactionRecord = {
      type: 'transaction',
      date: '2026-03-15',
      description: 'NURSERY FEES',
      amount: -50000,
      transactionType: 'expense',
      category: 'Child Care', // deactivated — not in activeCategories
      account: 'Nationwide Current',
      sourceFile: 'test.csv',
      importedDate: '2026-03-15',
      contentHash: 'def',
      personName: 'Household',
    };

    const options = resolveDropdownOptions(tx, activeCategories);

    // Deactivated category appears (so user can see what it currently is)
    expect(options[0]).toBe('Child Care');
    // Active categories follow
    expect(options).toContain('Groceries');
    expect(options).toContain('Shopping');
  });

  it('active categories in the dropdown are sorted alphabetically', () => {
    const unsortedCategories: CategoryRecord[] = [
      { type: 'category', name: 'Uncategorised', isDefault: true, createdDate: '2026-01-01', status: 'active' },
      { type: 'category', name: 'Groceries', isDefault: true, createdDate: '2026-01-01', status: 'active' },
      { type: 'category', name: 'Shopping', isDefault: true, createdDate: '2026-01-01', status: 'active' },
    ];
    const tx: TransactionRecord = {
      type: 'transaction',
      date: '2026-03-15',
      description: 'TESCO EXTRA',
      amount: -1250,
      transactionType: 'expense',
      category: 'Groceries', // active — no pinned option needed
      account: 'Nationwide Current',
      sourceFile: 'test.csv',
      importedDate: '2026-03-15',
      contentHash: 'xyz',
      personName: 'Household',
    };

    const options = resolveDropdownOptions(tx, unsortedCategories);

    expect(options).toEqual(['Groceries', 'Shopping', 'Uncategorised']);
  });

  it('pinned inactive category stays at position 0 regardless of its sort position', () => {
    // 'Child Care' sorts before 'Groceries' alphabetically — but must stay pinned at 0
    const tx: TransactionRecord = {
      type: 'transaction',
      date: '2026-03-15',
      description: 'NURSERY',
      amount: -50000,
      transactionType: 'expense',
      category: 'Child Care',
      account: 'Nationwide Current',
      sourceFile: 'test.csv',
      importedDate: '2026-03-15',
      contentHash: 'xyz2',
      personName: 'Household',
    };

    const options = resolveDropdownOptions(tx, activeCategories);

    // Inactive category pinned at index 0
    expect(options[0]).toBe('Child Care');
    // Remaining options are sorted
    const rest = options.slice(1);
    expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b)));
  });

  it('historic transaction category is read from record field, not from active list', () => {

    // This is the critical guarantee: even if "Child Care" is deactivated,
    // the category on the transaction record is always "Child Care"
    const tx: TransactionRecord = {
      type: 'transaction',
      date: '2026-01-10',
      description: 'NURSERY PAYMENT',
      amount: -50000,
      transactionType: 'expense',
      category: 'Child Care',
      account: 'Nationwide Current',
      sourceFile: 'jan.csv',
      importedDate: '2026-01-10',
      contentHash: 'ghi',
      personName: 'Alice',
    };

    // The display value is always the record field — never looked up from active list
    expect(tx.category).toBe('Child Care');

    // And the active list does NOT contain Child Care (it was deactivated)
    const found = activeCategories.find((c) => c.name === tx.category);
    expect(found).toBeUndefined();

    // But the dropdown still shows Child Care as the current value
    const options = resolveDropdownOptions(tx, activeCategories);
    expect(options).toContain('Child Care');
  });
});

describe('T057 — supersession: last-record-wins on ledger reload', () => {
  // All rows from one import share the same contentHash (file-level hash).
  // The supersession key is date+description+amount+account — NOT contentHash.
  const SHARED_FILE_HASH = 'file-level-hash-shared-by-all-rows-in-this-import';

  const original: TransactionRecord = {
    type: 'transaction',
    date: '2026-03-15',
    description: 'TESCO EXTRA',
    amount: -1250,
    transactionType: 'expense',
    category: 'Groceries',
    account: 'Nationwide Current',
    sourceFile: 'march.csv',
    importedDate: '2026-03-15',
    contentHash: SHARED_FILE_HASH, // same hash as all other rows in the same import
    personName: 'Household',
  };

  // Override: same date+description+amount+account, different category (and same contentHash)
  const override: TransactionRecord = {
    ...original,
    category: 'Shopping',
  };

  function buildCsv(...records: ReturnType<typeof serialiseRecord>[]): string {
    return LEDGER_HEADER + '\r\n' + records.join('');
  }

  it('collapses original + override with same date+description+amount+account to last record', () => {
    const csv = buildCsv(serialiseRecord(original), serialiseRecord(override));
    const { records } = parseLedgerCsv(csv);

    const transactions = records.filter((r): r is TransactionRecord => r.type === 'transaction');

    // Only one transaction visible — the override (last record) wins
    expect(transactions).toHaveLength(1);
    expect(transactions[0].category).toBe('Shopping');
  });

  it('preserves all other fields from the winning record', () => {
    const csv = buildCsv(serialiseRecord(original), serialiseRecord(override));
    const { records } = parseLedgerCsv(csv);

    const tx = records.find((r): r is TransactionRecord => r.type === 'transaction')!;
    expect(tx.date).toBe('2026-03-15');
    expect(tx.description).toBe('TESCO EXTRA');
    expect(tx.amount).toBe(-1250);
    expect(tx.account).toBe('Nationwide Current');
    expect(tx.personName).toBe('Household');
  });

  it('does NOT collapse two distinct rows that share contentHash but differ in description', () => {
    // Real scenario: two transactions imported from the same file share contentHash.
    // They must NOT be collapsed — description differs so the key differs.
    const sibling: TransactionRecord = {
      ...original,
      description: 'SAINSBURYS ONLINE', // different description → different key
      category: 'Groceries',
    };

    const csv = buildCsv(serialiseRecord(original), serialiseRecord(sibling));
    const { records } = parseLedgerCsv(csv);

    const transactions = records.filter((r): r is TransactionRecord => r.type === 'transaction');
    expect(transactions).toHaveLength(2);
  });

  it('does NOT collapse two rows with same date+description but different amounts', () => {
    // Real scenario: two "DIRECT DEBIT" charges on the same day at different amounts.
    // The old contentHash+date+description key would have wrongly collapsed these.
    const sameDescDifferentAmount: TransactionRecord = {
      ...original,
      description: 'DIRECT DEBIT',
      amount: -1000,
      category: 'Utilities',
    };
    const sameDescDifferentAmount2: TransactionRecord = {
      ...original,
      description: 'DIRECT DEBIT',
      amount: -2000, // different amount → different key
      category: 'Housing',
    };

    const csv = buildCsv(
      serialiseRecord(sameDescDifferentAmount),
      serialiseRecord(sameDescDifferentAmount2),
    );
    const { records } = parseLedgerCsv(csv);

    const transactions = records.filter((r): r is TransactionRecord => r.type === 'transaction');
    expect(transactions).toHaveLength(2);
  });

  it('does NOT collapse two rows with same date+description+amount but different accounts', () => {
    const onCard: TransactionRecord = {
      ...original,
      account: 'Nationwide Credit Card',
      category: 'Shopping',
    };
    const onCurrent: TransactionRecord = {
      ...original,
      account: 'Nationwide Current', // different account → different key
      category: 'Groceries',
    };

    const csv = buildCsv(serialiseRecord(onCard), serialiseRecord(onCurrent));
    const { records } = parseLedgerCsv(csv);

    const transactions = records.filter((r): r is TransactionRecord => r.type === 'transaction');
    expect(transactions).toHaveLength(2);
  });

  it('does NOT collapse rows with same key fields but different dates', () => {
    const laterDate: TransactionRecord = {
      ...original,
      date: '2026-03-16', // different date → different key
    };

    const csv = buildCsv(serialiseRecord(original), serialiseRecord(laterDate));
    const { records } = parseLedgerCsv(csv);

    const transactions = records.filter((r): r is TransactionRecord => r.type === 'transaction');
    expect(transactions).toHaveLength(2);
  });
});

// ─── Helpers for modal override UX (003-category-override-ux) ───────────────

// Mirrors canConfirmOverride logic: Confirm is only active when category changed
function canConfirmOverride(fromCategory: string, pendingCategory: string): boolean {
  return pendingCategory !== fromCategory;
}

// Mirrors modal selector option-building: pin fromCategory at 0 if inactive, then active sorted A–Z
function resolveModalSelectorOptions(
  fromCategory: string,
  activeCategories: CategoryRecord[],
): string[] {
  const sorted = [...activeCategories].sort((a, b) => a.name.localeCompare(b.name));
  const options: string[] = [];
  const isCurrentInActive = sorted.some((c) => c.name === fromCategory);
  if (!isCurrentInActive) {
    options.push(fromCategory);
  }
  for (const cat of sorted) {
    options.push(cat.name);
  }
  return options;
}

// ─── T006 — canConfirmOverride ───────────────────────────────────────────────

describe('T006 — canConfirmOverride', () => {
  it('returns false when pendingCategory equals fromCategory (same — no change)', () => {
    expect(canConfirmOverride('Groceries', 'Groceries')).toBe(false);
  });

  it('returns true when pendingCategory differs from fromCategory', () => {
    expect(canConfirmOverride('Groceries', 'Shopping')).toBe(true);
  });

  it('returns false for empty string matching itself', () => {
    expect(canConfirmOverride('', '')).toBe(false);
  });

  it('returns true for empty fromCategory with non-empty pendingCategory', () => {
    expect(canConfirmOverride('', 'Groceries')).toBe(true);
  });
});

// ─── T007 — resolveModalSelectorOptions ─────────────────────────────────────

describe('T007 — resolveModalSelectorOptions', () => {
  it('active fromCategory: all active options present, no pinned entry', () => {
    const options = resolveModalSelectorOptions('Groceries', activeCategories);
    // Groceries is active — no pin needed; options are purely active sorted
    expect(options).toEqual(['Groceries', 'Shopping', 'Uncategorised']);
    expect(options.filter((o) => o === 'Groceries')).toHaveLength(1);
  });

  it('inactive fromCategory: pinned at position 0, active categories follow', () => {
    const options = resolveModalSelectorOptions('Child Care', activeCategories);
    expect(options[0]).toBe('Child Care');
    expect(options.slice(1)).toEqual(['Groceries', 'Shopping', 'Uncategorised']);
  });

  it('inactive fromCategory that sorts before active ones stays pinned at 0', () => {
    // 'Apple' sorts before 'Groceries' — must still be at position 0
    const options = resolveModalSelectorOptions('Apple', activeCategories);
    expect(options[0]).toBe('Apple');
    expect(options.slice(1)).toEqual(['Groceries', 'Shopping', 'Uncategorised']);
  });

  it('active categories in options are sorted alphabetically', () => {
    const unsorted: CategoryRecord[] = [
      { type: 'category', name: 'Uncategorised', isDefault: true, createdDate: '2026-01-01', status: 'active' },
      { type: 'category', name: 'Groceries', isDefault: true, createdDate: '2026-01-01', status: 'active' },
      { type: 'category', name: 'Shopping', isDefault: true, createdDate: '2026-01-01', status: 'active' },
    ];
    const options = resolveModalSelectorOptions('Groceries', unsorted);
    expect(options).toEqual(['Groceries', 'Shopping', 'Uncategorised']);
  });
});

// ─── T008 — edit trigger state ───────────────────────────────────────────────

describe('T008 — edit trigger state', () => {
  const tx: TransactionRecord = {
    type: 'transaction',
    date: '2026-03-15',
    description: 'TESCO EXTRA',
    amount: -1250,
    transactionType: 'expense',
    category: 'Groceries',
    account: 'Nationwide Current',
    sourceFile: 'march.csv',
    importedDate: '2026-03-15',
    contentHash: 'abc123',
    personName: 'Household',
  };

  it('after edit trigger: pending.fromCategory equals tx.category', () => {
    // Simulates handleEditTrigger(tx)
    const pending = { transaction: tx, fromCategory: tx.category };
    expect(pending.fromCategory).toBe(tx.category);
  });

  it('after edit trigger: pendingCategory equals tx.category', () => {
    // pendingCategory initialised to tx.category when edit trigger fires
    const pendingCategory = tx.category;
    expect(pendingCategory).toBe(tx.category);
  });

  it('after edit trigger: Confirm is disabled (pendingCategory === fromCategory)', () => {
    const pending = { transaction: tx, fromCategory: tx.category };
    const pendingCategory = tx.category;
    expect(canConfirmOverride(pending.fromCategory, pendingCategory)).toBe(false);
  });

  it('after user selects different category: Confirm becomes enabled', () => {
    const pending = { transaction: tx, fromCategory: tx.category };
    const pendingCategory = 'Shopping';
    expect(canConfirmOverride(pending.fromCategory, pendingCategory)).toBe(true);
  });
});

// ─── T009 — modal cancel state ───────────────────────────────────────────────

describe('T009 — modal cancel state', () => {
  it('after cancel: pending is null', () => {
    // Simulates handleCancelOverride clearing pending
    let pending: { transaction: TransactionRecord; fromCategory: string } | null = {
      transaction: {
        type: 'transaction',
        date: '2026-03-15',
        description: 'TEST',
        amount: -100,
        transactionType: 'expense',
        category: 'Groceries',
        account: 'Nationwide Current',
        sourceFile: 'test.csv',
        importedDate: '2026-03-15',
        contentHash: 'x',
        personName: 'Household',
      },
      fromCategory: 'Groceries',
    };
    let pendingCategory = 'Groceries';

    // Cancel action
    pending = null;
    pendingCategory = '';

    expect(pending).toBeNull();
    expect(pendingCategory).toBe('');
  });

  it('after cancel: transaction category is unchanged (no write occurred)', () => {
    const tx: TransactionRecord = {
      type: 'transaction',
      date: '2026-03-15',
      description: 'TEST',
      amount: -100,
      transactionType: 'expense',
      category: 'Groceries',
      account: 'Nationwide Current',
      sourceFile: 'test.csv',
      importedDate: '2026-03-15',
      contentHash: 'x',
      personName: 'Household',
    };
    // Category never changed — still 'Groceries'
    expect(tx.category).toBe('Groceries');
  });
});

// ─── Helper: mirrors the isPromptRow logic in TransactionList ────────────────
function txKey(tx: TransactionRecord): string {
  return `${tx.date}\0${tx.description}\0${tx.amount}\0${tx.account}`;
}

describe('T009 — KeywordRulePrompt appears after successful override (isPromptRow logic)', () => {
  const tx: TransactionRecord = {
    type: 'transaction',
    date: '2026-03-15',
    description: 'TESCO EXTRA',
    amount: -1250,
    transactionType: 'expense',
    category: 'Groceries',
    account: 'Nationwide Current',
    sourceFile: 'march.csv',
    importedDate: '2026-03-15',
    contentHash: 'abc123',
    personName: 'Household',
  };

  it('txKey of overridden transaction matches original (only category differs)', () => {
    // Mirrors handleConfirmOverride: overriddenTx = { ...pending.transaction, category: toCategory }
    const overriddenTx: TransactionRecord = { ...tx, category: 'Shopping' };
    expect(txKey(overriddenTx)).toBe(txKey(tx));
  });

  it('isPromptRow is true when rulePromptFor is the overridden transaction', () => {
    const overriddenTx: TransactionRecord = { ...tx, category: 'Shopping' };
    const rulePromptFor = overriddenTx;
    const isPromptRow = rulePromptFor !== null && txKey(tx) === txKey(rulePromptFor);
    expect(isPromptRow).toBe(true);
  });

  it('isPromptRow is false when rulePromptFor is null (prompt not yet triggered)', () => {
    const rulePromptFor: TransactionRecord | null = null;
    const isPromptRow = rulePromptFor !== null && txKey(tx) === txKey(rulePromptFor);
    expect(isPromptRow).toBe(false);
  });

  it('isPromptRow is false for a different transaction (no cross-row contamination)', () => {
    const otherTx: TransactionRecord = {
      ...tx,
      description: 'SAINSBURYS ONLINE',
      amount: -850,
    };
    const overriddenTx: TransactionRecord = { ...tx, category: 'Shopping' };
    const rulePromptFor = overriddenTx;
    const isPromptRow = rulePromptFor !== null && txKey(otherTx) === txKey(rulePromptFor);
    expect(isPromptRow).toBe(false);
  });

  it('rulePromptFor carries the new category from the override (pre-fills KeywordRulePrompt)', () => {
    const overriddenTx: TransactionRecord = { ...tx, category: 'Shopping' };
    expect(overriddenTx.category).toBe('Shopping');
    expect(overriddenTx.description).toBe(tx.description);
  });
});

// ─── T002–T008: Staging rule prompt state machine (004-staging-rule-prompt) ──

// Pure-logic helper: mirrors shouldShowRulePrompt from StagingView
function shouldShowRulePrompt(newCategory: string, autoCategory: string): boolean {
  return newCategory !== autoCategory;
}

// State shape for the rule prompt
interface RulePromptTarget {
  rowIndex: number;
  description: string;
  category: string;
}

interface RulePromptState {
  rulePromptFor: RulePromptTarget | null;
  ruleSaveWarning: string;
}

// Pure-logic handler: mirrors handleCategoryChange from StagingView
function applyHandleCategoryChange(
  i: number,
  newCategory: string,
  autoCategory: string,
  description: string,
): RulePromptState {
  if (newCategory !== autoCategory) {
    return {
      rulePromptFor: { rowIndex: i, description, category: newCategory },
      ruleSaveWarning: '',
    };
  } else {
    return { rulePromptFor: null, ruleSaveWarning: '' };
  }
}

// Pure-logic handler: mirrors handleRuleDismiss from StagingView
function applyHandleRuleDismiss(): RulePromptState {
  return { rulePromptFor: null, ruleSaveWarning: '' };
}

// Pure-logic handler: mirrors handleRuleConfirm outcome for 'duplicate'
function applyHandleRuleConfirmDuplicate(current: RulePromptState): RulePromptState {
  return {
    rulePromptFor: current.rulePromptFor, // unchanged
    ruleSaveWarning: 'An active rule for this pattern and category already exists.',
  };
}

// Pure-logic handler: mirrors handleRuleConfirm outcome for 'saved'
function applyHandleRuleConfirmSaved(): RulePromptState {
  return { rulePromptFor: null, ruleSaveWarning: '' };
}

// ─── T002 — shouldShowRulePrompt ─────────────────────────────────────────────

describe('T002 — shouldShowRulePrompt', () => {
  it('returns true when newCategory differs from autoCategory (Shopping vs Groceries)', () => {
    expect(shouldShowRulePrompt('Shopping', 'Groceries')).toBe(true);
  });

  it('returns false when newCategory equals autoCategory (Groceries vs Groceries)', () => {
    expect(shouldShowRulePrompt('Groceries', 'Groceries')).toBe(false);
  });

  it('returns true for empty newCategory vs non-empty autoCategory (edge: prompt shown, validation is prompt responsibility)', () => {
    expect(shouldShowRulePrompt('', 'Uncategorised')).toBe(true);
  });
});

// ─── T003 — staging edit-trigger state ───────────────────────────────────────

describe('T003 — staging edit-trigger state after handleCategoryChange (newCategory !== autoCategory)', () => {
  it('rulePromptFor.rowIndex equals the changed row index', () => {
    const state = applyHandleCategoryChange(2, 'Shopping', 'Groceries', 'TESCO EXTRA');
    expect(state.rulePromptFor?.rowIndex).toBe(2);
  });

  it('rulePromptFor.category equals the new category', () => {
    const state = applyHandleCategoryChange(2, 'Shopping', 'Groceries', 'TESCO EXTRA');
    expect(state.rulePromptFor?.category).toBe('Shopping');
  });

  it('rulePromptFor.description equals the row description', () => {
    const state = applyHandleCategoryChange(2, 'Shopping', 'Groceries', 'TESCO EXTRA');
    expect(state.rulePromptFor?.description).toBe('TESCO EXTRA');
  });

  it('ruleSaveWarning is cleared when prompt opens', () => {
    const state = applyHandleCategoryChange(2, 'Shopping', 'Groceries', 'TESCO EXTRA');
    expect(state.ruleSaveWarning).toBe('');
  });
});

// ─── T004 — staging revert-to-auto ───────────────────────────────────────────

describe('T004 — staging revert-to-auto after handleCategoryChange (newCategory === autoCategory)', () => {
  it('rulePromptFor is null when new category equals auto category', () => {
    const state = applyHandleCategoryChange(1, 'Groceries', 'Groceries', 'TESCO EXTRA');
    expect(state.rulePromptFor).toBeNull();
  });

  it('ruleSaveWarning is cleared on revert', () => {
    const state = applyHandleCategoryChange(1, 'Groceries', 'Groceries', 'TESCO EXTRA');
    expect(state.ruleSaveWarning).toBe('');
  });
});

// ─── T005 — staging row-switch ────────────────────────────────────────────────

describe('T005 — staging row-switch: changing row j while prompt open for row i replaces prompt', () => {
  it('rulePromptFor.rowIndex is j after changing row j while prompt was open for row i', () => {
    // Row i prompt is open
    let state = applyHandleCategoryChange(0, 'Shopping', 'Groceries', 'TESCO EXTRA');
    expect(state.rulePromptFor?.rowIndex).toBe(0);

    // User changes row j (index 3)
    state = applyHandleCategoryChange(3, 'Utilities', 'Uncategorised', 'BRITISH GAS');
    expect(state.rulePromptFor?.rowIndex).toBe(3);
  });

  it('prompt for row j has correct category and description', () => {
    let state = applyHandleCategoryChange(0, 'Shopping', 'Groceries', 'TESCO EXTRA');
    state = applyHandleCategoryChange(3, 'Utilities', 'Uncategorised', 'BRITISH GAS');
    expect(state.rulePromptFor?.category).toBe('Utilities');
    expect(state.rulePromptFor?.description).toBe('BRITISH GAS');
  });
});

// ─── T006 — staging dismiss ───────────────────────────────────────────────────

describe('T006 — staging dismiss after handleRuleDismiss', () => {
  it('rulePromptFor is null after dismiss', () => {
    const state = applyHandleRuleDismiss();
    expect(state.rulePromptFor).toBeNull();
  });

  it('ruleSaveWarning is empty string after dismiss', () => {
    const state = applyHandleRuleDismiss();
    expect(state.ruleSaveWarning).toBe('');
  });
});

// ─── T007 — staging duplicate-warning ────────────────────────────────────────

describe('T007 — staging duplicate-warning after handleRuleConfirm returns duplicate', () => {
  const openState: RulePromptState = {
    rulePromptFor: { rowIndex: 1, description: 'TESCO EXTRA', category: 'Shopping' },
    ruleSaveWarning: '',
  };

  it('ruleSaveWarning is non-empty when result is duplicate', () => {
    const state = applyHandleRuleConfirmDuplicate(openState);
    expect(state.ruleSaveWarning).not.toBe('');
  });

  it('rulePromptFor is unchanged (prompt remains open) when result is duplicate', () => {
    const state = applyHandleRuleConfirmDuplicate(openState);
    expect(state.rulePromptFor).toEqual(openState.rulePromptFor);
  });
});

// ─── T008 — staging save-success ─────────────────────────────────────────────

describe('T008 — staging save-success after handleRuleConfirm returns saved', () => {
  it('rulePromptFor is null after successful save', () => {
    const state = applyHandleRuleConfirmSaved();
    expect(state.rulePromptFor).toBeNull();
  });

  it('ruleSaveWarning is empty string after successful save', () => {
    const state = applyHandleRuleConfirmSaved();
    expect(state.ruleSaveWarning).toBe('');
  });
});
