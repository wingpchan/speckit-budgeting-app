import { useMemo } from 'react';
import { useSession } from '../store/SessionContext';

function getWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  };
}

function getMonthRange(): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return {
    start: new Date(year, month, 1).toISOString().slice(0, 10),
    end: new Date(year, month + 1, 0).toISOString().slice(0, 10),
  };
}

function getYearRange(): { start: string; end: string } {
  const year = new Date().getFullYear();
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}

/**
 * Derives { start, end } ISO date strings from the current session date filter preset.
 * For 'custom', returns the stored start/end from session state.
 */
export function useFilter(): { start: string; end: string } {
  const { state } = useSession();
  const { preset, start, end } = state.dateFilter;

  return useMemo(() => {
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
