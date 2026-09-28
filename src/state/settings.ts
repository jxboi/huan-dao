import { CURRENCIES, FOOD_STYLES, STAYS, VEHICLES, type FoodStyle, type SeasonMode, type StayTier, type VehicleId } from '../data/costs';
import { BYPASS_BY_ID } from '../data/bypasses';
import { HUBS, SECTIONS } from '../data/sections';
import { STOP_BY_ID } from '../data/stops';
import { CUSTOM_VARIANT, NETWORK_STOPS } from '../lib/network';

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
  /** sectionId → variantId, or 'custom' to ride that section through `customRoutes`. */
  variants: Record<string, string>;
  /** sectionId → the stops you chose for that section, clockwise (hubs excluded). Kept when you switch back to a preset. */
  customRoutes: Record<string, string[]>;
  /** Bypass ids (src/data/bypasses.ts) to ride round a hub wherever the route fits them. */
  bypasses: string[];
  /** Stops the user wants to sleep at. */
  pinned: string[];
  /** Stops a day rides past without sleeping (set when you move a day's end further along). Pins win. */
  passThrough: string[];
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
    customRoutes: {},
    bypasses: [],
    pinned: [],
    passThrough: [],
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
  if (Array.isArray(raw)) return base;
  const s = { ...base, ...(raw as Partial<TripSettings>) };
  // Custom stop lists: known sections, stops the road network reaches, no hubs or repeats.
  const network = new Set(NETWORK_STOPS);
  s.customRoutes = Object.fromEntries(
    Object.entries(isRecord(s.customRoutes) ? s.customRoutes : {}).flatMap(([id, stops]) => {
      const sec = SECTIONS.find((x) => x.id === id);
      if (!sec) return [];
      const ok = [...new Set(stringList(stops))].filter((x) => network.has(x) && x !== sec.from && x !== sec.to).slice(0, 20);
      return [[id, ok] as const];
    }),
  );
  s.bypasses = [...new Set(stringList(s.bypasses))].filter((id) => id in BYPASS_BY_ID);
  s.variants = { ...base.variants, ...(isRecord(s.variants) ? (s.variants as Record<string, string>) : {}) };
  // Drop variant ids that no longer exist in data.
  for (const sec of SECTIONS) {
    const custom = s.variants[sec.id] === CUSTOM_VARIANT && sec.id in s.customRoutes;
    if (!custom && !sec.variants.some((v) => v.id === s.variants[sec.id])) s.variants[sec.id] = sec.defaultVariant;
  }
  // …and sections that no longer exist.
  for (const k of Object.keys(s.variants)) if (!SECTIONS.some((sec) => sec.id === k)) delete s.variants[k];
  // Enums, ids and collections: anything unknown falls back to the default, so a bad value in
  // storage (or a hand-edited/shared link) can never crash the planner.
  const oneOf = <T,>(v: unknown, ok: readonly T[], fallback: T): T => (ok.includes(v as T) ? (v as T) : fallback);
  s.direction = oneOf(s.direction, ['ccw', 'cw'] as const, base.direction);
  s.pace = oneOf(s.pace, Object.keys(PACES) as Pace[], base.pace);
  s.startHub = oneOf(s.startHub, HUBS, base.startHub);
  s.vehicle = oneOf(s.vehicle, VEHICLES.map((v) => v.id), base.vehicle);
  s.stay = oneOf(s.stay, STAYS.map((x) => x.id), base.stay);
  s.food = oneOf(s.food, FOOD_STYLES.map((f) => f.id), base.food);
  s.season = oneOf(s.season, ['auto', 'low', 'peak'] as const, base.season);
  s.currency = oneOf(s.currency, CURRENCIES.map((c) => c.code), base.currency);
  s.startDate = typeof s.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.startDate) ? s.startDate : '';
  s.pinned = stringList(s.pinned).filter((id) => id in STOP_BY_ID);
  s.passThrough = [...new Set(stringList(s.passThrough))].filter((id) => id in STOP_BY_ID);
  s.saved = stringList(s.saved);
  s.restDays = Object.fromEntries(
    Object.entries(isRecord(s.restDays) ? s.restDays : {})
      .filter(([k]) => k in STOP_BY_ID)
      .map(([k, v]) => [k, clamp(Math.round(Number(v) || 0), 0, 10)] as const)
      .filter(([, v]) => v > 0),
  );
  s.checklist = Object.fromEntries(Object.entries(isRecord(s.checklist) ? s.checklist : {}).filter(([, v]) => typeof v === 'boolean')) as Record<string, boolean>;
  s.days = clamp(Math.round(Number(s.days) || base.days), 3, 30);
  s.riders = clamp(Math.round(Number(s.riders) || 1), 1, 8);
  s.bikes = clamp(Math.round(Number(s.bikes) || 1), Math.ceil(s.riders / 2), s.riders);
  // Anyone with saved state from before onboarding existed has already set up a trip.
  if (typeof (raw as Partial<TripSettings>).onboarded !== 'boolean') s.onboarded = true;
  s.version = SETTINGS_VERSION;
  return s;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function stringList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
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
