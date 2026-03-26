import { useMemo } from 'react';
import { aggregateByPeriod, getComparablePeriods } from '../services/summaries/summary.service';
import type { TransactionRecord } from '../models/index';
import type { PeriodSummary, ComparablePeriod } from '../services/summaries/summary.service';

interface UseSummariesResult {
  summaries: PeriodSummary[];
  comparisons: ComparablePeriod[] | null;
}

/**
 * Pure computational hook — does NOT call useLedger.
 * Callers (SummariesPage) are responsible for pre-filtering records before passing them in.
 */
export function useSummaries(
  records: TransactionRecord[],
  period: 'weekly' | 'monthly' | 'yearly',
): UseSummariesResult {
  const summaries = useMemo(
    () => aggregateByPeriod(records, period),
    [records, period],
  );

  const comparisons = useMemo(
    () => getComparablePeriods(records, period),
    [records, period],
  );

  return { summaries, comparisons };
}
