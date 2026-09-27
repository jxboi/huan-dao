import { ATTRACTIONS } from '../data/attractions';
import { VEHICLES } from '../data/costs';
import { STOP_BY_ID } from '../data/stops';
import type { HolidayBreak } from '../data/holidays';
import type { Attraction, RoadWarning } from '../data/types';
import { PACES, type TripSettings } from '../state/settings';
import { fmtRange, holidayOn, holidaysCovered, holidaysDuring } from './holidays';
import { buildRoute, type Route, type RouteLeg } from './route';

/**
 * The planner turns settings into a day-by-day itinerary.
 *
 * 1. Build the ordered route (lib/route.ts).
 * 2. Decide how many riding days to use from total days, user rest days and pace.
 * 3. Split the route into riding days with dynamic programming, minimising the
 *    variance of each day's "load" (riding hours + time at saved attractions),
 *    while only sleeping in towns that have accommodation and honouring pins.
 * 4. Insert rest days (user-chosen) and flex days (surplus, auto-placed in the
 *    best towns — useful as weather buffers).
 */

export interface PlanDay {
  /** 1-based day number. */
  day: number;
  /** ISO date when a start date is set. */
  date?: string;
  /** Public holiday break this day falls in (needs a start date). */
  holiday?: HolidayBreak;
  kind: 'ride' | 'rest';
  /** Rest day added automatically because the user has more days than needed at this pace. */
  flex?: boolean;
  from: string;
  to: string;
  km: number;
  hours: number;
  legs: RouteLeg[];
  /** Stops passed through today, including the destination (excluding the start). */
  via: string[];
  /** Suggested attractions for the day: saved ones first, then highlights. */
  attractions: Attraction[];
  warnings: RoadWarning[];
  /** Where you sleep at the end of the day (undefined on the final day). */
  overnight?: string;
}

export interface Plan {
  route: Route;
  days: PlanDay[];
  ridingDays: number;
  restDays: number;
  flexDays: number;
  totalKm: number;
  totalRideHours: number;
  /** Suggested trip lengths for the chosen pace. */
  recommended: { min: number; ideal: number };
  /** Human-readable notes/warnings about the plan as a whole. */
  notes: string[];
}

const OVERNIGHT_PENALTY: Record<number, number> = { 0: Infinity, 1: 2.5, 2: 0.6, 3: 0 };

export function makePlan(settings: TripSettings): Plan {
  const vehicle = VEHICLES.find((v) => v.id === settings.vehicle) ?? VEHICLES[0];
  const route = buildRoute({
    startHub: settings.startHub,
    direction: settings.direction,
    variants: settings.variants,
    speedFactor: vehicle.speedFactor,
  });
  const pace = PACES[settings.pace];
  const notes: string[] = [];
  const N = route.points.length - 1;

  // ── Load per point: riding hours + time at saved attractions ──────────
  const saved = new Set(settings.saved);
  const seen = new Set<string>();
  const load: number[] = [0];
  for (let i = 1; i <= N; i++) {
    const stop = route.points[i];
    let visit = 0;
    if (!seen.has(stop)) {
      seen.add(stop);
      for (const a of ATTRACTIONS) {
        if (a.stopId === stop && saved.has(a.id) && !a.sideTrip) visit += a.hours;
      }
    }
    load.push(load[i - 1] + route.legs[i - 1].hours + visit);
  }
  const totalLoad = load[N];

  // ── Riding days ───────────────────────────────────────────────────────
  const recommended = {
    min: Math.max(3, Math.ceil(totalLoad / pace.max)),
    ideal: Math.max(3, Math.round(totalLoad / pace.target)),
  };

  const userRest: Record<string, number> = {};
  for (const [stop, n] of Object.entries(settings.restDays)) {
    if (n > 0 && route.points.includes(stop) && stop !== route.points[0]) userRest[stop] = n;
  }
  const userRestTotal = Object.values(userRest).reduce((a, b) => a + b, 0);

  const canEnd = route.points.map((p, i) => i === N || (i > 0 && (STOP_BY_ID[p]?.overnight ?? 0) > 0));
  const maxRidingDays = canEnd.filter(Boolean).length;

  const pinnedStops = new Set([...settings.pinned, ...Object.keys(userRest)]);
  const pinnedIdx: number[] = [];
  const pinnedSeen = new Set<string>();
  route.points.forEach((p, i) => {
    if (i > 0 && i < N && pinnedStops.has(p) && !pinnedSeen.has(p) && canEnd[i]) {
      pinnedSeen.add(p);
      pinnedIdx.push(i);
    }
  });

  const available = Math.max(1, settings.days - userRestTotal);
  const maxUseful = Math.max(recommended.min, Math.ceil(totalLoad / pace.min));
  let R = Math.min(available, maxUseful, maxRidingDays);
  R = Math.max(R, Math.min(available, pinnedIdx.length + 1));
  if (available < recommended.min) {
    notes.push(
      `That's tight: at a ${pace.label.toLowerCase()} pace this loop needs about ${recommended.min}+ riding days. ` +
        `Expect long days or pick shorter route variants.`,
    );
  }
  if (userRestTotal >= settings.days) notes.push('You have more rest days than trip days — some rest days were ignored.');

  // ── DP split ──────────────────────────────────────────────────────────
  let ends = splitDays(R, N, load, canEnd, route.points, pinnedIdx, pace.max);
  if (!ends) {
    notes.push('Could not honour every pinned overnight stop with this many days — some pins were ignored.');
    ends = splitDays(R, N, load, canEnd, route.points, [], pace.max) ?? [N];
  }

  // ── Flex days (surplus) ───────────────────────────────────────────────
  const flexDays = Math.max(0, available - ends.length);
  const flexAt: Record<number, number> = {};
  if (flexDays > 0) {
    const candidates = ends
      .filter((e) => e !== N)
      .map((e) => ({ e, score: flexScore(route.points[e]) }))
      .sort((a, b) => b.score - a.score);
    for (let k = 0; k < flexDays && candidates.length; k++) {
      const c = candidates[k % candidates.length];
      flexAt[c.e] = (flexAt[c.e] ?? 0) + 1;
    }
    notes.push(
      `You have ${flexDays} spare day${flexDays > 1 ? 's' : ''} at this pace — added as flex days (explore, side trips or weather buffer). ` +
        `Choose a more relaxed pace to spread them into riding instead.`,
    );
  }

  // ── Assemble days ─────────────────────────────────────────────────────
  const days: PlanDay[] = [];
  const shownAttractions = new Set<string>();
  let prev = 0;
  const pushDay = (d: Omit<PlanDay, 'day' | 'date'>) => {
    const dayNum = days.length + 1;
    const date = dateFor(settings.startDate, dayNum - 1);
    days.push({ ...d, day: dayNum, date, holiday: date ? holidayOn(date) : undefined });
  };

  for (const e of ends) {
    const legs = route.legs.slice(prev, e);
    const via = route.points.slice(prev + 1, e + 1);
    const km = route.cumKm[e] - route.cumKm[prev];
    const hours = route.cumHours[e] - route.cumHours[prev];
    const warnings = uniqueWarnings(legs.flatMap((l) => l.warnings));
    const stopsToday = [...new Set(via)];
    const attractions = pickAttractions(stopsToday, saved, shownAttractions, false);
    const isLast = e === N;
    pushDay({
      kind: 'ride',
      from: route.points[prev],
      to: route.points[e],
      km,
      hours,
      legs,
      via,
      attractions,
      warnings,
      overnight: isLast ? undefined : route.points[e],
    });
    const stop = route.points[e];
    const rests = (userRest[stop] && !isLast ? userRest[stop] : 0) + (flexAt[e] ?? 0);
    for (let r = 0; r < rests; r++) {
      pushDay({
        kind: 'rest',
        flex: r >= (userRest[stop] ?? 0),
        from: stop,
        to: stop,
        km: 0,
        hours: 0,
        legs: [],
        via: [],
        attractions: pickAttractions([stop], saved, shownAttractions, true),
        warnings: [],
        overnight: stop,
      });
    }
    if (userRest[stop]) delete userRest[stop]; // only once per stop
    prev = e;
  }

  const skipped = Object.keys(userRest).filter((s) => s !== route.points[N]);
  if (skipped.length) {
    notes.push(`Rest days at ${skipped.map((s) => STOP_BY_ID[s]?.name ?? s).join(', ')} couldn't be placed on this route.`);
  }

  const restDays = days.filter((d) => d.kind === 'rest' && !d.flex).length;
  const ridingDays = days.filter((d) => d.kind === 'ride').length;
  const maxDay = Math.max(...days.map((d) => d.hours));
  if (maxDay > pace.max + 0.25) {
    notes.push(`Longest day is about ${maxDay.toFixed(1)} h of riding — start early and avoid riding after dark.`);
  }

  notes.push(...holidayNotes(settings.startDate, days.length));

  return {
    route,
    days,
    ridingDays,
    restDays,
    flexDays,
    totalKm: route.totalKm,
    totalRideHours: route.totalHours,
    recommended,
    notes,
  };
}

/**
 * Choose R day-end indices (last one === N) minimising squared deviation from
 * an even split. Returns null when constraints can't be satisfied.
 */
export function splitDays(
  R: number,
  N: number,
  load: number[],
  canEnd: boolean[],
  points: string[],
  pinnedIdx: number[],
  maxPerDay: number,
): number[] | null {
  const target = load[N] / R;
  const pinned = new Set(pinnedIdx);
  // dp[d][j] = min cost to end day d at j
  const dp: number[][] = Array.from({ length: R + 1 }, () => new Array(N + 1).fill(Infinity));
  const from: number[][] = Array.from({ length: R + 1 }, () => new Array(N + 1).fill(-1));
  dp[0][0] = 0;

  for (let d = 1; d <= R; d++) {
    for (let j = 1; j <= N; j++) {
      if (!canEnd[j]) continue;
      if (d === R && j !== N) continue;
      if (d < R && j === N) continue;
      const penalty = j === N ? 0 : OVERNIGHT_PENALTY[STOP_BY_ID[points[j]]?.overnight ?? 0];
      // Walk i backwards; stop once we'd skip a pinned point.
      for (let i = j - 1; i >= 0; i--) {
        if (dp[d - 1][i] < Infinity) {
          const dayLoad = load[j] - load[i];
          const over = Math.max(0, dayLoad - maxPerDay);
          const cost = dp[d - 1][i] + (dayLoad - target) ** 2 + 4 * over * over + penalty;
          if (cost < dp[d][j]) {
            dp[d][j] = cost;
            from[d][j] = i;
          }
        }
        if (pinned.has(i)) break; // i must be a day end; can't start earlier than it
      }
    }
  }

  if (dp[R][N] === Infinity) return null;
  const ends: number[] = [];
  let j = N;
  for (let d = R; d >= 1; d--) {
    ends.push(j);
    j = from[d][j];
  }
  ends.reverse();
  // Validate pins are all day ends.
  for (const p of pinnedIdx) if (!ends.includes(p)) return null;
  return ends;
}

function flexScore(stopId: string): number {
  const stop = STOP_BY_ID[stopId];
  if (!stop) return 0;
  const attractions = ATTRACTIONS.filter((a) => a.stopId === stopId);
  return stop.overnight * 2 + attractions.length + attractions.filter((a) => a.sideTrip).length * 2;
}

function pickAttractions(stops: string[], saved: Set<string>, shown: Set<string>, includeSideTrips: boolean): Attraction[] {
  const here = ATTRACTIONS.filter((a) => stops.includes(a.stopId) && !shown.has(a.id) && (includeSideTrips || !a.sideTrip || saved.has(a.id)));
  const picked = [
    ...here.filter((a) => saved.has(a.id)),
    ...here.filter((a) => !saved.has(a.id) && a.highlight),
  ];
  // On rest days, show everything available in town.
  if (includeSideTrips) picked.push(...here.filter((a) => !saved.has(a.id) && !a.highlight));
  const out = picked.slice(0, includeSideTrips ? 8 : 6);
  out.forEach((a) => shown.add(a.id));
  return out;
}

function holidayNotes(start: string, days: number): string[] {
  const out: string[] = [];
  if (!dateFor(start, 0)) return out;
  for (const h of holidaysDuring(start, days)) {
    if (h.kind === 'lunar-new-year') {
      out.push(
        `Your trip overlaps Lunar New Year (${fmtRange(h)}): rooms sell out and cost up to double, roads out of the cities jam, ` +
          `and many small restaurants close for the first days. Book every night ahead or shift your dates.`,
      );
    } else if (h.kind === 'long-weekend') {
      out.push(`${h.name} long weekend (${fmtRange(h)}): book rooms ahead and expect heavy traffic on the Suhua and South Link.`);
    } else {
      out.push(`${h.name} (${fmtRange(h)}) is a public holiday — busier roads and sights that day.`);
    }
  }
  if (!holidaysCovered(start, days)) out.push("Public holidays for your dates aren't in the app yet — check Taiwan's holiday calendar before booking.");
  return out;
}

function uniqueWarnings(ws: RoadWarning[]): RoadWarning[] {
  const seen = new Set<string>();
  return ws.filter((w) => (seen.has(w.text) ? false : (seen.add(w.text), true)));
}

export function dateFor(start: string, offset: number): string | undefined {
  if (!start) return undefined;
  const d = new Date(`${start}T00:00:00`);
  if (Number.isNaN(d.getTime())) return undefined;
  d.setDate(d.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
