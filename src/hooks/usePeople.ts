import { useCallback } from 'react';
import { useLedger } from './useLedger';
import {
  getActivePeople,
  getAllPeople,
  addPerson as addPersonService,
  deactivatePerson as deactivatePersonService,
  reactivatePerson as reactivatePersonService,
} from '../services/people/people.service';
import { useSession } from '../store/SessionContext';
import type { PersonRecord } from '../models/index';

interface UsePeopleResult {
  allPeople: PersonRecord[];
  activePeople: PersonRecord[];
  addPerson: (name: string) => Promise<void>;
  deactivatePerson: (name: string) => Promise<void>;
  reactivatePerson: (name: string) => Promise<void>;
  isLoading: boolean;
}

export function usePeople(): UsePeopleResult {
  const { state } = useSession();
  const { dirHandle } = state;
  const { records, isLoading, appendRecords } = useLedger();

  const personRecords = records.filter((r): r is PersonRecord => r.type === 'person');
  const noop = {} as FileSystemDirectoryHandle; // service signature includes dirHandle but doesn't use it

  const addPerson = useCallback(
    (name: string) => addPersonService(name, noop, personRecords, appendRecords),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [personRecords, appendRecords],
  );

  const deactivatePerson = useCallback(
    (name: string) => deactivatePersonService(name, noop, personRecords, appendRecords),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [personRecords, appendRecords],
  );

  const reactivatePerson = useCallback(
    (name: string) => reactivatePersonService(name, noop, personRecords, appendRecords),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [personRecords, appendRecords],
  );

  void dirHandle; // referenced via useLedger

  return {
    allPeople: getAllPeople(personRecords),
    activePeople: getActivePeople(personRecords),
    addPerson,
    deactivatePerson,
    reactivatePerson,
    isLoading,
  };
}
