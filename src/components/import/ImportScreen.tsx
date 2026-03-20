import { useEffect } from 'react';
import { useSession } from '../../store/SessionContext';
import { useLedger } from '../../hooks/useLedger';
import { useImport } from '../../hooks/useImport';
import { FileSelectScreen } from './FileSelectScreen';
import { ManualColumnMappingUI } from './ManualColumnMappingUI';
import { AccountLabelPrompt } from './AccountLabelPrompt';
import { PersonAssignmentPrompt } from './PersonAssignmentPrompt';
import { StagingView } from './StagingView';
import type {
  AccountPersonMappingRecord,
  CategoryRecord,
  FormatProfileRecord,
  PersonRecord,
} from '../../models/index';

export function ImportScreen() {
  const { state: session } = useSession();
  const { records, refresh } = useLedger();

  const profiles = records.filter((r): r is FormatProfileRecord => r.type === 'formatProfile');
  const categories = records.filter((r): r is CategoryRecord => r.type === 'category');
  const people = records.filter((r): r is PersonRecord => r.type === 'person');
  const accountMappings = records.filter(
    (r): r is AccountPersonMappingRecord => r.type === 'accountPersonMapping',
  );

  // Active persons for PersonAssignmentPrompt dropdown
  const activePeople = people.filter((p) => p.status === 'active');

  const {
    state,
    selectFile,
    applyManualMappings,
    setAccount,
    personAssigned,
    confirmImport,
    cancel,
  } = useImport({
    profiles,
    categories,
    people,
    accountMappings,
    dirHandle: session.dirHandle,
    onCommitted: () => refresh(),
  });

  // Load records on mount
  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.step === 'committed') {
    return (
      <div className="text-center py-12">
        <div className="text-green-600 text-4xl mb-3">✓</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Import Successful</h2>
        <p className="text-gray-500 text-sm mb-6">
          {state.parseResult?.rows.length ?? 0} transactions saved to your ledger.
        </p>
        <button
          onClick={cancel}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700"
        >
          Import Another File
        </button>
      </div>
    );
  }

  if (state.step === 'error') {
    return (
      <div className="max-w-md mx-auto text-center py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-700 font-medium mb-1">Import Failed</p>
          <p className="text-red-600 text-sm">{state.errorMessage}</p>
        </div>
        <button
          onClick={cancel}
          className="mt-4 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (state.step === 'idle' || state.step === 'detecting') {
    return (
      <FileSelectScreen
        onFileSelected={selectFile}
        isDetecting={state.step === 'detecting'}
        error={null}
      />
    );
  }

  if (state.step === 'manual_mapping') {
    const detection = state.detectionResult;
    const suggestedMappings =
      detection?.status === 'unrecognised' ? detection.suggestedMappings : [];
    const headers = suggestedMappings.map((m) => m?.sourceHeader ?? '').filter(Boolean) as string[];

    return (
      <ManualColumnMappingUI
        suggestedHeaders={headers}
        suggestedMappings={suggestedMappings as Array<{ sourceHeader?: string; canonicalField?: import('../../models/index').CanonicalField }>}
        onApply={applyManualMappings}
        onCancel={cancel}
      />
    );
  }

  if (state.step === 'account_labelling') {
    return <AccountLabelPrompt onConfirm={setAccount} onCancel={cancel} />;
  }

  if (state.step === 'person_assignment' && state.account) {
    const earliestDate =
      state.parseResult?.rows
        .map((r) => r.date)
        .filter(Boolean)
        .sort()[0] ?? '';

    return (
      <PersonAssignmentPrompt
        account={state.account}
        activePeople={activePeople}
        earliestTransactionDate={earliestDate}
        onConfirm={async (rows) => {
          // Append the AccountPersonMappingRecord then advance
          if (session.dirHandle) {
            const { appendRecords } = await import('../../services/ledger/ledger-writer');
            await appendRecords(session.dirHandle, rows);
            await refresh();
          }
          personAssigned();
        }}
        onCancel={cancel}
      />
    );
  }

  if (state.step === 'staging' || state.step === 'confirming') {
    return (
      <StagingView
        rows={state.parseResult?.rows ?? []}
        account={state.account ?? ''}
        detectedProfile={state.detectedProfile}
        categories={categories}
        onConfirm={confirmImport}
        onCancel={cancel}
        isConfirming={state.step === 'confirming'}
      />
    );
  }

  return null;
}
