import { ATTRACTIONS } from '../data/attractions';
import { VEHICLES } from '../data/costs';
import { SECTIONS, SECTION_BY_ID } from '../data/sections';
import { STOPS, STOP_BY_ID } from '../data/stops';
import type { Section } from '../data/types';
import type { TripSettings } from '../state/settings';
import { CUSTOM_VARIANT, distanceKm, expandStops, insertStop, placeStop, presetStops } from './network';
import { buildRoute, orderedSections, variantFor, type Route } from './route';

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

export interface DayRouteOption {
  kind: 'fast' | 'scenic' | 'current';
  /** Variant ids for today's sections (merge into settings.variants to ride it). */
  variants: Record<string, string>;
  /** Stops today, from the start to the end. */
  path: string[];
  km: number;
  hours: number;
  /** km-weighted average of the legs' scenic score, 1–3. */
  scenic: number;
  roads: string[];
  current: boolean;
}

/** A scenic option may take at most this much longer than the fast one before it stops being a sensible offer. */
const SCENIC_MAX_EXTRA = 1.6;

/**
 * Other ways to ride a day between the same two towns: every combination of the presets (and your custom route)
 * for today's sections that still passes through both ends, reduced to the fastest and the most scenic. Includes
 * the one you ride now as 'current' when it is neither. Empty when there is nothing to choose.
 */
export function dayRouteOptions(s: TripSettings, day: DayRef): DayRouteOption[] {
  const speedFactor = (VEHICLES.find((v) => v.id === s.vehicle) ?? VEHICLES[0]).speedFactor;
  const choices = day.sectionIds.map((id) => {
    const section = SECTION_BY_ID[id];
    const ids = section.variants.map((v) => v.id);
    if (s.customRoutes[id]) ids.push(CUSTOM_VARIANT);
    return { id, ids };
  });
  const combos = choices.reduce<Record<string, string>[]>(
    (acc, c) => acc.flatMap((combo) => c.ids.map((v) => ({ ...combo, [c.id]: v }))),
    [{}],
  );

  const seen = new Map<string, DayRouteOption>();
  for (const combo of combos) {
    const variants = { ...s.variants, ...combo };
    const route = buildRoute({ startHub: s.startHub, direction: s.direction, variants, customRoutes: s.customRoutes, speedFactor });
    const opt = daySlice(route, day);
    if (!opt) continue;
    const key = opt.path.join('>');
    const current = day.sectionIds.every((id) => (s.variants[id] ?? SECTION_BY_ID[id].defaultVariant) === combo[id]);
    const had = seen.get(key);
    // Presets that only differ outside today give the same day: keep the one you ride now, if it's among them.
    if (!had || current) seen.set(key, { kind: 'current', variants: combo, ...opt, current: current || !!had?.current });
  }

  const all = [...seen.values()];
  if (all.length < 2) return [];
  const fast = all.reduce((a, b) => (b.hours < a.hours - 1e-9 || (Math.abs(b.hours - a.hours) < 1e-9 && b.current) ? b : a));
  const scenic = all
    .filter((o) => o !== fast && o.scenic > fast.scenic + 0.2 && o.hours <= fast.hours * SCENIC_MAX_EXTRA)
    .sort((a, b) => b.scenic - a.scenic || a.hours - b.hours)[0];
  if (!scenic) return [];
  const out: DayRouteOption[] = [{ ...fast, kind: 'fast' }, { ...scenic, kind: 'scenic' }];
  const cur = all.find((o) => o.current);
  if (cur && cur !== fast && cur !== scenic) out.push(cur);
  return out;
}

/** Today's stretch of `route`: day.from → day.to, if the route passes both in that order. */
function daySlice(route: Route, day: DayRef) {
  // The loop starts and ends at the same hub: a day ending there ends at the last point.
  const i = route.points.indexOf(day.from);
  const j = day.to === route.points[0] ? route.points.length - 1 : route.points.indexOf(day.to, i + 1);
  if (i < 0 || j <= i) return undefined;
  const legs = route.legs.slice(i, j);
  const km = legs.reduce((a, l) => a + l.km, 0);
  return {
    path: route.points.slice(i, j + 1),
    km,
    hours: legs.reduce((a, l) => a + l.hours, 0),
    scenic: legs.reduce((a, l) => a + l.scenic * l.km, 0) / Math.max(1, km),
    roads: [...new Set(legs.flatMap((l) => l.road.split(' / ')))],
  };
}

/**
 * Ride a day on another route. Both ends of the day are pinned (like changing its destination) so the day keeps
 * its shape while the rest of the trip re-balances around the longer or shorter ride.
 */
export function chooseDayRoute(s: TripSettings, day: DayRef, variants: Record<string, string>): TripSettings {
  const pinned = [...s.pinned];
  for (const id of [day.from, day.to]) {
    if (id !== s.startHub && (STOP_BY_ID[id]?.overnight ?? 0) > 0 && !pinned.includes(id)) pinned.push(id);
  }
  return { ...s, pinned, variants: { ...s.variants, ...variants } };
}

function savedAt(stop: string, saved: Set<string>): boolean {
  return ATTRACTIONS.some((a) => a.stopId === stop && saved.has(a.id));
}

/** Every stop a section would pass with `stops`, in travel order. */
export function sectionPath(section: Section, stops: string[], reversed: boolean): string[] {
  const nodes = expandStops(section, stops);
  return reversed ? nodes.reverse() : nodes;
}
