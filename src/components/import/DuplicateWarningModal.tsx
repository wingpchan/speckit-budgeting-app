import { useEffect, useRef } from 'react';

interface ExactDuplicateProps {
  variant: 'exact';
  priorImportDate: string;
  onOverride: () => void;
  onCancel: () => void;
}

interface DateRangeOverlapProps {
  variant: 'dateRange';
  overlapRange: { start: string; end: string };
  onProceed: () => void;
  onCancel: () => void;
}

type DuplicateWarningModalProps = ExactDuplicateProps | DateRangeOverlapProps;

export function DuplicateWarningModal(props: DuplicateWarningModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCancel = props.onCancel;

  // Auto-focus first focusable element on mount
  useEffect(() => {
    const firstBtn = dialogRef.current?.querySelector<HTMLButtonElement>('button');
    firstBtn?.focus();
  }, []);

  // Focus trap + Escape → cancel
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>('button:not([disabled])'),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="duplicate-modal-title"
      className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
    >
      <div ref={dialogRef} className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        {props.variant === 'exact' ? (
          <ExactDuplicateContent {...props} />
        ) : (
          <DateRangeOverlapContent {...props} />
        )}
      </div>
    </div>
  );
}

function ExactDuplicateContent({ priorImportDate, onOverride, onCancel }: ExactDuplicateProps) {
  return (
    <>
      <h2 id="duplicate-modal-title" className="text-lg font-semibold text-red-700 mb-2">
        Duplicate File Detected
      </h2>
      <p className="text-sm text-gray-700 mb-4">
        This exact file was already imported on{' '}
        <span className="font-medium">{priorImportDate}</span>. Importing again will create
        duplicate transactions in your ledger. Only proceed if you have deliberately deleted those
        transactions and need to re-import them.
      </p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={onOverride}
          className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700"
        >
          Import Anyway
        </button>
      </div>
    </>
  );
}

function DateRangeOverlapContent({ overlapRange, onProceed, onCancel }: DateRangeOverlapProps) {
  return (
    <>
      <h2 id="duplicate-modal-title" className="text-lg font-semibold text-yellow-700 mb-2">
        Date Range Overlap Detected
      </h2>
      <p className="text-sm text-gray-700 mb-4">
        This file contains transactions that overlap with previously imported data for this
        account. Overlapping date range:{' '}
        <span className="font-medium">
          {overlapRange.start} – {overlapRange.end}
        </span>
        . Some transactions may be duplicated.
      </p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={onProceed}
          className="px-4 py-2 text-sm rounded bg-yellow-600 text-white hover:bg-yellow-700"
        >
          Proceed
        </button>
      </div>
    </>
  );
}
