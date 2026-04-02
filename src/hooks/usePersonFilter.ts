import { useSession } from '../store/SessionContext';

/**
 * Pure filter function — no hook context required.
 * Returns all records when personFilter is null; otherwise filters to records where
 * personName === personFilter.
 */
export function filterByPerson<T extends { personName: string }>(
  records: T[],
  personFilter: string | null,
): T[] {
  if (personFilter === null) return records;
  return records.filter((r) => r.personName === personFilter);
}

/**
 * Returns the current person filter value from SessionContext.
 * null means "All" (no person filter — all transactions are returned).
 */
export function usePersonFilter(): string | null {
  const { state } = useSession();
  return state.personFilter;
}
