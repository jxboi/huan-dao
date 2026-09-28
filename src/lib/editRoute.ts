import { ATTRACTIONS } from '../data/attractions';
import { BYPASSES, BYPASS_BY_ID } from '../data/bypasses';
import { VEHICLES } from '../data/costs';
import { SECTIONS, SECTION_BY_ID } from '../data/sections';
import { STOPS, STOP_BY_ID } from '../data/stops';
import type { Section, Variant } from '../data/types';
import { PACES, type TripSettings } from '../state/settings';
import { CUSTOM_VARIANT, distanceKm, expandStops, insertStop, placeStop, presetStops, pruneDetours } from './network';
import { orderedSections, routeFor, variantFor, type Route, type RouteLeg } from './route';

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
  /** Bypasses today's legs ride. */
  bypasses?: string[];
}

/**
 * End a riding day somewhere else: "Hsinchu → Lukang" becomes "Hsinchu → Puli". Moves the overnight pin (and any
 * rest days) from the old end to the new one and pins the day's start so the day keeps its shape. If the new stop
 * isn't on the route, it is added to whichever of today's sections (or the next one) it fits best, the old end is
 * dropped from the route, and other stops you'd have passed today are dropped if they became detours. If it is
 * further along the route, the old end (and today's other stops) go if they are now detours. Either way, towns the
 * new day rides past are marked pass-through so the planner doesn't split the day there again.
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
  let next: TripSettings = { ...s, pinned, restDays };
  const start = route.points.indexOf(day.from);
  const endIdx = route.points.indexOf(newEnd, start + 1);
  if (endIdx < 0) {
    const placed = placeDayEnd(s, day, newEnd) ?? placeStop(SECTIONS.map((section) => ({ section, stops: sectionStops(s, section) })), newEnd);
    if (!placed) return s;
    next = setSectionStops(next, placed.sectionId, placed.stops);
  } else if (endIdx > route.points.indexOf(day.to, start + 1)) {
    const droppable = dayDroppable(s, day);
    droppable.add(day.to);
    for (const section of dayWindow(s, day)) {
      const stops = sectionStops(s, section);
      const pruned = pruneDetours(section, stops, droppable);
      if (pruned.length !== stops.length) next = setSectionStops(next, section.id, pruned);
    }
  }
  return { ...next, passThrough: passedThrough(next, day.from, newEnd) };
}

/** `s.passThrough` plus the overnight towns ridden past between `from` and `to`, less the day's two ends. */
function passedThrough(s: TripSettings, from: string, to: string): string[] {
  const points = routeFor(s).points;
  const i = points.indexOf(from);
  const j = points.indexOf(to, i + 1);
  const between = j < 0 ? [] : points.slice(i + 1, j).filter((x) => (STOP_BY_ID[x]?.overnight ?? 0) > 0 && !s.pinned.includes(x));
  return [...new Set([...s.passThrough, ...between])].filter((x) => x !== from && x !== to);
}

/** Stops passed today (before its end) that could go: not pinned, resting or holding saved attractions. */
function dayDroppable(s: TripSettings, day: DayRef): Set<string> {
  const saved = new Set(s.saved);
  const keep = new Set([...s.pinned, ...Object.keys(s.restDays)].filter((x) => x !== day.to));
  return new Set(day.via.filter((x) => x !== day.to && !keep.has(x) && !savedAt(x, saved)));
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
  return placeStop(candidates, newEnd, dayDroppable(s, day));
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
  /** The quickest, the most scenic that fits a day at your pace, or one of the rest. */
  kind: 'fast' | 'scenic' | 'other';
  /** The named routes today rides (e.g. "Tai 3 inland + Tai 21 via Guoxing"); empty if none has a name. */
  name: string;
  /** Variant ids for today's sections (merge into settings.variants to ride it). */
  variants: Record<string, string>;
  /** Bypasses round hubs today passes: on or off. */
  bypasses: Record<string, boolean>;
  /** Stops today, from the start to the end. */
  path: string[];
  km: number;
  hours: number;
  /** km-weighted average of the legs' scenic score, 1–3. */
  scenic: number;
  roads: string[];
  current: boolean;
  /** More riding than your pace's longest day. */
  long: boolean;
}

/**
 * Other ways to ride a day between the same two towns: every combination of the presets (and your custom route)
 * for today's sections, with and without bypasses round hubs it passes, that still goes through both ends. The first
 * is the quickest ('fast'); next, if there is one, the most scenic ('scenic': clearly more scenic and no longer than
 * your pace's longest day, or a quarter longer than the fast one if that's already over); then the rest by riding
 * time. Empty when there is nothing to choose.
 */
export function dayRouteOptions(s: TripSettings, day: DayRef): DayRouteOption[] {
  const speedFactor = (VEHICLES.find((v) => v.id === s.vehicle) ?? VEHICLES[0]).speedFactor;
  const choices = day.sectionIds.map((id) => {
    const section = SECTION_BY_ID[id];
    const ids = section.variants.map((v) => v.id);
    if (s.customRoutes[id]) ids.push(CUSTOM_VARIANT);
    return { id, ids };
  });
  // Bypasses round a hub you pass today, or that today already rides.
  const bypassIds = BYPASSES.filter((b) => day.via.slice(0, -1).includes(b.hub) || day.bypasses?.includes(b.id)).map((b) => b.id);
  type Combo = { variants: Record<string, string>; bypasses: Record<string, boolean> };
  let combos: Combo[] = [{ variants: {}, bypasses: {} }];
  for (const c of choices) combos = combos.flatMap((x) => c.ids.map((v) => ({ ...x, variants: { ...x.variants, [c.id]: v } })));
  // Off before on: where a bypass doesn't fit, the route is the same and the plain one is kept.
  for (const id of bypassIds) combos = [false, true].flatMap((on) => combos.map((x) => ({ ...x, bypasses: { ...x.bypasses, [id]: on } })));

  const riding = new Set(routeFor(s, speedFactor).bypasses);
  const seen = new Map<string, Omit<DayRouteOption, 'kind' | 'long'> & { same: number }>();
  for (const combo of combos) {
    const variants = { ...s.variants, ...combo.variants };
    const bypasses = [...s.bypasses.filter((id) => !(id in combo.bypasses)), ...bypassIds.filter((id) => combo.bypasses[id])];
    const route = routeFor({ ...s, variants, bypasses }, speedFactor);
    const slice = daySlice(route, day);
    if (!slice) continue;
    // A bypass switched on where it doesn't fit isn't ridden: record it as off, so picking this turns it off.
    const flags = Object.fromEntries(bypassIds.map((id) => [id, route.bypasses.includes(id)]));
    const key = slice.path.join('>');
    // How much of this is what you ride now: sections and bypasses that stay as they are.
    const same =
      day.sectionIds.filter((id) => (s.variants[id] ?? SECTION_BY_ID[id].defaultVariant) === combo.variants[id]).length +
      bypassIds.filter((id) => riding.has(id) === flags[id]).length;
    const current = same === day.sectionIds.length + bypassIds.length;
    const had = seen.get(key);
    // Choices that only differ outside today give the same day: keep the one that changes least of your route.
    if (!had || same > had.same) {
      const { legs, ...rest } = slice;
      seen.set(key, { variants: combo.variants, bypasses: flags, ...rest, name: optionName(route, legs, slice.path, combo.variants), current: current || !!had?.current, same });
    }
  }

  const all = [...seen.values()];
  if (all.length < 2) return [];
  const maxHours = PACES[s.pace].max;
  const fast = all.reduce((a, b) => (b.hours < a.hours - 1e-9 || (Math.abs(b.hours - a.hours) < 1e-9 && b.current) ? b : a));
  const limit = Math.max(maxHours, fast.hours * 1.25);
  const scenic = all
    .filter((o) => o !== fast && o.scenic > fast.scenic + 0.2 && o.hours <= limit)
    .sort((a, b) => b.scenic - a.scenic || a.hours - b.hours)[0];
  const rest = all.filter((o) => o !== fast && o !== scenic).sort((a, b) => a.hours - b.hours);
  const tag = ({ same: _, ...o }: (typeof all)[number], kind: DayRouteOption['kind']): DayRouteOption => ({ ...o, kind, long: o.hours > maxHours });
  return [tag(fast, 'fast'), ...(scenic ? [tag(scenic, 'scenic')] : []), ...rest.map((o) => tag(o, 'other'))];
}

/**
 * The named routes a day rides: each preset whose own towns it passes (a preset only touched at a hub says
 * nothing about today), then any bypass.
 */
function optionName(route: Route, legs: RouteLeg[], path: string[], variants: Record<string, string>): string {
  const parts: string[] = [];
  for (const { section, variant } of route.sections) {
    if (!(section.id in variants) || variant.id === CUSTOM_VARIANT || section.variants.length < 2) continue;
    const rides = legs.some((l) => l.sectionId === section.id && !l.bypass);
    const own = presetStops(variant);
    if (rides && (own.length === 0 || own.some((x) => path.includes(x)))) parts.push(variant.name);
  }
  for (const id of new Set(legs.map((l) => l.bypass).filter(Boolean))) parts.push(BYPASS_BY_ID[id!].name);
  return parts.join(' + ');
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
    legs,
    path: route.points.slice(i, j + 1),
    km,
    hours: legs.reduce((a, l) => a + l.hours, 0),
    scenic: legs.reduce((a, l) => a + l.scenic * l.km, 0) / Math.max(1, km),
    roads: [...new Set(legs.flatMap((l) => l.road.split(' / ')))],
  };
}

/**
 * Ride a day on another route. Both ends of the day are pinned (like changing its destination) and the towns it
 * rides past marked pass-through, so the day keeps its shape while the rest of the trip re-balances around the
 * longer or shorter ride.
 */
export function chooseDayRoute(s: TripSettings, day: DayRef, choice: Pick<DayRouteOption, 'variants' | 'bypasses'>): TripSettings {
  const pinned = [...s.pinned];
  for (const id of [day.from, day.to]) {
    if (id !== s.startHub && (STOP_BY_ID[id]?.overnight ?? 0) > 0 && !pinned.includes(id)) pinned.push(id);
  }
  const on = Object.entries(choice.bypasses ?? {});
  const bypasses = [...s.bypasses.filter((id) => !on.some(([b]) => b === id)), ...on.filter(([, v]) => v).map(([b]) => b)];
  const next = { ...s, pinned, variants: { ...s.variants, ...choice.variants }, bypasses };
  // Towns the new route rides past today are pass-through, or the planner would split a long day at one of them.
  return { ...next, passThrough: passedThrough(next, day.from, day.to) };
}

/**
 * Ride a bypass round a hub, or stop riding it. Turning one on also switches either neighbouring section to its
 * shortest preset that reaches the bypass next to the hub, if the route you ride there doesn't.
 */
export function setBypass(s: TripSettings, id: string, on: boolean): TripSettings {
  const b = BYPASS_BY_ID[id];
  if (!b) return s;
  const rest = s.bypasses.filter((x) => x !== id);
  if (!on) return { ...s, bypasses: rest };
  const nodes = new Set([b.from, ...b.legs.map((l) => l.to)]);
  const variants = { ...s.variants };
  for (const section of SECTIONS) {
    const before = section.to === b.hub;
    if (!before && section.from !== b.hub) continue;
    // The stop next to the hub, clockwise: last before it, or first after it.
    const reaches = (v: Variant) => nodes.has(before ? [section.from, ...v.legs.map((l) => l.to)].at(-2)! : v.legs[0].to);
    if (reaches(variantFor(section, s.variants, s.customRoutes))) continue;
    const km = (v: Variant) => v.legs.reduce((a, l) => a + l.km, 0);
    const pick = section.variants.filter(reaches).sort((x, y) => km(x) - km(y))[0];
    if (pick) variants[section.id] = pick.id;
  }
  return { ...s, variants, bypasses: [...rest, id] };
}

function savedAt(stop: string, saved: Set<string>): boolean {
  return ATTRACTIONS.some((a) => a.stopId === stop && saved.has(a.id));
}

/** Every stop a section would pass with `stops`, in travel order. */
export function sectionPath(section: Section, stops: string[], reversed: boolean): string[] {
  const nodes = expandStops(section, stops);
  return reversed ? nodes.reverse() : nodes;
}
