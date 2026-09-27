/** Pure date helpers for picking a trip start by month. Dates are local, ISO yyyy-mm-dd. */

export interface MonthOption {
  year: number;
  /** 1–12 */
  month: number;
}

export function toIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** The next `count` calendar months starting with the one `today` is in. */
export function upcomingMonths(today: Date, count = 12): MonthOption[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
}

/**
 * A sensible start date when someone picks only a month: the first Saturday in that month that is
 * after `today` (weekend departures are how most people start a huandao). If the month has no
 * Saturday left, fall back to tomorrow.
 */
export function defaultStartInMonth({ year, month }: MonthOption, today: Date): string {
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const first = new Date(year, month - 1, 1);
  const from = first > tomorrow ? first : tomorrow;
  const sat = new Date(from.getFullYear(), from.getMonth(), from.getDate() + ((6 - from.getDay() + 7) % 7));
  return sat.getMonth() === month - 1 ? toIso(sat) : toIso(tomorrow);
}

/** `iso` shifted by `days` (local calendar days). */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return toIso(new Date(y, m - 1, d + days));
}
