import { useLedgerContext } from '../store/LedgerContext';

export function useLedger() {
  return useLedgerContext();
}
