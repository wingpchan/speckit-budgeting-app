/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { SessionState } from '../models/index';

function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const start = new Date(year, month, 1).toISOString().slice(0, 10);
  const end = new Date(year, month + 1, 0).toISOString().slice(0, 10);
  return { start, end };
}

const { start: initialStart, end: initialEnd } = getCurrentMonthRange();

const initialState: SessionState = {
  dirHandle: null,
  ledgerHandleKey: null,
  dateFilter: {
    preset: 'monthly',
    start: initialStart,
    end: initialEnd,
  },
  personFilter: null,
};

type Action =
  | { type: 'SET_LEDGER_HANDLE'; handle: FileSystemDirectoryHandle | null }
  | { type: 'SET_DATE_FILTER'; start: string; end: string }
  | { type: 'SET_PERSON_FILTER'; personName: string | null }
  | {
      type: 'SET_VIEW_PRESET';
      preset: 'weekly' | 'monthly' | 'yearly' | 'custom';
      start?: string;
      end?: string;
    };

function sessionReducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case 'SET_LEDGER_HANDLE':
      return { ...state, dirHandle: action.handle, ledgerHandleKey: action.handle ? HANDLE_KEY : null };

    case 'SET_DATE_FILTER':
      return {
        ...state,
        dateFilter: { ...state.dateFilter, start: action.start, end: action.end },
      };

    case 'SET_PERSON_FILTER':
      return { ...state, personFilter: action.personName };

    case 'SET_VIEW_PRESET': {
      const { preset, start, end } = action;
      if (preset === 'custom' && start && end) {
        return { ...state, dateFilter: { preset, start, end } };
      }
      return { ...state, dateFilter: { ...state.dateFilter, preset } };
    }

    default:
      return state;
  }
}

const HANDLE_KEY = 'ledger-dir-handle';

interface SessionContextValue {
  state: SessionState;
  dispatch: React.Dispatch<Action>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(sessionReducer, initialState);
  return (
    <SessionContext.Provider value={{ state, dispatch }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
