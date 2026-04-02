import { useSession } from '../../store/SessionContext';
import { getMondayOfWeek, toWeekLabel, toMonthLabel } from '../../utils/dates';

type Preset = 'weekly' | 'monthly' | 'yearly';

const PRESETS: Array<{ value: Preset; label: string }> = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

function getPresetRange(p: Preset): { start: string; end: string } {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const date = now.getUTCDate();
  const day = now.getUTCDay();
  switch (p) {
    case 'weekly': {
      const mondayOffset = day === 0 ? -6 : 1 - day;
      return {
        start: new Date(Date.UTC(year, month, date + mondayOffset)).toISOString().slice(0, 10),
        end: new Date(Date.UTC(year, month, date + mondayOffset + 6)).toISOString().slice(0, 10),
      };
    }
    case 'monthly':
      return {
        start: new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10),
        end: new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10),
      };
    case 'yearly':
      return {
        start: `${year}-01-01`,
        end: `${year}-12-31`,
      };
  }
}

function formatShort(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function computeLabel(preset: string, start: string, end: string): string {
  if (!start) return '';
  switch (preset) {
    case 'weekly':
      return toWeekLabel(getMondayOfWeek(start));
    case 'monthly':
      return toMonthLabel(start.slice(0, 7));
    case 'yearly':
      return start.slice(0, 4);
    default:
      return end ? `${formatShort(start)} – ${formatShort(end)}` : formatShort(start);
  }
}

export function DateRangePicker() {
  const { state, dispatch } = useSession();
  const { preset, start, end } = state.dateFilter;

  function handlePreset(p: Preset) {
    const range = getPresetRange(p);
    dispatch({ type: 'SET_VIEW_PRESET', preset: p });
    dispatch({ type: 'SET_DATE_FILTER', start: range.start, end: range.end });
  }

  function handleCustomChange(field: 'start' | 'end', value: string) {
    if (value === '') {
      // Native clear: reset to preset's default range, or clear both inputs if custom
      if (preset !== 'custom') {
        const range = getPresetRange(preset as Preset);
        dispatch({ type: 'SET_DATE_FILTER', start: range.start, end: range.end });
      } else {
        dispatch({ type: 'SET_DATE_FILTER', start: '', end: '' });
      }
      return;
    }
    const otherValue = preset === 'custom' ? (field === 'start' ? end : start) : '';
    const newStart = field === 'start' ? value : otherValue;
    const newEnd = field === 'end' ? value : otherValue;
    dispatch({ type: 'SET_VIEW_PRESET', preset: 'custom', start: newStart, end: newEnd });
  }

  const label = computeLabel(preset, start, end);

  return (
    <div className="flex items-center gap-2">
      <div className="flex rounded border border-gray-200 overflow-hidden text-xs">
        {PRESETS.map(({ value, label: btnLabel }) => (
          <button
            key={value}
            onClick={() => handlePreset(value)}
            className={`px-2 py-1 font-medium transition-colors ${
              preset === value
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {btnLabel}
          </button>
        ))}
      </div>
      {/* Date inputs in a relative wrapper so the label can sit below without affecting flow height */}
      <div className="relative flex items-center gap-2">
        <input
          type="date"
          aria-label="Start date"
          value={start}
          onChange={(e) => handleCustomChange('start', e.target.value)}
          className="text-xs border border-gray-200 rounded px-2 py-1 w-32 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
        <span className="text-xs text-gray-400" aria-hidden="true">–</span>
        <input
          type="date"
          aria-label="End date"
          value={end}
          onChange={(e) => handleCustomChange('end', e.target.value)}
          className="text-xs border border-gray-200 rounded px-2 py-1 w-32 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
        {label && (
          <span className="absolute top-full right-0 mt-0.5 text-xs text-indigo-600 font-medium whitespace-nowrap leading-none pointer-events-none">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
