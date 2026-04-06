import { useMemo } from 'react';
import { useSession } from '../store/SessionContext';

function getWeekRange(): { start: string; end: string } {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const date = now.getUTCDate();
  const day = now.getUTCDay(); // 0 = Sunday
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return {
    start: new Date(Date.UTC(year, month, date + mondayOffset)).toISOString().slice(0, 10),
    end: new Date(Date.UTC(year, month, date + mondayOffset + 6)).toISOString().slice(0, 10),
  };
}

function getMonthRange(): { start: string; end: string } {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  return {
    start: new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10),
    end: new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10),
  };
}

function getYearRange(): { start: string; end: string } {
  const year = new Date().getUTCFullYear();
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}

/**
 * Pure filter function — no hook context required.
 * Returns records whose date falls within [start, end] inclusive.
 */
export function filterByDate<T extends { date: string }>(
  records: T[],
  start: string,
  end: string,
): T[] {
  return records.filter((r) => r.date >= start && r.date <= end);
}

/**
 * Returns { start, end } ISO date strings for the current date filter.
 *
 * When start/end are stored in session state (always the case after any tab
 * click or Prev/Next navigation), they are returned directly so that
 * navigation changes are immediately reflected. When start/end are absent
 * (e.g. unit-test stubs that only set a preset), the range is computed from
 * the current date as a fallback.
 */
export function useFilter(): { start: string; end: string } {
  const { state } = useSession();
  const { preset, start, end } = state.dateFilter;

  return useMemo(() => {
    if (start && end) return { start, end };
    switch (preset) {
      case 'weekly':
        return getWeekRange();
      case 'monthly':
        return getMonthRange();
      case 'yearly':
        return getYearRange();
      case 'custom':
        return { start, end };
    }
  }, [preset, start, end]);
}
