import { useCallback, useReducer } from 'react';
import type {
  AccountPersonMappingRecord,
  CategoryRecord,
  ColumnMapping,
  DetectionHints,
  FormatProfileRecord,
  PersonRecord,
  TransactionRecord,
} from '../models/index';
import { csvParserService } from '../services/csv-parser/csv-parser.service';
import { extractAccountName } from '../services/csv-parser/account-extractor';
import { buildKeywordIndex, categorise } from '../services/categoriser/categoriser.service';
import { buildTransactionRecord, commitImport } from '../services/ledger/transaction-committer';
import { detectExactDuplicate, detectDateRangeOverlap } from '../services/duplicate/duplicate.service';
import { DEFAULT_KEYWORD_MAP } from '../models/constants';
import { toISODate } from '../utils/dates';
import type { DetectionResult, ParsedRow, ParseResult } from '../services/csv-parser/types';

// ── State machine ─────────────────────────────────────────────────────────────

export type ImportStep =
  | 'idle'
  | 'detecting'
  | 'manual_mapping'   // detection returned 'unrecognised'; show ManualColumnMappingUI
  | 'account_labelling' // account could not be extracted from metadata; show AccountLabelPrompt
  | 'person_assignment' // account has no existing person mapping; show PersonAssignmentPrompt
  | 'staging'          // show StagingView (Confirm / Cancel)
  | 'duplicate_warning' // duplicate detected; show DuplicateWarningModal
  | 'confirming'       // writing to ledger
  | 'committed'
  | 'error';

export type DuplicateWarning =
  | { kind: 'exact'; priorImportDate: string }
  | { kind: 'dateRange'; overlapRange: { start: string; end: string } };

export interface ImportState {
  step: ImportStep;
  file: File | null;
  detectionResult: DetectionResult | null;
  mappings: ColumnMapping[] | null;
  hints: Pick<DetectionHints, 'metadataRowCount' | 'dateFormat'> | null;
  detectedProfile: string | null;
  account: string | null;
  parseResult: ParseResult | null;
  contentHash: string | null;
  pendingAccountMapping: AccountPersonMappingRecord | null;
  duplicateWarning: DuplicateWarning | null;
  errorMessage: string | null;
}

type ImportAction =
  | { type: 'FILE_SELECTED'; file: File }
  | { type: 'DETECTION_UNRECOGNISED'; result: DetectionResult }
  | {
      type: 'PARSED';
      mappings: ColumnMapping[];
      hints: Pick<DetectionHints, 'metadataRowCount' | 'dateFormat'>;
      detectedProfile: string | null;
      parseResult: ParseResult;
      contentHash: string;
      account: string | null;
      nextStep: ImportStep;
    }
  | { type: 'ACCOUNT_SET'; account: string; nextStep: ImportStep }
  | { type: 'PERSON_ASSIGNED'; mapping: AccountPersonMappingRecord }
  | { type: 'CONFIRM_IMPORT' }
  | { type: 'DUPLICATE_DETECTED'; warning: DuplicateWarning }
  | { type: 'DUPLICATE_OVERRIDE' }
  | { type: 'COMMITTED' }
  | { type: 'CANCEL' }
  | { type: 'ERROR'; message: string };

const initialState: ImportState = {
  step: 'idle',
  file: null,
  detectionResult: null,
  mappings: null,
  hints: null,
  detectedProfile: null,
  account: null,
  parseResult: null,
  contentHash: null,
  pendingAccountMapping: null,
  duplicateWarning: null,
  errorMessage: null,
};

function importReducer(state: ImportState, action: ImportAction): ImportState {
  switch (action.type) {
    case 'FILE_SELECTED':
      return { ...initialState, step: 'detecting', file: action.file };
    case 'DETECTION_UNRECOGNISED':
      return { ...state, step: 'manual_mapping', detectionResult: action.result };
    case 'PARSED':
      return {
        ...state,
        step: action.nextStep,
        mappings: action.mappings,
        hints: action.hints,
        detectedProfile: action.detectedProfile,
        parseResult: action.parseResult,
        contentHash: action.contentHash,
        account: action.account,
      };
    case 'ACCOUNT_SET':
      return { ...state, step: action.nextStep, account: action.account };
    case 'PERSON_ASSIGNED':
      return { ...state, step: 'staging', pendingAccountMapping: action.mapping };
    case 'CONFIRM_IMPORT':
      return { ...state, step: 'confirming' };
    case 'DUPLICATE_DETECTED':
      return { ...state, step: 'duplicate_warning', duplicateWarning: action.warning };
    case 'DUPLICATE_OVERRIDE':
      return { ...state, step: 'confirming', duplicateWarning: null };
    case 'COMMITTED':
      return { ...state, step: 'committed' };
    case 'CANCEL':
      return initialState;
    case 'ERROR':
      return { ...state, step: 'error', errorMessage: action.message };
    default:
      return state;
  }
}

// ── Hook interface ────────────────────────────────────────────────────────────

interface UseImportOptions {
  profiles: FormatProfileRecord[];
  categories: CategoryRecord[];
  people: PersonRecord[];
  accountMappings: AccountPersonMappingRecord[];
  existingTransactions: TransactionRecord[];
  dirHandle: FileSystemDirectoryHandle | null;
  onCommitted?: () => void;
}

export function useImport(options: UseImportOptions) {
  const { profiles, categories, dirHandle, onCommitted } = options;
  const [state, dispatch] = useReducer(importReducer, initialState);

  // ── Internal: parse and advance to the right next step ──────────────────

  const _parseAndAdvance = useCallback(
    async (
      file: File,
      mappings: ColumnMapping[],
      hints: Pick<DetectionHints, 'metadataRowCount' | 'dateFormat'>,
      detectedProfile: string | null,
      matchedProfile: FormatProfileRecord | null,
    ) => {
      const parseResult = await csvParserService.parseWithMapping(file, mappings, hints);
      const result = { ...parseResult, detectedProfile };

      const rawText = await file.text();
      const rawLines = rawText.split(/\r?\n/);
      const account = extractAccountName(rawLines, matchedProfile);
      const contentHash = await _computeHash(file);

      if (!account) {
        // Need user to supply account label
        dispatch({
          type: 'PARSED',
          mappings,
          hints,
          detectedProfile,
          parseResult: result,
          contentHash,
          account: null,
          nextStep: 'account_labelling',
        });
        return;
      }

      const nextStep = _resolveNextStep(account, options.accountMappings);
      dispatch({
        type: 'PARSED',
        mappings,
        hints,
        detectedProfile,
        parseResult: result,
        contentHash,
        account,
        nextStep,
      });
    },
    [options.accountMappings],
  );

  // ── Public API ───────────────────────────────────────────────────────────

  const selectFile = useCallback(
    async (file: File) => {
      dispatch({ type: 'FILE_SELECTED', file });

      try {
        const detectionResult = await csvParserService.detect(file, profiles);

        if (detectionResult.status === 'unrecognised' || detectionResult.status === 'noData') {
          dispatch({ type: 'DETECTION_UNRECOGNISED', result: detectionResult });
          return;
        }

        const matchedProfile =
          profiles.find((p) => p.profileName === detectionResult.profileName) ?? null;
        const hints: Pick<DetectionHints, 'metadataRowCount' | 'dateFormat'> = matchedProfile
          ? {
              metadataRowCount: matchedProfile.detectionHints.metadataRowCount,
              dateFormat: matchedProfile.detectionHints.dateFormat,
            }
          : { metadataRowCount: 0, dateFormat: 'DD/MM/YYYY' };

        await _parseAndAdvance(file, detectionResult.mappings, hints, detectionResult.profileName, matchedProfile);
      } catch (err) {
        dispatch({
          type: 'ERROR',
          message: err instanceof Error ? err.message : 'Failed to process file',
        });
      }
    },
    [profiles, _parseAndAdvance],
  );

  /** Called after user completes the manual column mapping UI. */
  const applyManualMappings = useCallback(
    async (
      mappings: ColumnMapping[],
      hints: Pick<DetectionHints, 'metadataRowCount' | 'dateFormat'>,
    ) => {
      if (!state.file) return;
      try {
        await _parseAndAdvance(state.file, mappings, hints, null, null);
      } catch (err) {
        dispatch({
          type: 'ERROR',
          message: err instanceof Error ? err.message : 'Failed to parse with mappings',
        });
      }
    },
    [state.file, _parseAndAdvance],
  );

  /** Called after user provides an account label (AccountLabelPrompt). */
  const setAccount = useCallback(
    (account: string) => {
      const nextStep = _resolveNextStep(account, options.accountMappings);
      dispatch({ type: 'ACCOUNT_SET', account, nextStep });
    },
    [options.accountMappings],
  );

  /** Called after the PersonAssignmentPrompt; holds the mapping in state until final confirm. */
  const personAssigned = useCallback((mapping: AccountPersonMappingRecord) => {
    dispatch({ type: 'PERSON_ASSIGNED', mapping });
  }, []);

  /** Internal: perform the actual ledger write (shared by confirmImport and overrideDuplicate). */
  const _doCommit = useCallback(async () => {
    const { parseResult, account, contentHash, file, pendingAccountMapping } = state;
    if (!parseResult || !account || !contentHash || !file || !dirHandle) return;

    dispatch({ type: 'CONFIRM_IMPORT' });

    try {
      const keywordIndex = buildKeywordIndex(categories, DEFAULT_KEYWORD_MAP);

      // Include the pending mapping (if any) when resolving person names so that
      // transactions in this batch are correctly attributed before it is persisted.
      const allMappings = pendingAccountMapping
        ? [...options.accountMappings, pendingAccountMapping]
        : options.accountMappings;

      const records = parseResult.rows.map((row: ParsedRow) => {
        const category = categorise(row.description, keywordIndex);
        const personName = _resolvePersonName(row.date, account, allMappings);
        return buildTransactionRecord(row, {
          account,
          sourceFile: file.name,
          contentHash,
          importedDate: toISODate(new Date()),
          personName,
          category,
        });
      });

      await commitImport(records, dirHandle, pendingAccountMapping);
      dispatch({ type: 'COMMITTED' });
      onCommitted?.();
    } catch (err) {
      dispatch({
        type: 'ERROR',
        message: err instanceof Error ? err.message : 'Failed to commit import',
      });
    }
  }, [state, dirHandle, categories, options.accountMappings, onCommitted]);

  /** Builds and commits all TransactionRecords to the ledger. */
  const confirmImport = useCallback(async () => {
    const { parseResult, account, contentHash, file } = state;
    if (!parseResult || !account || !contentHash || !file || !dirHandle) return;

    // Run duplicate checks before committing
    const exactResult = detectExactDuplicate(contentHash, options.existingTransactions);
    if (exactResult.isDuplicate) {
      dispatch({
        type: 'DUPLICATE_DETECTED',
        warning: { kind: 'exact', priorImportDate: exactResult.priorImportDate! },
      });
      return;
    }

    const rangeResult = detectDateRangeOverlap(
      parseResult.rows,
      account,
      options.existingTransactions,
    );
    if (rangeResult.hasOverlap) {
      dispatch({
        type: 'DUPLICATE_DETECTED',
        warning: { kind: 'dateRange', overlapRange: rangeResult.overlapRange! },
      });
      return;
    }

    await _doCommit();
  }, [_doCommit, state, dirHandle, options.existingTransactions]);

  /** User explicitly chose to proceed past the duplicate warning. */
  const overrideDuplicate = useCallback(async () => {
    dispatch({ type: 'DUPLICATE_OVERRIDE' });
    await _doCommit();
  }, [_doCommit]);

  /** Cancel duplicate warning — return to staging without writing. */
  const cancelDuplicate = useCallback(() => {
    dispatch({ type: 'PERSON_ASSIGNED' }); // returns to 'staging'
  }, []);

  const cancel = useCallback(() => dispatch({ type: 'CANCEL' }), []);

  return {
    state,
    selectFile,
    applyManualMappings,
    setAccount,
    personAssigned,
    confirmImport,
    overrideDuplicate,
    cancelDuplicate,
    cancel,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function _computeHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function _resolveNextStep(
  account: string,
  mappings: AccountPersonMappingRecord[],
): ImportStep {
  const hasMappings = mappings.some((m) => m.accountName === account);
  return hasMappings ? 'staging' : 'person_assignment';
}

function _resolvePersonName(
  date: string,
  account: string,
  mappings: AccountPersonMappingRecord[],
): string {
  const applicable = mappings
    .filter((m) => m.accountName === account && m.effectiveDate <= date)
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  return applicable[0]?.personName ?? 'Household';
}
