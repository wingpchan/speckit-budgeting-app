import { describe, it, expect } from 'vitest';
import {
  parseDDMonYYYY,
  parseUKDate,
  getPrevMonth,
  toMonthLabel,
  isValidDate,
  toISODate,
} from '../../../src/utils/dates';

describe('parseDDMonYYYY', () => {
  it('parses a valid DD Mon YYYY string', () => {
    expect(parseDDMonYYYY('15 Mar 2026')).toBe('2026-03-15');
  });

  it('parses first day of year', () => {
    expect(parseDDMonYYYY('01 Jan 2024')).toBe('2024-01-01');
  });

  it('parses last day of year', () => {
    expect(parseDDMonYYYY('31 Dec 2023')).toBe('2023-12-31');
  });

  it('returns null for invalid input', () => {
    expect(parseDDMonYYYY('invalid')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseDDMonYYYY('')).toBeNull();
  });
});

describe('parseUKDate', () => {
  it('parses a valid DD/MM/YYYY string', () => {
    expect(parseUKDate('15/03/2026')).toBe('2026-03-15');
  });

  it('parses first day of year', () => {
    expect(parseUKDate('01/01/2024')).toBe('2024-01-01');
  });

  it('returns null for invalid input', () => {
    expect(parseUKDate('invalid')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseUKDate('')).toBeNull();
  });
});

describe('getPrevMonth', () => {
  it('returns previous month in normal case', () => {
    expect(getPrevMonth('2026-03')).toBe('2026-02');
  });

  it('wraps from January to December of previous year', () => {
    expect(getPrevMonth('2026-01')).toBe('2025-12');
  });

  it('returns previous month for December', () => {
    expect(getPrevMonth('2026-12')).toBe('2026-11');
  });
});

describe('toMonthLabel', () => {
  it('formats March 2026', () => {
    expect(toMonthLabel('2026-03')).toBe('March 2026');
  });

  it('formats January 2024', () => {
    expect(toMonthLabel('2024-01')).toBe('January 2024');
  });

  it('formats December 2025', () => {
    expect(toMonthLabel('2025-12')).toBe('December 2025');
  });
});

describe('isValidDate', () => {
  it('returns true for a valid ISO date', () => {
    expect(isValidDate('2026-03-15')).toBe(true);
  });

  it('returns false for an invalid date', () => {
    expect(isValidDate('2026-13-01')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidDate('')).toBe(false);
  });

  it('returns false for non-date string', () => {
    expect(isValidDate('not-a-date')).toBe(false);
  });
});

describe('toISODate', () => {
  it('converts a Date to YYYY-MM-DD', () => {
    const d = new Date('2026-03-15T12:00:00.000Z');
    expect(toISODate(d)).toBe('2026-03-15');
  });
});
