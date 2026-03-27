import { describe, it, expect } from 'vitest';
import { searchTransactions } from '../../../src/services/search/search.service';
import type { TransactionRecord } from '../../../src/models/index';

function makeTx(description: string, personName = 'Alice'): TransactionRecord {
  return {
    type: 'transaction',
    date: '2026-01-15',
    description,
    amount: -500,
    transactionType: 'expense',
    category: 'Groceries',
    account: 'Current',
    sourceFile: 'bank.csv',
    importedDate: '2026-01-16',
    contentHash: description,
    personName,
  };
}

const records: TransactionRecord[] = [
  makeTx('TESCO STORES 1234'),
  makeTx('AMAZON.CO.UK'),
  makeTx('NETFLIX.COM'),
  makeTx('Tesco Express 5678'),
];

describe('searchTransactions', () => {
  it('matches description containing query case-insensitively', () => {
    const results = searchTransactions('tesco', records);
    expect(results).toHaveLength(2);
    expect(results[0].description).toBe('TESCO STORES 1234');
    expect(results[1].description).toBe('Tesco Express 5678');
  });

  it('empty query returns all records', () => {
    const results = searchTransactions('', records);
    expect(results).toHaveLength(records.length);
  });

  it('query with no matches returns empty array', () => {
    const results = searchTransactions('XYZ_NO_MATCH_99', records);
    expect(results).toHaveLength(0);
  });

  it('search composes correctly when pre-filtered records are passed in', () => {
    const personFiltered = records.filter((r) => r.personName === 'Alice');
    const results = searchTransactions('tesco', personFiltered);
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.personName === 'Alice')).toBe(true);
  });
});
