import { describe, expect, it } from 'vitest';
import { HOLIDAYS, HOLIDAY_YEARS } from '../data/holidays';
import { defaultSettings } from '../state/settings';
import { addDays } from './dates';
import { fmtRange, holidayNightFactor, holidayOn, holidayRentalFactor, holidaysCovered, holidaysDuring } from './holidays';
import { makePlan } from './planner';

const iso = /^\d{4}-\d{2}-\d{2}$/;
const dow = (d: string) => new Date(`${d}T00:00:00`).getDay();

describe('holiday data', () => {
  it('has valid, ordered, non-overlapping breaks with unique ids', () => {
    expect(new Set(HOLIDAYS.map((h) => h.id)).size).toBe(HOLIDAYS.length);
    HOLIDAYS.forEach((h, i) => {
      expect(h.start, h.id).toMatch(iso);
      expect(h.end, h.id).toMatch(iso);
      expect(h.start <= h.end, h.id).toBe(true);
      expect(HOLIDAY_YEARS, h.id).toContain(Number(h.start.slice(0, 4)));
      if (i > 0) expect(HOLIDAYS[i - 1].end < h.start, h.id).toBe(true);
    });
  });

  it('long weekends include a weekend and are at least 3 days', () => {
    for (const h of HOLIDAYS.filter((x) => x.kind !== 'day')) {
      const days = Array.from({ length: 12 }, (_, i) => addDays(h.start, i)).filter((d) => d <= h.end);
      expect(days.length, h.id).toBeGreaterThanOrEqual(3);
      expect(days.some((d) => dow(d) === 0 || dow(d) === 6), h.id).toBe(true);
    }
  });

  it('covers Lunar New Year for every listed year', () => {
    for (const y of HOLIDAY_YEARS) expect(HOLIDAYS.some((h) => h.kind === 'lunar-new-year' && h.start.startsWith(String(y)))).toBe(true);
  });
});

describe('holiday lookups', () => {
  it('holidayOn finds the break a date is in', () => {
    expect(holidayOn('2026-02-14')?.id).toBe('2026-lny');
    expect(holidayOn('2026-02-22')?.id).toBe('2026-lny');
    expect(holidayOn('2026-02-23')).toBeUndefined();
    expect(holidayOn('2027-09-15')?.kind).toBe('day');
  });

  it('holidaysDuring returns overlapping breaks', () => {
    expect(holidaysDuring('2026-02-10', 5).map((h) => h.id)).toEqual(['2026-lny']);
    expect(holidaysDuring('2026-02-10', 4)).toEqual([]);
    expect(holidaysDuring('2026-02-20', 10).map((h) => h.id)).toEqual(['2026-lny', '2026-228']);
    expect(holidaysDuring('', 10)).toEqual([]);
  });

  it('holidaysCovered checks both ends of the trip', () => {
    expect(holidaysCovered('2026-05-01', 10)).toBe(true);
    expect(holidaysCovered('2027-12-28', 10)).toBe(false);
    expect(holidaysCovered('', 10)).toBe(true);
  });

  it('prices the night before a day off, not the last night of a break', () => {
    expect(holidayNightFactor('2026-02-13')).toBeGreaterThan(1);
    expect(holidayNightFactor('2026-02-21')).toBeGreaterThan(1);
    expect(holidayNightFactor('2026-02-22')).toBe(1);
  });

  it('rental uplift applies to long breaks, not single days off', () => {
    expect(holidayRentalFactor('2026-10-10')).toBeGreaterThan(1);
    expect(holidayRentalFactor('2027-06-09')).toBe(1);
    expect(holidayRentalFactor('2026-11-10')).toBe(1);
  });

  it('formats ranges compactly', () => {
    expect(fmtRange(holidayOn('2026-02-15')!)).toBe('Feb 14–22');
    expect(fmtRange(holidayOn('2026-02-28')!)).toBe('Feb 27 – Mar 1');
    expect(fmtRange(holidayOn('2027-06-09')!)).toBe('Jun 9');
  });
});

describe('planner holiday awareness', () => {
  it('tags days and adds a Lunar New Year note', () => {
    const plan = makePlan({ ...defaultSettings(), days: 8, startDate: '2026-02-12' });
    expect(plan.days[0].holiday).toBeUndefined();
    expect(plan.days[2].holiday?.id).toBe('2026-lny');
    expect(plan.notes.join(' ')).toMatch(/Lunar New Year \(Feb 14–22\)/);
  });

  it('notes long weekends and uncovered years, nothing without a date', () => {
    expect(makePlan({ ...defaultSettings(), days: 6, startDate: '2026-10-07' }).notes.join(' ')).toMatch(/National Day long weekend/);
    expect(makePlan({ ...defaultSettings(), days: 6, startDate: '2029-03-05' }).notes.join(' ')).toMatch(/aren't in the app yet/);
    const undated = makePlan({ ...defaultSettings(), days: 10 });
    expect(undated.days.every((d) => !d.holiday)).toBe(true);
    expect(undated.notes.join(' ')).not.toMatch(/holiday/i);
  });
});
