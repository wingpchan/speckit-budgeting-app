import { describe, it, expect } from 'vitest';
import {
  stripPound,
  parseDDMonYYYYTransform,
  parseUKDateTransform,
  parseISODate,
  absAmount,
  negateAmount,
  mergeAmountColumns,
} from '../../../../src/services/csv-parser/transforms';
import { parsePenceFromString } from '../../../../src/utils/pence';
import { csvParserService } from '../../../../src/services/csv-parser/csv-parser.service';
import { buildKeywordIndex, categorise } from '../../../../src/services/categoriser/categoriser.service';
import { DEFAULT_KEYWORD_MAP } from '../../../../src/models/constants';
import type { CanonicalField } from '../../../../src/models/index';
import type { CategoryRecord } from '../../../../src/models/index';

/**
 * Encodes a string as Windows-1252 bytes. £ (U+00A3) becomes byte 0xA3;
 * all other characters used in test CSVs are ASCII and identical in both
 * encodings. This mirrors what UK bank CSV files actually contain on disk.
 */
function toWindows1252(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i) === 0x00a3 ? 0xa3 : str.charCodeAt(i);
  }
  return bytes;
}

/** Creates a File whose bytes are Windows-1252 encoded. */
function w1252File(csv: string, name = 'test.csv'): File {
  return new File([toWindows1252(csv)], name, { type: 'text/csv' });
}

describe('stripPound', () => {
  it('parses "£12.50" → 1250 pence', () => {
    expect(stripPound('£12.50')).toBe(1250);
  });

  it('parses "£29.99" → 2999 pence', () => {
    expect(stripPound('£29.99')).toBe(2999);
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

  it('handles Windows-1252 £ mis-decoded as U+FFFD → correct pence', () => {
    // Simulates what happens when a Nationwide CSV saved as Windows-1252
    // is decoded as UTF-8: the £ byte (0xA3) becomes the replacement char.
    expect(stripPound('\uFFFD29.99')).toBe(2999);
  });

  it('strips surrounding quotes left by some CSV parsers', () => {
    expect(stripPound('"£29.99"')).toBe(2999);
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

describe('parseISODate', () => {
  it('returns "2026-03-15" as-is', () => {
    expect(parseISODate('2026-03-15')).toBe('2026-03-15');
  });

  it('returns "2024-01-01" as-is', () => {
    expect(parseISODate('2024-01-01')).toBe('2024-01-01');
  });

  it('trims surrounding whitespace before validating', () => {
    expect(parseISODate(' 2026-03-15 ')).toBe('2026-03-15');
  });

  it('throws for non-ISO format (DD/MM/YYYY)', () => {
    expect(() => parseISODate('15/03/2026')).toThrow();
  });

  it('throws for an invalid calendar date', () => {
    expect(() => parseISODate('2026-02-30')).toThrow();
  });

  it('throws for empty string', () => {
    expect(() => parseISODate('')).toThrow();
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

describe('paidOut / paidIn split-column pipeline', () => {
  const mappings = [
    { sourceHeader: 'Date', canonicalField: 'date' as CanonicalField },
    { sourceHeader: 'Description', canonicalField: 'description' as CanonicalField },
    { sourceHeader: 'Paid out', canonicalField: 'paidOut' as CanonicalField, transform: 'stripPound' as const },
    { sourceHeader: 'Paid in', canonicalField: 'paidIn' as CanonicalField, transform: 'stripPound' as const },
  ];
  const hints = { metadataRowCount: 0, dateFormat: 'DD Mon YYYY' };

  it('paidOut="£29.99", paidIn="" → amount=-2999, transactionType=expense', async () => {
    const csv = 'Date,Description,Paid out,Paid in\n2026-01-05,TESCO METRO,£29.99,';
    const result = await csvParserService.parseWithMapping(w1252File(csv), mappings, hints);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].amount).toBe(-2999);
    expect(result.rows[0].transactionType).toBe('expense');
  });

  it('paidOut="", paidIn="£1047.00" → amount=104700, transactionType=income', async () => {
    // £1047.00 = 104700 pence
    const csv = 'Date,Description,Paid out,Paid in\n2026-01-10,SALARY,,£1047.00';
    const result = await csvParserService.parseWithMapping(w1252File(csv), mappings, hints);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].amount).toBe(104700);
    expect(result.rows[0].transactionType).toBe('income');
  });

  it('paidOut="", paidIn="" → ParseWarning added and row skipped', async () => {
    const csv = [
      'Date,Description,Paid out,Paid in',
      '2026-01-01,SOME ROW,,',
      '2026-01-02,TESCO METRO,£12.00,',
    ].join('\n');
    const file = w1252File(csv);

    const result = await csvParserService.parseWithMapping(file, mappings, hints);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].description).toBe('TESCO METRO');
    expect(result.warnings.some((w) => w.message.includes('paidOut and paidIn are empty'))).toBe(true);
  });
});

describe('skip list filtering', () => {
  const mappings = [
    { sourceHeader: 'Date', canonicalField: 'date' as CanonicalField },
    { sourceHeader: 'Description', canonicalField: 'description' as CanonicalField },
    { sourceHeader: 'Amount', canonicalField: 'amount' as CanonicalField },
  ];
  const hints = { metadataRowCount: 0, dateFormat: 'ISO' };

  it('OPENING BALANCE row is excluded from ParseResult.rows', async () => {
    const csv = [
      'Date,Description,Amount',
      '2026-01-01,OPENING BALANCE,0.00',
      '2026-01-05,TESCO METRO,-25.00',
    ].join('\n');
    const result = await csvParserService.parseWithMapping(w1252File(csv), mappings, hints);

    expect(result.rows.find((r) => r.description === 'OPENING BALANCE')).toBeUndefined();
    expect(result.rows.find((r) => r.description === 'TESCO METRO')).toBeDefined();
  });

  it('CLOSING BALANCE row is excluded from ParseResult.rows', async () => {
    const csv = [
      'Date,Description,Amount',
      '2026-01-31,CLOSING BALANCE,100.00',
      '2026-01-10,NETFLIX,-999',
    ].join('\n');
    const result = await csvParserService.parseWithMapping(w1252File(csv), mappings, hints);

    expect(result.rows.find((r) => r.description === 'CLOSING BALANCE')).toBeUndefined();
    expect(result.rows.find((r) => r.description === 'NETFLIX')).toBeDefined();
  });

  it('skip list match is case-insensitive', async () => {
    const csv = [
      'Date,Description,Amount',
      '2026-01-01,opening balance,0.00',
      '2026-01-02,Closing Balance,0.00',
    ].join('\n');
    const result = await csvParserService.parseWithMapping(w1252File(csv), mappings, hints);

    expect(result.rows).toHaveLength(0);
  });

  it('PAYMENT RECEIVED row is present and categorises as Internal Transfer', async () => {
    const csv = [
      'Date,Description,Amount',
      '2026-01-15,PAYMENT RECEIVED,50.00',
    ].join('\n');
    const result = await csvParserService.parseWithMapping(w1252File(csv), mappings, hints);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].description).toBe('PAYMENT RECEIVED');

    const categories: CategoryRecord[] = [
      { type: 'category', name: 'Internal Transfer', isDefault: true, createdDate: '2026-01-01', status: 'active' },
    ];
    const index = buildKeywordIndex(categories, DEFAULT_KEYWORD_MAP);
    expect(categorise('PAYMENT RECEIVED', index)).toBe('Internal Transfer');
  });
});

describe('Windows-1252 encoding — Nationwide CSV', () => {
  const nationwideMappings = [
    { sourceHeader: 'Date', canonicalField: 'date' as CanonicalField, transform: 'parseDDMonYYYY' as const },
    { sourceHeader: 'Description', canonicalField: 'description' as CanonicalField },
    { sourceHeader: 'Paid out', canonicalField: 'paidOut' as CanonicalField, transform: 'stripPound' as const },
    { sourceHeader: 'Paid in', canonicalField: 'paidIn' as CanonicalField, transform: 'stripPound' as const },
    { sourceHeader: 'Balance', canonicalField: 'balance' as CanonicalField, transform: 'stripPound' as const },
  ];
  const hints = { metadataRowCount: 4, dateFormat: 'DD Mon YYYY' };

  it('debit row with Windows-1252 £ produces correct negative pence amount', async () => {
    const csvText = [
      '"Account Name:","FlexAccount ****01949"',
      '"Account Balance:","£1,234.56"',
      '"Available Balance:","£1,234.56"',
      '',
      'Date,Description,Paid out,Paid in,Balance',
      '15 Mar 2026,TESCO METRO,£29.99,,£1204.57',
    ].join('\r\n');

    const result = await csvParserService.parseWithMapping(w1252File(csvText, 'nationwide.csv'), nationwideMappings, hints);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].amount).toBe(-2999);
    expect(result.rows[0].transactionType).toBe('expense');
    expect(result.rows[0].balance).toBe(120457);
  });

  it('credit row with Windows-1252 £ produces correct positive pence amount', async () => {
    const csvText = [
      '"Account Name:","FlexAccount ****01949"',
      '"Account Balance:","£500.00"',
      '"Available Balance:","£500.00"',
      '',
      'Date,Description,Paid out,Paid in,Balance',
      '01 Mar 2026,SALARY,,£2500.00,£3000.00',
    ].join('\r\n');
    const result = await csvParserService.parseWithMapping(w1252File(csvText, 'nationwide.csv'), nationwideMappings, hints);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].amount).toBe(250000);
    expect(result.rows[0].transactionType).toBe('income');
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
