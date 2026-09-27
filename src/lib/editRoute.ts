import { ATTRACTIONS } from '../data/attractions';
import { SECTIONS, SECTION_BY_ID } from '../data/sections';
import { STOPS, STOP_BY_ID } from '../data/stops';
import type { Section } from '../data/types';
import type { TripSettings } from '../state/settings';
import { CUSTOM_VARIANT, distanceKm, expandStops, insertStop, placeStop, presetStops } from './network';
import { orderedSections, variantFor, type Route } from './route';

/**
 * Route edits the user makes (the store's reducer calls these). Each returns new settings; nothing here
 * touches React or storage.
 */

/** The stops you ride through in a section today (custom list, or the chosen preset's), clockwise. */
export function sectionStops(s: TripSettings, section: Section): string[] {
  if (s.variants[section.id] === CUSTOM_VARIANT && s.customRoutes[section.id]) return s.customRoutes[section.id];
  return presetStops(variantFor(section, s.variants));
}

/** Ride `sectionId` through `stops` (clockwise). */
export function setSectionStops(s: TripSettings, sectionId: string, stops: string[]): TripSettings {
  return { ...s, variants: { ...s.variants, [sectionId]: CUSTOM_VARIANT }, customRoutes: { ...s.customRoutes, [sectionId]: stops } };
}

/** Switch a section to a custom route, starting from the stops of whatever it uses now. */
export function customiseSection(s: TripSettings, sectionId: string): TripSettings {
  const section = SECTION_BY_ID[sectionId];
  if (!section) return s;
  return setSectionStops(s, sectionId, s.customRoutes[sectionId] ?? sectionStops(s, section));
}

export function addSectionStop(s: TripSettings, sectionId: string, stop: string): TripSettings {
  const section = SECTION_BY_ID[sectionId];
  if (!section) return s;
  return setSectionStops(s, sectionId, insertStop(section, sectionStops(s, section), stop));
}

export function removeSectionStop(s: TripSettings, sectionId: string, stop: string): TripSettings {
  const section = SECTION_BY_ID[sectionId];
  if (!section) return s;
  return setSectionStops(s, sectionId, sectionStops(s, section).filter((x) => x !== stop));
}

export interface DayRef {
  from: string;
  to: string;
  /** Stops passed today, ending with `to`. */
  via: string[];
  /** Sections today's legs belong to, in riding order. */
  sectionIds: string[];
}

/**
 * End a riding day somewhere else: "Hsinchu → Lukang" becomes "Hsinchu → Puli". Moves the overnight pin (and any
 * rest days) from the old end to the new one and pins the day's start so the day keeps its shape. If the new stop
 * isn't on the route, it is added to whichever of today's sections (or the next one) it fits best, the old end is
 * dropped from the route, and other stops you'd have passed today are dropped if they became detours.
 */
export function changeDayEnd(s: TripSettings, route: Route, day: DayRef, newEnd: string): TripSettings {
  if (newEnd === day.to || newEnd === s.startHub || !STOP_BY_ID[newEnd]) return s;

  const pinned = s.pinned.filter((x) => x !== day.to && x !== newEnd);
  if (day.from !== s.startHub && (STOP_BY_ID[day.from]?.overnight ?? 0) > 0 && !pinned.includes(day.from)) pinned.push(day.from);
  pinned.push(newEnd);
  const restDays = { ...s.restDays };
  if (restDays[day.to]) {
    restDays[newEnd] = restDays[day.to];
    delete restDays[day.to];
  }
  const next: TripSettings = { ...s, pinned, restDays };
  if (route.points.includes(newEnd)) return next;

  const placed = placeDayEnd(s, day, newEnd) ?? placeStop(SECTIONS.map((section) => ({ section, stops: sectionStops(s, section) })), newEnd);
  if (!placed) return s;
  return setSectionStops(next, placed.sectionId, placed.stops);
}

/**
 * Where a new end for `day` would go: today's sections plus the one after (so the day can stretch a little), with
 * the old end taken out. Stops you'd pass today may go if they turn into detours — unless pinned or saved.
 */
function placeDayEnd(s: TripSettings, day: DayRef, newEnd: string) {
  const candidates = dayWindow(s, day).map((section) => ({
    section,
    stops: sectionStops(s, section).filter((x) => x !== day.to),
  }));
  const saved = new Set(s.saved);
  const keep = new Set([...s.pinned, ...Object.keys(s.restDays)].filter((x) => x !== day.to));
  const droppable = new Set(day.via.filter((x) => x !== day.to && !keep.has(x) && !savedAt(x, saved)));
  return placeStop(candidates, newEnd, droppable);
}

/** The sections a day's end can move within: today's, plus the next one. */
function dayWindow(s: TripSettings, day: DayRef): Section[] {
  const order = orderedSections(s.startHub, s.direction).map((o) => o.section);
  const idx = day.sectionIds.map((id) => order.findIndex((x) => x.id === id)).filter((i) => i >= 0);
  if (!idx.length) return order;
  return order.slice(Math.min(...idx), Math.min(order.length - 1, Math.max(...idx) + 1) + 1);
}

export interface DayEndOption {
  id: string;
  /** Road km from the day's start. */
  km: number;
  onRoute: boolean;
}

/**
 * Towns a riding day could end in instead: ones further along today's sections (or the next), and ones off the
 * route that fit in there without doubling back. Nearest (by road from the day's start) first.
 */
export function dayEndOptions(s: TripSettings, route: Route, day: DayRef): DayEndOption[] {
  const window = new Set(dayWindow(s, day).map((x) => x.id));
  const startIdx = route.points.indexOf(day.from);
  // points[i] is reached by legs[i - 1].
  const ahead = new Set(route.points.filter((_, i) => i > startIdx && i < route.points.length - 1 && window.has(route.legs[i - 1].sectionId)));
  return STOPS.filter((x) => x.overnight > 0 && x.id !== s.startHub && x.id !== day.from && x.id !== day.to)
    .filter((x) => {
      if (ahead.has(x.id)) return true;
      if (route.points.includes(x.id)) return false; // already passed
      const placed = placeDayEnd(s, day, x.id);
      return !!placed && !placed.revisits;
    })
    .map((x) => ({ id: x.id, km: distanceKm(day.from, x.id), onRoute: ahead.has(x.id) }))
    .sort((a, b) => a.km - b.km);
}

function savedAt(stop: string, saved: Set<string>): boolean {
  return ATTRACTIONS.some((a) => a.stopId === stop && saved.has(a.id));
}

/** Every stop a section would pass with `stops`, in travel order. */
export function sectionPath(section: Section, stops: string[], reversed: boolean): string[] {
  const nodes = expandStops(section, stops);
  return reversed ? nodes.reverse() : nodes;
}
