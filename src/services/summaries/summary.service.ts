import type { TransactionRecord } from '../../models/index';

export interface PeriodSummary {
  periodKey: string;      // 'YYYY-MM' | 'YYYY-Wnn' | 'YYYY'
  periodLabel: string;    // human-readable: 'March 2026' | 'Week 11, 2026' | '2026'
  totalIncome: number;    // sum of positive amounts (pence)
  totalExpenses: number;  // sum of negative amounts (stored as negative, pence)
  netPosition: number;    // totalIncome + totalExpenses
  byCategory: Record<string, number>;  // category → absolute spend (pence, expenses only)
}

export interface ComparablePeriod {
  current: PeriodSummary;
  previous: PeriodSummary;
  label: string;  // e.g. 'March 2026 vs March 2025'
}

// ── ISO week helpers ──────────────────────────────────────────────────────

/**
 * Returns the ISO week year and week number for a UTC date.
 * ISO weeks start on Monday; the week year is determined by Thursday.
 */
function getISOWeek(date: Date): { year: number; week: number } {
  const day = date.getUTCDay() || 7; // 1=Mon … 7=Sun
  // Thursday of the same week
  const thursday = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 4 - day),
  );
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return { year: thursday.getUTCFullYear(), week };
}

// ── Period key / label ────────────────────────────────────────────────────

function getPeriodKey(date: Date, period: 'weekly' | 'monthly' | 'yearly'): string {
  switch (period) {
    case 'yearly':
      return String(date.getUTCFullYear());
    case 'monthly': {
      const y = date.getUTCFullYear();
      const m = date.getUTCMonth() + 1;
      return `${y}-${String(m).padStart(2, '0')}`;
    }
    case 'weekly': {
      const { year, week } = getISOWeek(date);
      return `${year}-W${String(week).padStart(2, '0')}`;
    }
  }
}

function getPeriodLabel(key: string, period: 'weekly' | 'monthly' | 'yearly'): string {
  switch (period) {
    case 'yearly':
      return key;
    case 'monthly': {
      const [y, m] = key.split('-').map(Number);
      return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      });
    }
    case 'weekly': {
      // key = 'YYYY-Wnn'
      const [y, wPart] = key.split('-W');
      return `Week ${Number(wPart)}, ${y}`;
    }
  }
}

// ── aggregateByPeriod ─────────────────────────────────────────────────────

/**
 * Groups pre-filtered TransactionRecords into PeriodSummary buckets.
 * Does NOT apply any date or person filtering — callers are responsible for
 * pre-filtering before passing records here.
 */
export function aggregateByPeriod(
  records: TransactionRecord[],
  period: 'weekly' | 'monthly' | 'yearly',
): PeriodSummary[] {
  const map = new Map<string, PeriodSummary>();

  for (const r of records) {
    const date = new Date(r.date + 'T00:00:00Z');
    const key = getPeriodKey(date, period);

    if (!map.has(key)) {
      map.set(key, {
        periodKey: key,
        periodLabel: getPeriodLabel(key, period),
        totalIncome: 0,
        totalExpenses: 0,
        netPosition: 0,
        byCategory: {},
      });
    }

    const bucket = map.get(key)!;

    if (r.amount > 0) {
      bucket.totalIncome += r.amount;
    } else if (r.amount < 0) {
      bucket.totalExpenses += r.amount;
      const abs = Math.abs(r.amount);
      bucket.byCategory[r.category] = (bucket.byCategory[r.category] ?? 0) + abs;
    }
    bucket.netPosition = bucket.totalIncome + bucket.totalExpenses;
  }

  return Array.from(map.values()).sort((a, b) => a.periodKey.localeCompare(b.periodKey));
}

// ── getComparablePeriods ──────────────────────────────────────────────────

/**
 * Returns year-over-year comparable period pairs for the given period type.
 * For monthly: pairs (YYYY-MM, (YYYY-1)-MM) where both exist.
 * For weekly:  pairs (YYYY-Wnn, (YYYY-1)-Wnn) where both exist.
 * For yearly:  pairs (YYYY, YYYY-1) where both exist.
 * Returns null when no such pairs exist.
 */
export function getComparablePeriods(
  records: TransactionRecord[],
  period: 'weekly' | 'monthly' | 'yearly',
): ComparablePeriod[] | null {
  const summaries = aggregateByPeriod(records, period);
  if (summaries.length < 2) return null;

  const bySubKey = new Map<string, PeriodSummary[]>();

  for (const s of summaries) {
    let subKey: string;
    if (period === 'yearly') {
      subKey = 'year'; // all years share one group
    } else if (period === 'monthly') {
      // sub-key is the month number (MM)
      subKey = s.periodKey.slice(5); // 'YYYY-MM' → 'MM'
    } else {
      // weekly: sub-key is the week number (Wnn)
      subKey = s.periodKey.slice(5); // 'YYYY-Wnn' → 'Wnn'
    }

    const group = bySubKey.get(subKey) ?? [];
    group.push(s);
    bySubKey.set(subKey, group);
  }

  const pairs: ComparablePeriod[] = [];

  for (const group of bySubKey.values()) {
    if (group.length < 2) continue;
    // Sort descending so index 0 is most recent, index 1 is previous
    const sorted = [...group].sort((a, b) => b.periodKey.localeCompare(a.periodKey));
    const current = sorted[0];
    const previous = sorted[1];
    const label = `${current.periodLabel} vs ${previous.periodLabel}`;
    pairs.push({ current, previous, label });
  }

  if (pairs.length === 0) return null;

  // Sort pairs by current periodKey descending (most recent first)
  return pairs.sort((a, b) => b.current.periodKey.localeCompare(a.current.periodKey));
}
