import type { FoodStyle, SeasonMode, StayTier, VehicleId } from '../data/costs';
import { SECTIONS } from '../data/sections';

export type Direction = 'ccw' | 'cw';
export type Pace = 'relaxed' | 'moderate' | 'fast';

/**
 * Everything the user can customise. Persisted to localStorage (see store.tsx).
 * Bump SETTINGS_VERSION and extend `migrate` when changing the shape.
 */
export interface TripSettings {
  version: number;
  /** Total trip days, including rest/flex days. */
  days: number;
  /** ISO date (yyyy-mm-dd) or '' when unknown. */
  startDate: string;
  startHub: string;
  direction: Direction;
  pace: Pace;
  /** sectionId → variantId */
  variants: Record<string, string>;
  /** Stops the user wants to sleep at. */
  pinned: string[];
  /** stopId → extra nights (rest days) there. Implies pinned. */
  restDays: Record<string, number>;
  vehicle: VehicleId;
  riders: number;
  /** Number of bikes (≤ riders). Two riders can share one scooter. */
  bikes: number;
  stay: StayTier;
  food: FoodStyle;
  season: SeasonMode;
  /** Attraction ids the user saved. */
  saved: string[];
  currency: string;
  /** Packing checklist state: item → checked. */
  checklist: Record<string, boolean>;
  /** Finished (or skipped) the first-run questions. */
  onboarded: boolean;
}

export const SETTINGS_VERSION = 1;

export function defaultSettings(): TripSettings {
  return {
    version: SETTINGS_VERSION,
    days: 10,
    startDate: '',
    startHub: 'taipei',
    direction: 'ccw',
    pace: 'moderate',
    variants: Object.fromEntries(SECTIONS.map((s) => [s.id, s.defaultVariant])),
    pinned: [],
    restDays: {},
    vehicle: 'scooter125',
    riders: 1,
    bikes: 1,
    stay: 'budget',
    food: 'mixed',
    season: 'auto',
    saved: [],
    currency: 'USD',
    checklist: {},
    onboarded: false,
  };
}

/** Fill gaps from older/partial saved state so the app never crashes on load. */
export function migrate(raw: unknown): TripSettings {
  const base = defaultSettings();
  if (!raw || typeof raw !== 'object') return base;
  const s = { ...base, ...(raw as Partial<TripSettings>) };
  s.variants = { ...base.variants, ...(s.variants ?? {}) };
  // Drop variant ids that no longer exist in data.
  for (const sec of SECTIONS) {
    if (!sec.variants.some((v) => v.id === s.variants[sec.id])) s.variants[sec.id] = sec.defaultVariant;
  }
  s.days = clamp(Math.round(Number(s.days) || base.days), 3, 30);
  s.riders = clamp(Math.round(Number(s.riders) || 1), 1, 8);
  s.bikes = clamp(Math.round(Number(s.bikes) || 1), Math.ceil(s.riders / 2), s.riders);
  // Anyone with saved state from before onboarding existed has already set up a trip.
  if (typeof (raw as Partial<TripSettings>).onboarded !== 'boolean') s.onboarded = true;
  s.version = SETTINGS_VERSION;
  return s;
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Riding hours per day. `target` drives the recommended trip length, `max` the
 * "too long" warnings, and `min` how short a day may get before spare days are
 * turned into flex/rest days instead of ever-shorter riding days.
 */
export const PACES: Record<Pace, { label: string; detail: string; min: number; target: number; max: number }> = {
  relaxed: { label: 'Relaxed', detail: '2.5–4 h riding a day, lots of stops', min: 2.5, target: 3.5, max: 5 },
  moderate: { label: 'Balanced', detail: '3.5–5 h riding a day', min: 3.5, target: 5, max: 6.5 },
  fast: { label: 'Ambitious', detail: '5–7 h riding a day, early starts', min: 5, target: 6.5, max: 8.5 },
};
