import { useState } from 'react';

interface KeywordRulePromptProps {
  /** The description of the just-overridden transaction — pre-fills the pattern field */
  transactionDescription: string;

  /** The category that was just applied — pre-fills the category field (read-only display) */
  category: string;

  /**
   * Called when the user confirms. The component validates before calling this.
   * @param pattern The (possibly edited) pattern to save
   * @param category The target category
   */
  onConfirm: (pattern: string, category: string) => Promise<void>;

  /**
   * Called when the user dismisses the prompt without saving.
   * No rule is written; the committed override is unaffected.
   */
  onDismiss: () => void;

  /**
   * If provided and non-empty, the component displays this as an inline warning
   * and the Confirm button remains disabled (exact duplicate — no-op to save again).
   */
  duplicateWarning?: string;

  /**
   * If provided and non-empty, the component displays this as an inline warning
   * but the Confirm button remains enabled (pattern conflict — user may click Confirm
   * again to proceed and replace the existing rule).
   */
  overrideWarning?: string;

  /** When true, the Confirm button shows a loading state and is disabled */
  isSaving?: boolean;
}

export function KeywordRulePrompt({
  transactionDescription,
  category,
  onConfirm,
  onDismiss,
  duplicateWarning,
  overrideWarning,
  isSaving = false,
}: KeywordRulePromptProps) {
  const [pattern, setPattern] = useState(transactionDescription);

  const isPatternEmpty = pattern.trim().length === 0;
  // overrideWarning does NOT disable Confirm — user must click again to confirm replacement
  const isDisabled = isPatternEmpty || Boolean(duplicateWarning) || isSaving;

  async function handleConfirm() {
    if (isDisabled) return;
    await onConfirm(pattern.trim(), category);
  }

  return (
    <div className="mt-1 mx-2 mb-2 border border-indigo-200 bg-indigo-50 rounded-lg p-3">
      <p className="text-xs font-medium text-indigo-700 mb-2">
        Save keyword rule for this category?
      </p>
      <p className="text-xs text-gray-500 mb-2 truncate">
        Transaction: <span className="font-mono">{transactionDescription}</span>
      </p>
      <div className="flex flex-col gap-1 mb-2">
        <label className="text-xs text-gray-600">
          Pattern (substring match, case-insensitive):
        </label>
        <input
          type="text"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          disabled={isSaving}
          className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:opacity-50 bg-white"
        />
        {isPatternEmpty && (
          <span className="text-xs text-red-600">Pattern cannot be empty</span>
        )}
        {duplicateWarning && (
          <span className="text-xs text-amber-600">{duplicateWarning}</span>
        )}
        {overrideWarning && !duplicateWarning && (
          <span className="text-xs text-amber-600">{overrideWarning}</span>
        )}
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-600">Category:</span>
        <span className="text-xs font-medium text-gray-800">{category}</span>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onDismiss}
          disabled={isSaving}
          className="px-3 py-1 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
        >
          Dismiss
        </button>
        <button
          onClick={handleConfirm}
          disabled={isDisabled}
          className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving…' : 'Confirm'}
        </button>
      </div>
    </div>
  );
}
