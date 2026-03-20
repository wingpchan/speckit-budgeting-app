import { describe, it, expect } from 'vitest';
import { parsePenceFromString, formatPence } from '../../../src/utils/pence';

describe('parsePenceFromString', () => {
  it('parses a positive GBP string', () => {
    expect(parsePenceFromString('£12.50')).toBe(1250);
  });

  it('parses a negative GBP string', () => {
    expect(parsePenceFromString('-£5.00')).toBe(-500);
  });

  it('handles a large safe integer', () => {
    expect(parsePenceFromString('£100000.00')).toBe(10000000);
  });

  it('parses zero', () => {
    expect(parsePenceFromString('£0.00')).toBe(0);
  });

  it('handles values without £ symbol', () => {
    expect(parsePenceFromString('12.50')).toBe(1250);
  });

  it('handles comma-formatted values', () => {
    expect(parsePenceFromString('£1,250.00')).toBe(125000);
  });
});

describe('formatPence', () => {
  it('formats a positive pence value', () => {
    expect(formatPence(1250)).toBe('£12.50');
  });

  it('formats a negative pence value', () => {
    expect(formatPence(-500)).toBe('-£5.00');
  });

  it('formats zero', () => {
    expect(formatPence(0)).toBe('£0.00');
  });

  it('formats large values', () => {
    expect(formatPence(10000000)).toBe('£100000.00');
  });
});
