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

const inputStyle: React.CSSProperties = {
  fontSize: '11px',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 4,
  padding: '3px 6px',
  color: 'white',
  colorScheme: 'dark',
  width: '116px',
  outline: 'none',
};

const groupLabelStyle: React.CSSProperties = {
  color: '#c7d2fe',
  textAlign: 'left',
  fontSize: '10px',
  lineHeight: 1,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  whiteSpace: 'nowrap',
};

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
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      {/* Group 1 — Period preset + label */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
        <span style={groupLabelStyle}>Filter by period</span>
        <div
          style={{
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 6,
            padding: 2,
            display: 'flex',
          }}
        >
          {PRESETS.map(({ value, label: btnLabel }) => (
            <button
              key={value}
              onClick={() => handlePreset(value)}
              style={{
                color: preset === value ? 'white' : '#a5b4fc',
                background: preset === value ? 'rgba(255,255,255,0.18)' : 'transparent',
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                fontWeight: preset === value ? 500 : 400,
                transition: 'color 0.15s, background 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {btnLabel}
            </button>
          ))}
        </div>
        <span style={{ color: '#818cf8', fontSize: '10px', whiteSpace: 'nowrap', lineHeight: 1, minHeight: '10px' }}>
          {label}
        </span>
      </div>

      {/* Divider */}
      <div
        style={{
          width: 1,
          height: 32,
          background: 'rgba(255,255,255,0.1)',
          flexShrink: 0,
        }}
      />

      {/* Group 2 — Date range */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
        <span style={groupLabelStyle}>Filter by date range</span>
        <div className="flex items-center gap-1">
          <input
            type="date"
            aria-label="Start date"
            value={start}
            onChange={(e) => handleCustomChange('start', e.target.value)}
            style={inputStyle}
          />
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
            <path d="M3 8h10M9 4l4 4-4 4" stroke="#c7d2fe" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <input
            type="date"
            aria-label="End date"
            value={end}
            onChange={(e) => handleCustomChange('end', e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>
    </div>
  );
}
