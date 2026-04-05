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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
      <span
        style={{
          color: '#c7d2fe',
          fontSize: '12px',
          lineHeight: 1,
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          whiteSpace: 'nowrap',
        }}
      >
        Filter by person
      </span>
      <select
        value={personFilter ?? ''}
        onChange={handleChange}
        style={{
          fontSize: '14px',
          background: '#1e1b4b',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 4,
          padding: '3px 6px',
          color: 'white',
          colorScheme: 'dark',
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        <option value="">All</option>
        {allPeople.map((person) => (
          <option key={person.name} value={person.name}>
            {person.status === 'inactive' ? `${person.name} (inactive)` : person.name}
          </option>
        ))}
      </select>
    </div>
  );
}
