import { describe, it, expect } from 'vitest';
import { scoreHeaderMapping, detectProfile } from '../../../../src/services/csv-parser/detection-registry';
import { csvParserService } from '../../../../src/services/csv-parser/csv-parser.service';
import { ParseError } from '../../../../src/services/csv-parser/types';
import { REFERENCE_FORMAT_PROFILES } from '../../../../src/models/constants';
import type { FormatProfileRecord, ColumnMapping } from '../../../../src/models/index';

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

// Helper: find a mapping by sourceHeader within suggestedMappings
function findMapping(
  result: ReturnType<typeof detectProfile>,
  header: string,
) {
  if (result.status !== 'unrecognised') return undefined;
  return result.suggestedMappings.find(
    (m) => m.sourceHeader?.toLowerCase() === header.toLowerCase(),
  );
}

describe('Format 4: Date, Description, Money In, Money Out', () => {
  const headers = ['Date', 'Description', 'Money In', 'Money Out'];

  it('auto-detects paidIn for "Money In"', () => {
    const result = detectProfile(headers, []);
    expect(result.status).toBe('unrecognised');
    expect(findMapping(result, 'Money In')?.canonicalField).toBe('paidIn');
  });

  it('auto-detects paidOut for "Money Out"', () => {
    const result = detectProfile(headers, []);
    expect(result.status).toBe('unrecognised');
    expect(findMapping(result, 'Money Out')?.canonicalField).toBe('paidOut');
  });

  it('auto-detects date and description', () => {
    const result = detectProfile(headers, []);
    expect(result.status).toBe('unrecognised');
    expect(findMapping(result, 'Date')?.canonicalField).toBe('date');
    expect(findMapping(result, 'Description')?.canonicalField).toBe('description');
  });
});

describe('Format 5: Transaction Date, Posted Date, Description, Debit, Credit, Balance', () => {
  const headers = ['Transaction Date', 'Posted Date', 'Description', 'Debit', 'Credit', 'Balance'];

  it('maps Transaction Date → date and Posted Date → ignore', () => {
    const result = detectProfile(headers, []);
    expect(result.status).toBe('unrecognised');
    expect(findMapping(result, 'Transaction Date')?.canonicalField).toBe('date');
    expect(findMapping(result, 'Posted Date')?.canonicalField).toBe('ignore');
  });

  it('maps Debit → paidOut and Credit → paidIn', () => {
    const result = detectProfile(headers, []);
    expect(result.status).toBe('unrecognised');
    expect(findMapping(result, 'Debit')?.canonicalField).toBe('paidOut');
    expect(findMapping(result, 'Credit')?.canonicalField).toBe('paidIn');
  });

  it('maps Balance → balance', () => {
    const result = detectProfile(headers, []);
    expect(result.status).toBe('unrecognised');
    expect(findMapping(result, 'Balance')?.canonicalField).toBe('balance');
  });

  it('coexistence rule applies even when Posted Date appears before Transaction Date', () => {
    const reversed = ['Posted Date', 'Transaction Date', 'Description', 'Debit', 'Credit', 'Balance'];
    const result = detectProfile(reversed, []);
    expect(result.status).toBe('unrecognised');
    expect(findMapping(result, 'Transaction Date')?.canonicalField).toBe('date');
    expect(findMapping(result, 'Posted Date')?.canonicalField).toBe('ignore');
  });
});

describe('Format 6: Monzo-style — Date, Name, Type, Category, Amount, Currency', () => {
  const headers = ['Date', 'Name', 'Type', 'Category', 'Amount', 'Currency'];
  const dataRows = [['2026-03-15', 'TESCO METRO', 'Payment', 'Groceries', '-5.50', 'GBP']];

  it('maps Name → description', () => {
    const result = detectProfile(headers, [], dataRows);
    expect(result.status).toBe('unrecognised');
    expect(findMapping(result, 'Name')?.canonicalField).toBe('description');
  });

  it('maps Type, Category, Currency → ignore', () => {
    const result = detectProfile(headers, [], dataRows);
    expect(result.status).toBe('unrecognised');
    expect(findMapping(result, 'Type')?.canonicalField).toBe('ignore');
    expect(findMapping(result, 'Category')?.canonicalField).toBe('ignore');
    expect(findMapping(result, 'Currency')?.canonicalField).toBe('ignore');
  });

  it('maps Amount → amount', () => {
    const result = detectProfile(headers, [], dataRows);
    expect(result.status).toBe('unrecognised');
    expect(findMapping(result, 'Amount')?.canonicalField).toBe('amount');
  });

  it('assigns parseISODate transform when date data matches YYYY-MM-DD', () => {
    const result = detectProfile(headers, [], dataRows);
    expect(result.status).toBe('unrecognised');
    expect(findMapping(result, 'Date')?.canonicalField).toBe('date');
    expect(findMapping(result, 'Date')?.transform).toBe('parseISODate');
  });
});

// ---------------------------------------------------------------------------
// csvParserService edge cases
// ---------------------------------------------------------------------------

function makeFile(content: string): File {
  return new File([content], 'test.csv', { type: 'text/csv' });
}

const AMOUNT_MAPPINGS: ColumnMapping[] = [
  { sourceHeader: 'Date', canonicalField: 'date' },
  { sourceHeader: 'Description', canonicalField: 'description' },
  { sourceHeader: 'Amount', canonicalField: 'amount' },
];

describe('csvParserService edge cases', () => {
  it('throws ParseError(NO_FINANCIAL_DATA) for a CSV with header only and no data rows', async () => {
    const csv = 'Date,Description,Amount\n';
    await expect(
      csvParserService.parseWithMapping(makeFile(csv), AMOUNT_MAPPINGS, {
        metadataRowCount: 0,
        dateFormat: 'YYYY-MM-DD',
      }),
    ).rejects.toSatisfy((err: unknown) => err instanceof ParseError && err.code === 'NO_FINANCIAL_DATA');
  });

  it('emits a ParseWarning and skips a row with a malformed date', async () => {
    const csv = 'Date,Description,Amount\nnot-a-date,Test,10.00\n2026-01-15,Valid,5.00\n';
    const result = await csvParserService.parseWithMapping(makeFile(csv), AMOUNT_MAPPINGS, {
      metadataRowCount: 0,
      dateFormat: 'YYYY-MM-DD',
    });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].date).toBe('2026-01-15');
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].field).toBe('date');
    expect(result.warnings[0].message).toMatch(/malformed date/i);
  });

  it('emits a ParseWarning and skips a row with a non-numeric amount', async () => {
    const csv = 'Date,Description,Amount\n2026-01-15,Test,not-a-number\n2026-01-16,Valid,5.00\n';
    const result = await csvParserService.parseWithMapping(makeFile(csv), AMOUNT_MAPPINGS, {
      metadataRowCount: 0,
      dateFormat: 'YYYY-MM-DD',
    });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].date).toBe('2026-01-16');
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].field).toBe('amount');
    expect(result.warnings[0].message).toMatch(/non-numeric/i);
  });
});
