import { RIDE_OVERHEAD } from '../data/costs';
import { SECTIONS } from '../data/sections';
import type { RoadWarning, Section, Variant } from '../data/types';
import type { Direction } from '../state/settings';

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
}

export interface RouteOptions {
  startHub: string;
  direction: Direction;
  variants: Record<string, string>;
  /** Multiplies average speeds (e.g. heavier bikes). */
  speedFactor?: number;
}

export function variantFor(section: Section, variants: Record<string, string>): Variant {
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
    variant: variantFor(section, opts.variants),
  }));

  const points: string[] = [sections[0].reversed ? sections[0].section.to : sections[0].section.from];
  const legs: RouteLeg[] = [];

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
        road: src.road,
        scenic: src.scenic ?? 1,
        warnings: src.warnings ?? [],
        sectionId: section.id,
      });
      points.push(order[i + 1]);
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
  };
}

/** All stops of a variant in travel order (including both hubs). */
export function variantStops(section: Section, variant: Variant, reversed: boolean): string[] {
  const nodes = [section.from, ...variant.legs.map((l) => l.to)];
  return reversed ? nodes.reverse() : nodes;
}
