import { describe, it, expect } from 'vitest';
import { scoreHeaderMapping, detectProfile } from '../../../../src/services/csv-parser/detection-registry';
import { REFERENCE_FORMAT_PROFILES } from '../../../../src/models/constants';
import type { FormatProfileRecord } from '../../../../src/models/index';

const profiles = REFERENCE_FORMAT_PROFILES as FormatProfileRecord[];

describe('scoreHeaderMapping', () => {
  it('returns 1.0 for exact synonym match (date)', () => {
    expect(scoreHeaderMapping('date', 'date')).toBe(1.0);
  });

  it('returns 1.0 for case-insensitive exact synonym match', () => {
    expect(scoreHeaderMapping('Date', 'date')).toBe(1.0);
  });

  it('returns 1.0 for "description" synonym match', () => {
    expect(scoreHeaderMapping('Transactions', 'description')).toBe(1.0);
  });

  it('returns 1.0 for "Paid out" synonym match → paidOut', () => {
    expect(scoreHeaderMapping('Paid out', 'paidOut')).toBe(1.0);
  });

  it('returns 1.0 for "Paid in" synonym match → paidIn', () => {
    expect(scoreHeaderMapping('Paid in', 'paidIn')).toBe(1.0);
  });

  it('returns 0.8 for partial/regex match (header contains field keyword)', () => {
    // "custom date column" contains "date" but is not an exact synonym
    const score = scoreHeaderMapping('custom date column', 'date');
    expect(score).toBeGreaterThanOrEqual(0.8);
    expect(score).toBeLessThan(1.0);
  });

  it('returns 0.5 for data-pattern match on date-like values', () => {
    // Column name does not match date synonyms or contain "date",
    // but column data looks like dates
    const columnData = ['15 Mar 2026', '16 Mar 2026', '17 Mar 2026'];
    const score = scoreHeaderMapping('col_xyz_unknown', 'date', columnData);
    expect(score).toBeGreaterThanOrEqual(0.5);
    expect(score).toBeLessThan(0.8);
  });

  it('returns 0.5 for data-pattern match on amount-like values', () => {
    const columnData = ['£12.50', '£8.99', '£125.00'];
    const score = scoreHeaderMapping('col_xyz_unknown', 'amount', columnData);
    expect(score).toBeGreaterThanOrEqual(0.5);
    expect(score).toBeLessThan(0.8);
  });

  it('returns 0.0 for no match', () => {
    expect(scoreHeaderMapping('random_xyz_completely_unknown', 'date')).toBe(0.0);
  });

  it('returns 0.0 for ignore canonical field', () => {
    expect(scoreHeaderMapping('Location', 'ignore')).toBe(0.0);
  });
});

describe('detectProfile', () => {
  it('detects Nationwide Current Account (confidence threshold ≥ 0.8)', () => {
    const headers = ['Date', 'Transactions', 'Paid out', 'Paid in', 'Balance'];
    const result = detectProfile(headers, profiles);
    expect(result.status).toBe('matched');
    if (result.status === 'matched') {
      expect(result.profileName).toBe('Nationwide Current Account');
      expect(result.mappings.length).toBeGreaterThan(0);
    }
  });

  it('detects Nationwide Credit Card when Location column is present', () => {
    const headers = ['Date', 'Transactions', 'Paid out', 'Paid in', 'Location'];
    const result = detectProfile(headers, profiles);
    expect(result.status).toBe('matched');
    if (result.status === 'matched') {
      expect(result.profileName).toBe('Nationwide Credit Card');
    }
  });

  it('detects NewDay Credit Card (confidence threshold ≥ 0.7)', () => {
    const headers = ['Date', 'Description', 'Amount'];
    const result = detectProfile(headers, profiles);
    expect(result.status).toBe('matched');
    if (result.status === 'matched') {
      expect(result.profileName).toBe('NewDay Credit Card');
    }
  });

  it('returns unrecognised for completely unknown headers', () => {
    const headers = ['Ref Number', 'Memo Text', 'Val XYZ', 'Code'];
    const result = detectProfile(headers, profiles);
    expect(result.status).toBe('unrecognised');
    if (result.status === 'unrecognised') {
      expect(Array.isArray(result.suggestedMappings)).toBe(true);
    }
  });

  it('returns unrecognised and provides suggestedMappings for partial matches', () => {
    const headers = ['some_date_field', 'note', 'val'];
    const result = detectProfile(headers, profiles);
    expect(result.status).toBe('unrecognised');
    if (result.status === 'unrecognised') {
      expect(result.suggestedMappings.length).toBe(headers.length);
    }
  });
});
