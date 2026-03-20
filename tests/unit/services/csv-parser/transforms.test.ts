import { describe, it, expect } from 'vitest';
import {
  stripPound,
  parseDDMonYYYYTransform,
  parseUKDateTransform,
  absAmount,
  negateAmount,
  mergeAmountColumns,
} from '../../../../src/services/csv-parser/transforms';
import { parsePenceFromString } from '../../../../src/utils/pence';

describe('stripPound', () => {
  it('parses "£12.50" → 1250 pence', () => {
    expect(stripPound('£12.50')).toBe(1250);
  });

  it('parses "£0.99" → 99 pence', () => {
    expect(stripPound('£0.99')).toBe(99);
  });

  it('parses "£1,234.56" → 123456 pence', () => {
    expect(stripPound('£1,234.56')).toBe(123456);
  });

  it('parses empty string → 0 pence', () => {
    expect(stripPound('')).toBe(0);
  });

  it('parses "£0.00" → 0 pence', () => {
    expect(stripPound('£0.00')).toBe(0);
  });
});

describe('parseDDMonYYYYTransform', () => {
  it('parses "15 Mar 2026" → "2026-03-15"', () => {
    expect(parseDDMonYYYYTransform('15 Mar 2026')).toBe('2026-03-15');
  });

  it('parses "01 Jan 2024" → "2024-01-01"', () => {
    expect(parseDDMonYYYYTransform('01 Jan 2024')).toBe('2024-01-01');
  });

  it('parses "31 Dec 2025" → "2025-12-31"', () => {
    expect(parseDDMonYYYYTransform('31 Dec 2025')).toBe('2025-12-31');
  });

  it('throws for invalid input', () => {
    expect(() => parseDDMonYYYYTransform('not-a-date')).toThrow();
  });

  it('throws for empty string', () => {
    expect(() => parseDDMonYYYYTransform('')).toThrow();
  });
});

describe('parseUKDateTransform', () => {
  it('parses "15/03/2026" → "2026-03-15"', () => {
    expect(parseUKDateTransform('15/03/2026')).toBe('2026-03-15');
  });

  it('parses "01/01/2024" → "2024-01-01"', () => {
    expect(parseUKDateTransform('01/01/2024')).toBe('2024-01-01');
  });

  it('throws for invalid input', () => {
    expect(() => parseUKDateTransform('not-a-date')).toThrow();
  });

  it('throws for empty string', () => {
    expect(() => parseUKDateTransform('')).toThrow();
  });
});

describe('mergeAmountColumns (paidOut/paidIn split)', () => {
  it('paidOut has value → negative amount, expense type', () => {
    const result = mergeAmountColumns({ paidOut: 1250, paidIn: 0 });
    expect(result.amount).toBe(-1250);
    expect(result.transactionType).toBe('expense');
  });

  it('paidIn has value → positive amount, income type', () => {
    const result = mergeAmountColumns({ paidOut: 0, paidIn: 850 });
    expect(result.amount).toBe(850);
    expect(result.transactionType).toBe('income');
  });

  it('both zero → income type with 0 amount', () => {
    const result = mergeAmountColumns({ paidOut: 0, paidIn: 0 });
    expect(result.amount).toBe(0);
    expect(result.transactionType).toBe('income');
  });
});

describe('absAmount', () => {
  it('returns absolute pence from negative string', () => {
    expect(absAmount('-12.50')).toBe(1250);
  });

  it('returns absolute pence from positive string', () => {
    expect(absAmount('12.50')).toBe(1250);
  });
});

describe('negateAmount', () => {
  it('negates a positive pence value', () => {
    expect(negateAmount('12.50')).toBe(-1250);
  });

  it('negates a negative pence value (makes it positive)', () => {
    expect(negateAmount('-12.50')).toBe(1250);
  });
});

describe('NewDay signed amount passthrough', () => {
  it('negative signed amount → expense (amount < 0)', () => {
    // NewDay Amount column has no transform; parsePenceFromString handles signed values
    const amount = parsePenceFromString('-12.50');
    expect(amount).toBe(-1250);
    const transactionType = amount < 0 ? 'expense' : 'income';
    expect(transactionType).toBe('expense');
  });

  it('positive signed amount → income (amount > 0)', () => {
    const amount = parsePenceFromString('25.00');
    expect(amount).toBe(2500);
    const transactionType = amount < 0 ? 'expense' : 'income';
    expect(transactionType).toBe('income');
  });
});
