/**
 * Core domain types. Everything the app knows about Taiwan lives in typed data
 * files next to this one (stops, sections, attractions, costs, guide). The
 * planner/budget engines in `src/lib` are pure functions over these types.
 *
 * Research backing every number: /research/*.md
 */

export type Region = 'north' | 'northeast' | 'east' | 'south' | 'southwest' | 'central' | 'northwest';

/** A town/place on the loop where you can pass through or sleep. */
export interface Stop {
  id: string;
  name: string;
  /** Traditional Chinese name — useful for signs, GPS search, asking locals. */
  zh: string;
  lat: number;
  lng: number;
  region: Region;
  /**
   * How good this is as an overnight stop.
   * 0 = pass-through only, 1 = possible but thin, 2 = nice small stop, 3 = major hub.
   */
  overnight: 0 | 1 | 2 | 3;
  /** Multiplier on accommodation prices (Taipei/Kenting pricier, small towns cheaper). */
  lodgingFactor: number;
  blurb: string;
  /** Signature food to try here. */
  food: string[];
}

export type RoadWarningLevel = 'info' | 'caution' | 'danger';

export interface RoadWarning {
  level: RoadWarningLevel;
  text: string;
  /** Link to an official status page. */
  url?: string;
  /** ISO date the fact was last verified. */
  checked?: string;
}

/** A leg between two consecutive stops within a variant. */
export interface Leg {
  to: string;
  km: number;
  /** Average moving speed on this leg (km/h). Cities ~30, coast ~45, mountains ~30. */
  speed: number;
  road: string;
  /** 1–3: how scenic the leg is (used for badges). */
  scenic?: 1 | 2 | 3;
  warnings?: RoadWarning[];
}

export interface Variant {
  id: string;
  name: string;
  summary: string;
  /** Legs in clockwise direction. `from` of the first leg is the section's `from`. */
  legs: Leg[];
  difficulty: 1 | 2 | 3;
  tags?: string[];
}

/**
 * A section of the loop between two hubs. Sections are listed in clockwise
 * order (Taipei → Yilan → Hualien → … → Taipei). Counter-clockwise trips
 * are produced by reversing.
 */
export interface Section {
  id: string;
  from: string;
  to: string;
  title: string;
  variants: Variant[];
  defaultVariant: string;
}

export type AttractionCategory =
  | 'nature'
  | 'viewpoint'
  | 'beach'
  | 'culture'
  | 'temple'
  | 'hot-spring'
  | 'night-market'
  | 'food'
  | 'activity'
  | 'island';

export interface Attraction {
  id: string;
  name: string;
  zh?: string;
  /** Stop this attraction is closest to / planned from. */
  stopId: string;
  category: AttractionCategory;
  lat: number;
  lng: number;
  /** Suggested visit duration in hours. */
  hours: number;
  /** Per-person cost in TWD (0 = free). */
  cost: number;
  description: string;
  tip?: string;
  /** True if this needs extra time off the main loop (side trip). */
  sideTrip?: boolean;
  /** Top picks shown by default. */
  highlight?: boolean;
  status?: RoadWarning;
}
