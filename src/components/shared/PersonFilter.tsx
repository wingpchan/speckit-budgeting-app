import { useSession } from '../../store/SessionContext';
import type { PersonRecord } from '../../models/index';

interface PersonFilterProps {
  allPeople: PersonRecord[];
}

export function PersonFilter({ allPeople }: PersonFilterProps) {
  const { state, dispatch } = useSession();
  const { personFilter } = state;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    dispatch({ type: 'SET_PERSON_FILTER', personName: value === '' ? null : value });
  }

  return (
    <select
      value={personFilter ?? ''}
      onChange={handleChange}
      className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
    >
      <option value="">All</option>
      {allPeople.map((person) => (
        <option key={person.name} value={person.name}>
          {person.status === 'inactive' ? `${person.name} (inactive)` : person.name}
        </option>
      ))}
    </select>
  );
}
