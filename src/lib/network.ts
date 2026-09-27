import { LINKS } from '../data/links';
import { SECTIONS } from '../data/sections';
import type { Leg, RoadWarning, Section, Variant } from '../data/types';

/**
 * The road network behind custom routes: every leg of every preset variant plus the extra LINKS, as an
 * undirected graph of stops. A custom route for a section is the chain section.from → your stops → section.to,
 * each hop filled in with the shortest path over this graph, so every km, road name, warning and map line
 * still comes from the researched data. Pure functions only.
 */

export interface Edge {
  from: string;
  to: string;
  km: number;
  speed: number;
  /** Roads in from → to order. */
  road: string;
  scenic: 1 | 2 | 3;
  warnings: RoadWarning[];
  /** Easiest preset (or link) difficulty this road appears in. */
  difficulty: 1 | 2 | 3;
}

export const CUSTOM_VARIANT = 'custom';

function buildEdges(): Map<string, Edge> {
  const edges = new Map<string, Edge>();
  const add = (e: Edge) => {
    // A road written both ways round (taipei>tamsui, tamsui>taipei) keeps both: each has its own km and map line.
    const key = `${e.from}>${e.to}`;
    const had = edges.get(key);
    if (had) had.difficulty = Math.min(had.difficulty, e.difficulty) as Edge['difficulty'];
    else edges.set(key, e);
  };
  for (const s of SECTIONS) {
    for (const v of s.variants) {
      let from = s.from;
      for (const l of v.legs) {
        add({ from, to: l.to, km: l.km, speed: l.speed, road: l.road, scenic: l.scenic ?? 1, warnings: l.warnings ?? [], difficulty: v.difficulty });
        from = l.to;
      }
    }
  }
  for (const l of LINKS) add({ ...l, scenic: l.scenic ?? 1, warnings: l.warnings ?? [] });
  return edges;
}

/** Every road once, keyed "from>to" as written in the data (clockwise for section legs). */
export const EDGES: Map<string, Edge> = buildEdges();

const ADJ = new Map<string, string[]>();
for (const e of EDGES.values()) {
  for (const [a, b] of [[e.from, e.to], [e.to, e.from]]) {
    const list = ADJ.get(a) ?? [];
    if (!list.includes(b)) ADJ.set(a, [...list, b]);
  }
}

/** Stops the network reaches. */
export const NETWORK_STOPS: string[] = [...ADJ.keys()];

/** The road a → b, oriented for riding a → b (multi-road strings are flipped when stored the other way). */
export function edgeBetween(a: string, b: string): Edge | undefined {
  const fwd = EDGES.get(`${a}>${b}`);
  if (fwd) return fwd;
  const back = EDGES.get(`${b}>${a}`);
  return back && { ...back, from: a, to: b, road: back.road.split(' / ').reverse().join(' / ') };
}

const PATHS = new Map<string, string[] | null>();

/** Shortest path by km (Dijkstra), as stop ids from a to b inclusive; null if unreachable. Cached: the network is static. */
export function shortestPath(a: string, b: string): string[] | null {
  const key = `${a}>${b}`;
  if (!PATHS.has(key)) PATHS.set(key, dijkstra(a, b));
  return PATHS.get(key)!;
}

function dijkstra(a: string, b: string): string[] | null {
  if (a === b) return [a];
  if (!ADJ.has(a) || !ADJ.has(b)) return null;
  const dist = new Map<string, number>([[a, 0]]);
  const prev = new Map<string, string>();
  const done = new Set<string>();
  while (true) {
    let u: string | undefined;
    for (const [k, d] of dist) if (!done.has(k) && (u === undefined || d < dist.get(u)!)) u = k;
    if (u === undefined) return null;
    if (u === b) break;
    done.add(u);
    for (const v of ADJ.get(u)!) {
      const d = dist.get(u)! + edgeBetween(u, v)!.km;
      if (d < (dist.get(v) ?? Infinity)) {
        dist.set(v, d);
        prev.set(v, u);
      }
    }
  }
  const path = [b];
  while (path[0] !== a) path.unshift(prev.get(path[0])!);
  return path;
}

/** Road km of the shortest path, or Infinity. */
export function distanceKm(a: string, b: string): number {
  const p = shortestPath(a, b);
  if (!p) return Infinity;
  let km = 0;
  for (let i = 1; i < p.length; i++) km += edgeBetween(p[i - 1], p[i])!.km;
  return km;
}

/** Every stop along section.from → stops → section.to, clockwise, with the shortest path filling each hop. */
export function expandStops(section: Section, stops: string[]): string[] {
  const chain = [section.from, ...stops, section.to];
  const out = [section.from];
  for (let i = 1; i < chain.length; i++) {
    const path = shortestPath(out[out.length - 1], chain[i]);
    if (path) out.push(...path.slice(1));
  }
  return out;
}

/** The stops you choose in a preset variant (everything between the hubs), clockwise. */
export function presetStops(variant: Variant): string[] {
  return variant.legs.slice(0, -1).map((l) => l.to);
}

/** A section variant through your chosen stops (clockwise), built from the network. */
export function customVariant(section: Section, stops: string[]): Variant {
  const nodes = expandStops(section, stops);
  const legs: Leg[] = [];
  let difficulty: Variant['difficulty'] = 1;
  for (let i = 1; i < nodes.length; i++) {
    const e = edgeBetween(nodes[i - 1], nodes[i])!;
    legs.push({ to: e.to, km: e.km, speed: e.speed, road: e.road, scenic: e.scenic, ...(e.warnings.length ? { warnings: e.warnings } : {}) });
    difficulty = Math.max(difficulty, e.difficulty) as Variant['difficulty'];
  }
  return {
    id: CUSTOM_VARIANT,
    name: 'Your route',
    summary: stops.length ? 'Your own stops, joined by the roads the presets use.' : 'Straight through on the shortest roads.',
    legs,
    difficulty,
    tags: ['custom'],
  };
}

const HUB_SET = new Set(SECTIONS.map((s) => s.from));

/**
 * km of a section through `stops`, and whether the route is bad: it doubles back through a stop, or strays into
 * another section's hub (which is how a "shortest" path to a far-off town goes most of the way round the island).
 */
function routeCost(section: Section, stops: string[]): { km: number; revisits: boolean } {
  const nodes = expandStops(section, stops);
  let km = 0;
  for (let i = 1; i < nodes.length; i++) km += edgeBetween(nodes[i - 1], nodes[i])!.km;
  const strays = nodes.slice(1, -1).some((n) => HUB_SET.has(n));
  return { km, revisits: strays || new Set(nodes).size < nodes.length };
}

/** How many km adding `stop` to a section's stops would add (at its best position); Infinity if it only fits by
 * doubling back or leaving the section. */
export function addedKm(section: Section, stops: string[], stop: string): number {
  const c = routeCost(section, insertStop(section, stops, stop));
  return c.revisits ? Infinity : c.km - routeCost(section, stops).km;
}

/** `stops` with `stop` inserted where it adds the fewest km, preferring routes that don't double back. */
export function insertStop(section: Section, stops: string[], stop: string): string[] {
  if (stops.includes(stop) || stop === section.from || stop === section.to) return stops;
  let best: { stops: string[]; km: number; revisits: boolean } | undefined;
  for (let i = 0; i <= stops.length; i++) {
    const cand = [...stops.slice(0, i), stop, ...stops.slice(i)];
    const c = routeCost(section, cand);
    if (!best || better(c, best)) best = { stops: cand, ...c };
  }
  return best!.stops;
}

/** Drop stops in `droppable` that are detours (the route gets shorter without them). */
export function pruneDetours(section: Section, stops: string[], droppable: Set<string>): string[] {
  let cur = stops;
  let cost = routeCost(section, cur);
  for (let changed = true; changed; ) {
    changed = false;
    for (const s of cur) {
      if (!droppable.has(s)) continue;
      const cand = cur.filter((x) => x !== s);
      const c = routeCost(section, cand);
      if (c.km < cost.km - 0.01 && (!c.revisits || cost.revisits)) {
        cur = cand;
        cost = c;
        changed = true;
        break;
      }
    }
  }
  return cur;
}

function better(a: { km: number; revisits: boolean }, b: { km: number; revisits: boolean }): boolean {
  if (a.revisits !== b.revisits) return !a.revisits;
  return a.km < b.km;
}

/**
 * Where to put a new stop: across `candidates` (sections with their current stops), the section and stop list
 * that add the fewest km after inserting it and dropping any `droppable` stops that became detours, avoiding
 * routes that double back (`revisits` says whether even the best one does).
 */
export function placeStop(
  candidates: { section: Section; stops: string[] }[],
  stop: string,
  droppable: Set<string> = new Set(),
): { sectionId: string; stops: string[]; revisits: boolean } | null {
  const drop = new Set([...droppable].filter((s) => s !== stop));
  let best: { sectionId: string; stops: string[]; km: number; revisits: boolean } | undefined;
  for (const { section, stops } of candidates) {
    const next = pruneDetours(section, insertStop(section, stops, stop), drop);
    if (!expandStops(section, next).includes(stop)) continue;
    const c = routeCost(section, next);
    const added = { km: c.km - routeCost(section, stops).km, revisits: c.revisits };
    if (!best || better(added, best)) best = { sectionId: section.id, stops: next, ...added };
  }
  return best ? { sectionId: best.sectionId, stops: best.stops, revisits: best.revisits } : null;
}
