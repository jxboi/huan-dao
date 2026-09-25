import { HOLIDAYS, HOLIDAY_LODGING_FACTOR, HOLIDAY_RENTAL_FACTOR, HOLIDAY_YEARS, type HolidayBreak } from '../data/holidays';
import { addDays } from './dates';

/** Pure lookups over the Taiwan holiday calendar. Dates are ISO yyyy-mm-dd. */

/** The holiday break `date` falls in, if any. */
export function holidayOn(date: string): HolidayBreak | undefined {
  return HOLIDAYS.find((h) => date >= h.start && date <= h.end);
}

/** Breaks that overlap the `days`-long trip starting on `start`. */
export function holidaysDuring(start: string, days: number): HolidayBreak[] {
  if (!start || days < 1) return [];
  const end = addDays(start, days - 1);
  return HOLIDAYS.filter((h) => h.start <= end && h.end >= start);
}

/** Whether the calendar knows the holidays for every day of the trip. */
export function holidaysCovered(start: string, days: number): boolean {
  if (!start) return true;
  const years = [Number(start.slice(0, 4)), Number(addDays(start, Math.max(0, days - 1)).slice(0, 4))];
  return years.every((y) => HOLIDAY_YEARS.includes(y));
}

/**
 * Room-price multiplier from holidays for the night of `date`. Like weekends, what matters is
 * whether the next morning is a day off, so the night before a break is priced up and its last
 * night (before a workday) is not.
 */
export function holidayNightFactor(date: string): number {
  const h = holidayOn(addDays(date, 1));
  return h ? HOLIDAY_LODGING_FACTOR[h.kind] : 1;
}

/** Rental multiplier for a day spent inside a Lunar New Year or long-weekend break. */
export function holidayRentalFactor(date: string): number {
  const h = holidayOn(date);
  return h && h.kind !== 'day' ? HOLIDAY_RENTAL_FACTOR : 1;
}

/** "Feb 14–22" / "Feb 27 – Mar 1" / "Jun 9" */
export function fmtRange(h: HolidayBreak): string {
  const md = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (h.start === h.end) return md(h.start);
  if (h.start.slice(0, 7) === h.end.slice(0, 7)) return `${md(h.start)}–${Number(h.end.slice(8))}`;
  return `${md(h.start)} – ${md(h.end)}`;
}
