import { useState, useCallback } from 'react';
import { useSession } from '../store/SessionContext';
import { parseLedgerCsv } from '../services/ledger/ledger-reader';
import { appendRecords as appendToLedger } from '../services/ledger/ledger-writer';
import type { AllRecordTypes } from '../models/index';

interface UseLedgerResult {
  records: AllRecordTypes[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  appendRecords: (rows: string[]) => Promise<void>;
}

export function useLedger(): UseLedgerResult {
  const { state } = useSession();
  const { dirHandle } = state;

  const [records, setRecords] = useState<AllRecordTypes[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!dirHandle) {
      setRecords([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const fileHandle = await dirHandle.getFileHandle('budget-ledger.csv', { create: false });
      const file = await fileHandle.getFile();
      const text = await file.text();
      const { records: parsed } = parseLedgerCsv(text);
      setRecords(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read ledger');
    } finally {
      setIsLoading(false);
    }
  }, [dirHandle]);

  const appendRecords = useCallback(
    async (rows: string[]) => {
      if (!dirHandle) throw new Error('No ledger directory selected');
      await appendToLedger(dirHandle, rows);
      await refresh();
    },
    [dirHandle, refresh],
  );

  return { records, isLoading, error, refresh, appendRecords };
}
