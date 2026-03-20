import { useState } from 'react';
import { usePeople } from '../../hooks/usePeople';

export function PeopleScreen() {
  const { allPeople, addPerson, deactivatePerson, reactivatePerson, isLoading } = usePeople();
  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAddError(null);
    try {
      await addPerson(trimmed);
      setNewName('');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add person');
    }
  }

  async function handleToggle(name: string, currentStatus: 'active' | 'inactive') {
    setActionError(null);
    try {
      if (currentStatus === 'active') {
        await deactivatePerson(name);
      } else {
        await reactivatePerson(name);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update person');
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">People</h1>

      {/* Add Person Form */}
      <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg">
        <h2 className="text-lg font-medium mb-3">Add Person</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Person name"
            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
        {addError && <p className="mt-2 text-sm text-red-600">{addError}</p>}
      </div>

      {/* Action error */}
      {actionError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* People List */}
      {isLoading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Created</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allPeople.map((person) => (
              <tr key={person.name} className="border-b border-gray-100 py-2">
                <td className="py-3 font-medium">
                  {person.name}
                  {person.isDefault && (
                    <span className="ml-2 text-xs text-gray-400">(default)</span>
                  )}
                </td>
                <td className="py-3 text-sm text-gray-600">{person.createdDate}</td>
                <td className="py-3">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      person.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {person.status}
                  </span>
                </td>
                <td className="py-3">
                  {!person.isDefault && (
                    <button
                      onClick={() => handleToggle(person.name, person.status)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {person.status === 'active' ? 'Deactivate' : 'Reactivate'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
