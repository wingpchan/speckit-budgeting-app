import { useState } from 'react';
import { TransactionList } from '../import/TransactionList';
import { searchTransactions } from '../../services/search/search.service';
import type { CategoryRecord, TransactionRecord } from '../../models/index';

interface SearchScreenProps {
  transactions: TransactionRecord[];
  categories: CategoryRecord[];
}

export function SearchScreen({ transactions, categories }: SearchScreenProps) {
  const [query, setQuery] = useState('');

  const results = searchTransactions(query, transactions);

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Search Transactions</h2>
      <input
        type="text"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by description…"
        className="w-full text-sm text-gray-700 border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
      <TransactionList transactions={results} categories={categories} />
    </div>
  );
}
