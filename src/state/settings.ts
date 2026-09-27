import { CURRENCIES, FOOD_STYLES, STAYS, VEHICLES, type FoodStyle, type SeasonMode, type StayTier, type VehicleId } from '../data/costs';
import { HUBS, SECTIONS } from '../data/sections';
import { STOP_BY_ID } from '../data/stops';

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
  };
}

/**
 * Fill gaps from older/partial saved state so the app never crashes on load.
 * Also used for shared links (lib/share.ts), so treat `raw` as untrusted:
 * every field is type-checked and unknown enum values fall back to defaults.
 */
export function migrate(raw: unknown): TripSettings {
  const base = defaultSettings();
  if (!isRecord(raw)) return base;
  const s = { ...base, ...(raw as Partial<TripSettings>) };
  s.variants = { ...base.variants, ...(isRecord(s.variants) ? s.variants : {}) };
  // Drop variant ids that no longer exist in data.
  for (const sec of SECTIONS) {
    if (!sec.variants.some((v) => v.id === s.variants[sec.id])) s.variants[sec.id] = sec.defaultVariant;
  }
  for (const k of Object.keys(s.variants)) if (!SECTIONS.some((sec) => sec.id === k)) delete s.variants[k];
  s.startHub = oneOf(s.startHub, HUBS, base.startHub);
  s.direction = oneOf(s.direction, ['ccw', 'cw'] as const, base.direction);
  s.pace = oneOf(s.pace, Object.keys(PACES) as Pace[], base.pace);
  s.vehicle = oneOf(s.vehicle, VEHICLES.map((v) => v.id), base.vehicle);
  s.stay = oneOf(s.stay, STAYS.map((v) => v.id), base.stay);
  s.food = oneOf(s.food, FOOD_STYLES.map((v) => v.id), base.food);
  s.season = oneOf(s.season, ['auto', 'low', 'peak'] as const, base.season);
  s.currency = oneOf(s.currency, CURRENCIES.map((c) => c.code), base.currency);
  s.startDate = typeof s.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.startDate) ? s.startDate : '';
  s.pinned = stringList(s.pinned).filter((id) => id in STOP_BY_ID);
  s.saved = stringList(s.saved);
  s.restDays = isRecord(s.restDays)
    ? Object.fromEntries(
        Object.entries(s.restDays)
          .filter(([id]) => id in STOP_BY_ID)
          .map(([id, n]) => [id, clamp(Math.round(Number(n) || 0), 0, 10)] as const)
          .filter(([, n]) => n > 0),
      )
    : {};
  s.checklist = isRecord(s.checklist) ? Object.fromEntries(Object.entries(s.checklist).map(([k, v]) => [k, v === true])) : {};
  s.days = clamp(Math.round(Number(s.days) || base.days), 3, 30);
  s.riders = clamp(Math.round(Number(s.riders) || 1), 1, 8);
  s.bikes = clamp(Math.round(Number(s.bikes) || 1), Math.ceil(s.riders / 2), s.riders);
  s.version = SETTINGS_VERSION;
  return s;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(v as T) ? (v as T) : fallback;
}

function stringList(v: unknown): string[] {
  return Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string'))] : [];
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
