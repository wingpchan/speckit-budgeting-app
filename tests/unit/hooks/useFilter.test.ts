/**
 * T063 — Unit tests for useFilter hook
 *
 * Covers:
 *  - monthly preset → first/last day of current month
 *  - weekly preset → current week Mon–Sun
 *  - yearly preset → Jan 1 – Dec 31
 *  - custom preset → user-supplied start/end passed through unchanged
 *  - filter updates when SessionState.dateFilter changes
 *
 * Note: the hook computes ranges via local-time Date helpers then formats with
 * toISOString().  These tests run correctly in UTC (standard CI default).
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('../../../src/store/SessionContext', () => ({
  useSession: vi.fn(),
}));

import { useFilter } from '../../../src/hooks/useFilter';
import { useSession } from '../../../src/store/SessionContext';

const mockUseSession = vi.mocked(useSession);

// Fix clock to Thursday 2026-03-26 at noon UTC so date-based computations are stable.
// In UTC:
//   monthly  → 2026-03-01 … 2026-03-31
//   weekly   → 2026-03-23 (Mon) … 2026-03-29 (Sun)
//   yearly   → 2026-01-01 … 2026-12-31
const FIXED_NOW = new Date('2026-03-26T12:00:00.000Z');

function setup(
  preset: 'weekly' | 'monthly' | 'yearly' | 'custom',
  start = '',
  end = '',
) {
  mockUseSession.mockReturnValue({
    state: {
      dateFilter: { preset, start, end },
      dirHandle: null,
      ledgerHandleKey: null,
      personFilter: null,
    },
    dispatch: vi.fn(),
  });
}

describe('T063 — useFilter', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    mockUseSession.mockReset();
  });

  // ── Monthly ────────────────────────────────────────────────────────────────

  it('monthly preset returns 2026-03-01 as start', () => {
    setup('monthly');
    const { result } = renderHook(() => useFilter());
    expect(result.current.start).toBe('2026-03-01');
  });

  it('monthly preset returns 2026-03-31 as end', () => {
    setup('monthly');
    const { result } = renderHook(() => useFilter());
    expect(result.current.end).toBe('2026-03-31');
  });

  // ── Weekly ─────────────────────────────────────────────────────────────────

  it('weekly preset start is Monday 2026-03-23', () => {
    setup('weekly');
    const { result } = renderHook(() => useFilter());
    expect(result.current.start).toBe('2026-03-23');
  });

  it('weekly preset end is Sunday 2026-03-29', () => {
    setup('weekly');
    const { result } = renderHook(() => useFilter());
    expect(result.current.end).toBe('2026-03-29');
  });

  it('weekly preset span is exactly 6 days (Mon–Sun)', () => {
    setup('weekly');
    const { result } = renderHook(() => useFilter());
    // Parse as UTC midnight to avoid DST-boundary distortion in the diff calculation
    const s = new Date(`${result.current.start}T00:00:00Z`);
    const e = new Date(`${result.current.end}T00:00:00Z`);
    expect(s.getUTCDay()).toBe(1); // Monday
    expect(e.getUTCDay()).toBe(0); // Sunday
    const diffDays = (e.getTime() - s.getTime()) / 86_400_000;
    expect(diffDays).toBe(6);
  });

  // ── Yearly ─────────────────────────────────────────────────────────────────

  it('yearly preset returns 2026-01-01 as start', () => {
    setup('yearly');
    const { result } = renderHook(() => useFilter());
    expect(result.current.start).toBe('2026-01-01');
  });

  it('yearly preset returns 2026-12-31 as end', () => {
    setup('yearly');
    const { result } = renderHook(() => useFilter());
    expect(result.current.end).toBe('2026-12-31');
  });

  // ── Custom ─────────────────────────────────────────────────────────────────

  it('custom preset passes through start unchanged', () => {
    setup('custom', '2026-01-15', '2026-02-28');
    const { result } = renderHook(() => useFilter());
    expect(result.current.start).toBe('2026-01-15');
  });

  it('custom preset passes through end unchanged', () => {
    setup('custom', '2026-01-15', '2026-02-28');
    const { result } = renderHook(() => useFilter());
    expect(result.current.end).toBe('2026-02-28');
  });

  // ── Updates on state change ────────────────────────────────────────────────

  it('filter updates when dateFilter preset changes from custom to monthly', () => {
    setup('custom', '2025-12-01', '2025-12-31');
    const { result, rerender } = renderHook(() => useFilter());
    expect(result.current.start).toBe('2025-12-01');

    setup('monthly');
    rerender();
    expect(result.current.start).toBe('2026-03-01');
    expect(result.current.end).toBe('2026-03-31');
  });

  it('filter updates when custom start/end values change', () => {
    setup('custom', '2026-01-01', '2026-01-31');
    const { result, rerender } = renderHook(() => useFilter());
    expect(result.current.start).toBe('2026-01-01');

    setup('custom', '2026-06-01', '2026-06-30');
    rerender();
    expect(result.current.start).toBe('2026-06-01');
    expect(result.current.end).toBe('2026-06-30');
  });
});
