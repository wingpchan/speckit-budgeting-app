import { useEffect, useRef } from 'react';

interface MigrationPromptModalProps {
  onMigrate: () => void;
  onDecline: () => void;
}

/**
 * Accessible modal that prompts the user to migrate an older ledger.
 * - Focus is trapped inside the modal while open.
 * - Escape key triggers Decline (not a silent dismiss).
 * - The original file is backed up before any changes are made.
 */
export function MigrationPromptModal({ onMigrate, onDecline }: MigrationPromptModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const migrateButtonRef = useRef<HTMLButtonElement>(null);

  // Focus the first button when mounted
  useEffect(() => {
    migrateButtonRef.current?.focus();
  }, []);

  // Trap focus and handle Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDecline();
        return;
      }

      if (e.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('disabled'));

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onDecline]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="migration-title"
      aria-describedby="migration-desc"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
      >
        <h2 id="migration-title" className="text-lg font-semibold text-gray-800 mb-3">
          Ledger Migration Required
        </h2>
        <p id="migration-desc" className="text-sm text-gray-600 mb-4">
          Your ledger file was created with an older version of this app. Before making any
          changes, <strong>your original file will be backed up</strong> to a file named{' '}
          <code className="bg-gray-100 px-1 rounded text-xs">
            budget-ledger.backup-v&#123;N&#125;-YYYYMMDD
          </code>
          . The migration will then update your ledger to the current format.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onDecline}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
          >
            Decline
          </button>
          <button
            ref={migrateButtonRef}
            onClick={onMigrate}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700"
          >
            Migrate
          </button>
        </div>
      </div>
    </div>
  );
}
