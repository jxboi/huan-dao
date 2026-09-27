import { useMemo } from 'react';
import { WEATHER } from '../data/guide';
import { HOLIDAYS } from '../data/holidays';
import { defaultStartInMonth, upcomingMonths } from '../lib/dates';
import { fmtRange } from '../lib/holidays';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const RATING_LABEL = { best: 'Best', good: 'Good', fair: 'Rainy', poor: 'Typhoons' } as const;

/**
 * Pick a start month from a strip coloured by riding weather, then fine-tune the exact day.
 * Picking a month sets the first Saturday in it; the date input below adjusts it.
 */
export function MonthPicker({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const today = useMemo(() => new Date(), []);
  const months = useMemo(() => upcomingMonths(today), [today]);
  const selYear = value ? Number(value.slice(0, 4)) : 0;
  const selMonth = value ? Number(value.slice(5, 7)) : 0;
  const weather = WEATHER.find((w) => w.month === selMonth);
  const ym = value.slice(0, 7);
  const holidays = value ? HOLIDAYS.filter((h) => h.start.slice(0, 7) === ym || h.end.slice(0, 7) === ym) : [];

  return (
    <div className="month-picker">
      <div className="mp-strip" role="radiogroup" aria-label="Start month">
        {months.map((m) => {
          const w = WEATHER.find((x) => x.month === m.month)!;
          const on = m.year === selYear && m.month === selMonth;
          return (
            <button
              key={`${m.year}-${m.month}`}
              type="button"
              role="radio"
              aria-checked={on}
              className={`mp-month ${w.rating} ${on ? 'on' : ''}`}
              onClick={() => onChange(defaultStartInMonth(m, today))}
            >
              <span className="mp-name">{MONTHS[m.month - 1]}</span>
              <span className="mp-year">{m.month === 1 || m === months[0] ? m.year : ' '}</span>
              <span className="mp-rating">{RATING_LABEL[w.rating]}</span>
            </button>
          );
        })}
      </div>
      <p className="mp-note">{weather ? weather.note : 'Best riding: Mar–Apr and Oct–Nov. Typhoon season peaks Jul–Sep.'}</p>
      {holidays.length > 0 && (
        <p className="mp-note mp-holidays">
          Holidays (busy, pricier rooms): {holidays.map((h) => `${h.name} ${fmtRange(h)}`).join(' · ')}
        </p>
      )}
      <div className="mp-exact">
        <label>
          <span>Exact start day</span>
          <input type="date" className="input" value={value} onChange={(e) => onChange(e.target.value)} />
        </label>
        <button type="button" className={`chip ${value ? '' : 'on'}`} onClick={() => onChange('')}>
          Not sure yet
        </button>
      </div>
    </div>
  );
}
