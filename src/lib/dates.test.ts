import { describe, expect, it } from 'vitest';
import { defaultStartInMonth, upcomingMonths } from './dates';

// Thu 25 Sep 2026
const today = new Date(2026, 8, 25);

describe('dates', () => {
  it('lists the next 12 months across the year boundary', () => {
    const m = upcomingMonths(today);
    expect(m).toHaveLength(12);
    expect(m[0]).toEqual({ year: 2026, month: 9 });
    expect(m[3]).toEqual({ year: 2026, month: 12 });
    expect(m[4]).toEqual({ year: 2027, month: 1 });
  });

  it('picks the first Saturday of a future month', () => {
    expect(defaultStartInMonth({ year: 2026, month: 11 }, today)).toBe('2026-11-07');
  });

  it('picks the next Saturday after today in the current month', () => {
    expect(defaultStartInMonth({ year: 2026, month: 9 }, today)).toBe('2026-09-26');
  });

  it('falls back to tomorrow when no Saturday is left in the month', () => {
    // Sun 27 Sep 2026 → next Saturday is 3 Oct, outside September.
    expect(defaultStartInMonth({ year: 2026, month: 9 }, new Date(2026, 8, 27))).toBe('2026-09-28');
  });
});
