/**
 * Taiwan public holidays as blocks of consecutive days off (weekends included), from the
 * DGPA government office calendar (research/08). Holiday weekends mean sold-out small towns,
 * pricier rooms and rentals, and heavy traffic on the Suhua and South Link.
 *
 * Only years listed in HOLIDAY_YEARS are covered — add the next year when DGPA publishes it
 * (usually around May/June of the year before).
 */

export type HolidayKind = 'lunar-new-year' | 'long-weekend' | 'day';

export interface HolidayBreak {
  id: string;
  name: string;
  zh: string;
  /** First and last day off, inclusive, ISO yyyy-mm-dd. */
  start: string;
  end: string;
  kind: HolidayKind;
  /**
   * True when the date range is worked out from the announced rule (Saturday holiday → day off
   * the Friday before, Sunday holiday → the Monday after) rather than read from the calendar.
   */
  derived?: boolean;
  checked: string;
}

export const HOLIDAY_YEARS = [2026, 2027];

/** Multiplier on room prices for nights before a day off in each kind of break (research/04, 05). */
export const HOLIDAY_LODGING_FACTOR: Record<HolidayKind, number> = {
  'lunar-new-year': 1.5,
  'long-weekend': 1.4,
  day: 1.25,
};

/** Rental multiplier on days inside a Lunar New Year or long-weekend break (research/04 peak rate). */
export const HOLIDAY_RENTAL_FACTOR = 1.3;

export const HOLIDAYS: HolidayBreak[] = [
  // ── 2026 (DGPA calendar, no make-up workdays) ────────────────────────
  { id: '2026-new-year', name: "New Year's Day", zh: '元旦', start: '2026-01-01', end: '2026-01-01', kind: 'day', checked: '2026-09' },
  { id: '2026-lny', name: 'Lunar New Year', zh: '春節', start: '2026-02-14', end: '2026-02-22', kind: 'lunar-new-year', checked: '2026-09' },
  { id: '2026-228', name: 'Peace Memorial Day', zh: '和平紀念日', start: '2026-02-27', end: '2026-03-01', kind: 'long-weekend', checked: '2026-09' },
  { id: '2026-tomb', name: "Children's Day & Tomb Sweeping", zh: '兒童節及清明節', start: '2026-04-03', end: '2026-04-06', kind: 'long-weekend', checked: '2026-09' },
  { id: '2026-labour', name: 'Labour Day', zh: '勞動節', start: '2026-05-01', end: '2026-05-03', kind: 'long-weekend', checked: '2026-09' },
  { id: '2026-dragon', name: 'Dragon Boat Festival', zh: '端午節', start: '2026-06-19', end: '2026-06-21', kind: 'long-weekend', checked: '2026-09' },
  { id: '2026-moon', name: "Mid-Autumn Festival & Teachers' Day", zh: '中秋節及教師節', start: '2026-09-25', end: '2026-09-28', kind: 'long-weekend', checked: '2026-09' },
  { id: '2026-national', name: 'National Day', zh: '國慶日', start: '2026-10-09', end: '2026-10-11', kind: 'long-weekend', checked: '2026-09' },
  { id: '2026-retro', name: 'Retrocession Day', zh: '臺灣光復節', start: '2026-10-24', end: '2026-10-26', kind: 'long-weekend', checked: '2026-09' },
  { id: '2026-constitution', name: 'Constitution Day', zh: '行憲紀念日', start: '2026-12-25', end: '2026-12-27', kind: 'long-weekend', checked: '2026-09' },

  // ── 2027 (DGPA calendar announced May 2026, no make-up workdays) ─────
  { id: '2027-new-year', name: "New Year's Day", zh: '元旦', start: '2027-01-01', end: '2027-01-03', kind: 'long-weekend', checked: '2026-09' },
  { id: '2027-lny', name: 'Lunar New Year', zh: '春節', start: '2027-02-04', end: '2027-02-10', kind: 'lunar-new-year', checked: '2026-09' },
  { id: '2027-228', name: 'Peace Memorial Day', zh: '和平紀念日', start: '2027-02-27', end: '2027-03-01', kind: 'long-weekend', derived: true, checked: '2026-09' },
  { id: '2027-tomb', name: "Children's Day & Tomb Sweeping", zh: '兒童節及清明節', start: '2027-04-03', end: '2027-04-06', kind: 'long-weekend', checked: '2026-09' },
  { id: '2027-labour', name: 'Labour Day', zh: '勞動節', start: '2027-04-30', end: '2027-05-02', kind: 'long-weekend', derived: true, checked: '2026-09' },
  { id: '2027-dragon', name: 'Dragon Boat Festival', zh: '端午節', start: '2027-06-09', end: '2027-06-09', kind: 'day', checked: '2026-09' },
  { id: '2027-moon', name: 'Mid-Autumn Festival', zh: '中秋節', start: '2027-09-15', end: '2027-09-15', kind: 'day', checked: '2026-09' },
  { id: '2027-teachers', name: "Teachers' Day", zh: '教師節', start: '2027-09-28', end: '2027-09-28', kind: 'day', checked: '2026-09' },
  { id: '2027-national', name: 'National Day', zh: '國慶日', start: '2027-10-09', end: '2027-10-11', kind: 'long-weekend', derived: true, checked: '2026-09' },
  { id: '2027-retro', name: 'Retrocession Day', zh: '臺灣光復節', start: '2027-10-23', end: '2027-10-25', kind: 'long-weekend', derived: true, checked: '2026-09' },
  { id: '2027-constitution', name: 'Constitution Day', zh: '行憲紀念日', start: '2027-12-24', end: '2027-12-26', kind: 'long-weekend', checked: '2026-09' },
];
