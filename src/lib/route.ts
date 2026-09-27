import { RIDE_OVERHEAD } from '../data/costs';
import { BYPASS_BY_ID } from '../data/bypasses';
import { SECTIONS } from '../data/sections';
import type { Bypass, RoadWarning, Section, Variant } from '../data/types';
import type { Direction, TripSettings } from '../state/settings';
import { CUSTOM_VARIANT, customVariant } from './network';

export interface RouteLeg {
  from: string;
  to: string;
  km: number;
  /** Estimated riding time incl. short breaks. */
  hours: number;
  road: string;
  scenic: number;
  warnings: RoadWarning[];
  sectionId: string;
  /** Set on legs that ride a bypass round a hub. */
  bypass?: string;
}

export interface Route {
  /** Stop ids in travel order. points[0] === points[last] === start hub. */
  points: string[];
  /** legs[i] connects points[i] → points[i+1]. */
  legs: RouteLeg[];
  /** Cumulative km / hours at each point. */
  cumKm: number[];
  cumHours: number[];
  totalKm: number;
  totalHours: number;
  /** Sections in travel order with the chosen variant. */
  sections: { section: Section; variant: Variant; reversed: boolean }[];
  /** Bypasses the route actually rides (enabled ones whose ends are on the route next to their hub). */
  bypasses: string[];
}

export interface RouteOptions {
  startHub: string;
  direction: Direction;
  variants: Record<string, string>;
  /** sectionId → your stops (clockwise), used where variants[sectionId] is 'custom'. */
  customRoutes?: Record<string, string[]>;
  /** Bypass ids to ride where they fit (src/data/bypasses.ts). */
  bypasses?: string[];
  /** Multiplies average speeds (e.g. heavier bikes). */
  speedFactor?: number;
}

/** The route your settings describe. */
export function routeFor(
  s: Pick<TripSettings, 'startHub' | 'direction' | 'variants' | 'customRoutes' | 'bypasses'>,
  speedFactor?: number,
): Route {
  return buildRoute({ startHub: s.startHub, direction: s.direction, variants: s.variants, customRoutes: s.customRoutes, bypasses: s.bypasses, speedFactor });
}

export function variantFor(section: Section, variants: Record<string, string>, customRoutes: Record<string, string[]> = {}): Variant {
  if (variants[section.id] === CUSTOM_VARIANT && customRoutes[section.id]) return customVariant(section, customRoutes[section.id]);
  return section.variants.find((v) => v.id === variants[section.id]) ?? section.variants.find((v) => v.id === section.defaultVariant)!;
}

/** Sections in travel order for the chosen start hub and direction. */
export function orderedSections(startHub: string, direction: Direction): { section: Section; reversed: boolean }[] {
  const n = SECTIONS.length;
  let idx = SECTIONS.findIndex((s) => s.from === startHub);
  if (idx < 0) idx = 0;
  const out: { section: Section; reversed: boolean }[] = [];
  for (let k = 0; k < n; k++) {
    if (direction === 'cw') out.push({ section: SECTIONS[(idx + k) % n], reversed: false });
    else out.push({ section: SECTIONS[(idx - 1 - k + 2 * n) % n], reversed: true });
  }
  return out;
}

export function buildRoute(opts: RouteOptions): Route {
  const speedFactor = opts.speedFactor ?? 1;
  const sections = orderedSections(opts.startHub, opts.direction).map(({ section, reversed }) => ({
    section,
    reversed,
    variant: variantFor(section, opts.variants, opts.customRoutes),
  }));

  let points: string[] = [sections[0].reversed ? sections[0].section.to : sections[0].section.from];
  let legs: RouteLeg[] = [];

  for (const { section, variant, reversed } of sections) {
    // Clockwise node list for this variant.
    const nodes = [section.from, ...variant.legs.map((l) => l.to)];
    const order = reversed ? [...nodes].reverse() : nodes;
    for (let i = 0; i < order.length - 1; i++) {
      // Leg in clockwise terms connecting nodes[a] → nodes[a+1].
      const a = reversed ? nodes.length - 2 - i : i;
      const src = variant.legs[a];
      legs.push({
        from: order[i],
        to: order[i + 1],
        km: src.km,
        hours: (src.km / (src.speed * speedFactor)) * RIDE_OVERHEAD,
        // Multi-road legs are written clockwise ("Tai 5 / Tai 2"); flip them for anticlockwise riding.
        road: reversed ? src.road.split(' / ').reverse().join(' / ') : src.road,
        scenic: src.scenic ?? 1,
        warnings: src.warnings ?? [],
        sectionId: section.id,
      });
      points.push(order[i + 1]);
    }
  }

  const bypasses: string[] = [];
  for (const id of opts.bypasses ?? []) {
    const b = BYPASS_BY_ID[id];
    const rode = b && rideBypass(points, legs, b, opts.direction, speedFactor);
    if (rode) {
      ({ points, legs } = rode);
      bypasses.push(id);
    }
  }

  const cumKm = [0];
  const cumHours = [0];
  legs.forEach((l, i) => {
    cumKm.push(cumKm[i] + l.km);
    cumHours.push(cumHours[i] + l.hours);
  });

  return {
    points,
    legs,
    cumKm,
    cumHours,
    totalKm: cumKm[cumKm.length - 1],
    totalHours: cumHours[cumHours.length - 1],
    sections,
    bypasses,
  };
}

/**
 * `points`/`legs` with the hub swapped for the bypass, or undefined when the stops either side of the hub aren't
 * both on the bypass (in riding order). Bypass legs keep the section of the side they start on, the last one the
 * section after the hub, so days and route edits still see which sections a day rides.
 */
function rideBypass(points: string[], legs: RouteLeg[], b: Bypass, direction: Direction, speedFactor: number) {
  const k = points.indexOf(b.hub, 1);
  if (k < 1 || k >= points.length - 1) return undefined;
  const nodes = [b.from, ...b.legs.map((l) => l.to)];
  const cw = direction === 'cw';
  const travel = cw ? nodes : [...nodes].reverse();
  const i = travel.indexOf(points[k - 1]);
  const j = travel.indexOf(points[k + 1]);
  if (i < 0 || j <= i) return undefined;
  const around: RouteLeg[] = [];
  for (let t = i; t < j; t++) {
    const src = b.legs[cw ? t : nodes.length - 2 - t];
    around.push({
      from: travel[t],
      to: travel[t + 1],
      km: src.km,
      hours: (src.km / (src.speed * speedFactor)) * RIDE_OVERHEAD,
      road: cw ? src.road : src.road.split(' / ').reverse().join(' / '),
      scenic: src.scenic ?? 1,
      warnings: src.warnings ?? [],
      sectionId: t === j - 1 ? legs[k].sectionId : legs[k - 1].sectionId,
      bypass: b.id,
    });
  }
  return {
    points: [...points.slice(0, k - 1), ...travel.slice(i, j + 1), ...points.slice(k + 2)],
    legs: [...legs.slice(0, k - 1), ...around, ...legs.slice(k + 1)],
  };
}

/** All stops of a variant in travel order (including both hubs). */
export function variantStops(section: Section, variant: Variant, reversed: boolean): string[] {
  const nodes = [section.from, ...variant.legs.map((l) => l.to)];
  return reversed ? nodes.reverse() : nodes;
}
