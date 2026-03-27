import type { TransactionRecord } from '../../models/index';

export function searchTransactions(
  query: string,
  transactions: TransactionRecord[],
): TransactionRecord[] {
  if (query === '') return transactions;
  const lower = query.toLowerCase();
  return transactions.filter((tx) => tx.description.toLowerCase().includes(lower));
}
