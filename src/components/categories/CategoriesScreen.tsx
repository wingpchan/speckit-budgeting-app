import { useState, useMemo } from 'react';
import { useSession } from '../../store/SessionContext';
import {
  getAllCategories,
  addCategory as addCategoryService,
  deactivateCategory as deactivateCategoryService,
  reactivateCategory as reactivateCategoryService,
} from '../../services/categoriser/category.service';
import { appendRecords as appendToLedger } from '../../services/ledger/ledger-writer';
import type { CategoryRecord } from '../../models/index';

interface CategoriesScreenProps {
  categories: CategoryRecord[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
}

export function CategoriesScreen({ categories, isLoading, onRefresh }: CategoriesScreenProps) {
  const { state } = useSession();
  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const allCategories = useMemo(
    () => getAllCategories(categories).sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );

  function makeAppendRecords() {
    return async (rows: string[]) => {
      if (!state.dirHandle) throw new Error('No ledger directory selected');
      await appendToLedger(state.dirHandle, rows);
      await onRefresh();
    };
  }

  async function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAddError(null);
    try {
      await addCategoryService(trimmed, {} as FileSystemDirectoryHandle, categories, makeAppendRecords());
      setNewName('');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add category');
    }
  }

  async function handleToggle(name: string, currentStatus: 'active' | 'inactive') {
    setActionError(null);
    try {
      if (currentStatus === 'active') {
        await deactivateCategoryService(name, {} as FileSystemDirectoryHandle, categories, makeAppendRecords());
      } else {
        await reactivateCategoryService(name, {} as FileSystemDirectoryHandle, categories, makeAppendRecords());
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update category');
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Categories</h1>

      {/* Add Category Form */}
      <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg">
        <h2 className="text-lg font-medium mb-3">Add Category</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Category name"
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

      {/* Categories List */}
      {isLoading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 text-left bg-[#ede9fe] border-[#c4b5fd] text-[#4338ca]">
              <th className="pb-2 font-semibold text-[13px]">Name</th>
              <th className="pb-2 font-semibold text-[13px]">Type</th>
              <th className="pb-2 font-semibold text-[13px]">Status</th>
              <th className="pb-2 font-semibold text-[13px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allCategories.map((cat) => (
              <tr key={cat.name} className="border-b border-gray-100">
                <td className="py-3 font-medium">{cat.name}</td>
                <td className="py-3">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      cat.isDefault
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {cat.isDefault ? 'Default' : 'Custom'}
                  </span>
                </td>
                <td className="py-3">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      cat.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {cat.status}
                  </span>
                </td>
                <td className="py-3">
                  <button
                    onClick={() => handleToggle(cat.name, cat.status)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {cat.status === 'active' ? 'Deactivate' : 'Reactivate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
