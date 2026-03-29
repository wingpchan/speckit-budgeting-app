import { useSession } from '../../store/SessionContext';

type Preset = 'weekly' | 'monthly' | 'yearly';

const PRESETS: Array<{ value: Preset; label: string }> = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export function DateRangePicker() {
  const { state, dispatch } = useSession();
  const { preset, start, end } = state.dateFilter;

  function handlePreset(p: Preset) {
    dispatch({ type: 'SET_VIEW_PRESET', preset: p });
  }

  function handleCustomChange(field: 'start' | 'end', value: string) {
    // When transitioning from a preset to custom, leave the other field empty
    const otherValue = preset === 'custom' ? (field === 'start' ? end : start) : '';
    const newStart = field === 'start' ? value : otherValue;
    const newEnd = field === 'end' ? value : otherValue;
    dispatch({ type: 'SET_VIEW_PRESET', preset: 'custom', start: newStart, end: newEnd });
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex rounded border border-gray-200 overflow-hidden text-xs">
        {PRESETS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => handlePreset(value)}
            className={`px-2 py-1 font-medium transition-colors ${
              preset === value
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <input
        type="date"
        aria-label="Start date"
        value={preset === 'custom' ? start : ''}
        onChange={(e) => handleCustomChange('start', e.target.value)}
        className="text-xs border border-gray-200 rounded px-2 py-1 w-32 focus:outline-none focus:ring-1 focus:ring-indigo-400"
      />
      <span className="text-xs text-gray-400" aria-hidden="true">–</span>
      <input
        type="date"
        aria-label="End date"
        value={preset === 'custom' ? end : ''}
        onChange={(e) => handleCustomChange('end', e.target.value)}
        className="text-xs border border-gray-200 rounded px-2 py-1 w-32 focus:outline-none focus:ring-1 focus:ring-indigo-400"
      />
    </div>
  );
}
