/**
 * Pre-computes road-snapped geometry for every leg in SECTIONS and writes
 * src/data/geo/legs.json. Run with `npm run geo` (Node ≥ 22.18, or 22.6+
 * with --experimental-strip-types).
 *
 * Router: Valhalla with the `motor_scooter` costing, which never uses
 * motorways and honours moped/scooter access tags — close to the rules for
 * ≤250cc scooters in Taiwan (no national freeways / most expressways).
 * Always eyeball the result on the map: if a leg takes the wrong road, add
 * `via` points to that leg in src/data/sections.ts and re-run with `--only`.
 *
 *   npm run geo                       # route legs that have no geometry yet
 *   npm run geo -- --force            # re-route everything
 *   npm run geo -- --only hualien>taroko
 *   VALHALLA_URL=http://localhost:8002 DELAY_MS=0 npm run geo   # own Valhalla instance
 *
 * Route data © OpenStreetMap contributors (ODbL).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { SECTIONS } from '../src/data/sections.ts';
import { STOP_BY_ID } from '../src/data/stops.ts';
import { decodePolyline, encodePolyline, pathLengthKm, simplify, type LatLng } from '../src/lib/polyline.ts';

const OUT = new URL('../src/data/geo/legs.json', import.meta.url);
const VALHALLA = process.env.VALHALLA_URL ?? 'https://valhalla1.openstreetmap.de';
const COSTING = process.env.COSTING ?? 'motor_scooter';
const TOLERANCE_M = 25; // simplification tolerance; plenty for a phone-sized map
const DELAY_MS = +(process.env.DELAY_MS ?? 1200); // public server fair-use: ≤ 1 request / second

const args = process.argv.slice(2);
const force = args.includes('--force');
const onlyIdx = args.indexOf('--only');
const only = onlyIdx >= 0 ? args[onlyIdx + 1] : undefined;

type Entry = { poly: string; km: number };
const existing = JSON.parse(readFileSync(OUT, 'utf8')) as { legs: Record<string, Entry> };

// Every clockwise leg once (variants share many legs).
const wanted = new Map<string, { from: string; to: string; km: number; road: string; via: [number, number][] }>();
for (const s of SECTIONS) {
  for (const v of s.variants) {
    let from = s.from;
    for (const l of v.legs) {
      const key = `${from}>${l.to}`;
      if (!wanted.has(key)) wanted.set(key, { from, to: l.to, km: l.km, road: l.road, via: l.via ?? [] });
      from = l.to;
    }
  }
}

async function route(from: string, to: string, via: [number, number][]): Promise<{ points: LatLng[]; km: number }> {
  const a = STOP_BY_ID[from];
  const b = STOP_BY_ID[to];
  const body = {
    locations: [
      { lat: a.lat, lon: a.lng, type: 'break' },
      ...via.map(([lat, lon]) => ({ lat, lon, type: 'through' })),
      { lat: b.lat, lon: b.lng, type: 'break' },
    ],
    costing: COSTING,
    costing_options: { [COSTING]: { use_primary: 0.6, use_hills: 0.6 } },
    units: 'kilometers',
    directions_type: 'none',
  };
  const res = await fetch(`${VALHALLA}/route`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'huan-dao-planner geometry build' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const json = (await res.json()) as { trip: { summary: { length: number }; legs: { shape: string }[] } };
  const points: LatLng[] = [];
  for (const leg of json.trip.legs) points.push(...decodePolyline(leg.shape, 6));
  return { points, km: json.trip.summary.length };
}

const legs: Record<string, Entry> = {};
const suspicious: string[] = [];
let routed = 0;
for (const [key, w] of wanted) {
  const keep = existing.legs[key];
  if (keep && !force && (!only || only !== key)) {
    legs[key] = keep;
    continue;
  }
  if (only && only !== key) continue;
  if (routed++) await new Promise((r) => setTimeout(r, DELAY_MS));
  try {
    const { points, km } = await route(w.from, w.to, w.via);
    const simple = simplify(points, TOLERANCE_M);
    legs[key] = { poly: encodePolyline(simple), km: Math.round(km * 10) / 10 };
    const ratio = km / w.km;
    const flag = ratio > 1.25 || ratio < 0.8 ? '  ⚠ check road / km in sections.ts' : '';
    if (flag) suspicious.push(`${key}: routed ${km.toFixed(1)} km vs data ${w.km} km (${w.road})`);
    console.log(
      `${key.padEnd(28)} ${km.toFixed(1).padStart(6)} km (data ${w.km}) · ${points.length}→${simple.length} pts · ${pathLengthKm(simple).toFixed(1)} km drawn${flag}`,
    );
  } catch (e) {
    console.error(`${key}: FAILED ${(e as Error).message}`);
    if (keep) legs[key] = keep;
  }
}

// Keys follow SECTIONS order; stale legs (removed from data) are dropped.
// One leg per line keeps diffs readable.
const q = JSON.stringify;
const lines = Object.entries(legs).map(([k, v]) => `  ${q(k)}: { "km": ${v.km}, "poly": ${q(v.poly)} }`);
writeFileSync(
  OUT,
  `{
 "generated": ${q(new Date().toISOString().slice(0, 10))},
 "source": ${q(`Valhalla (${COSTING}) on OpenStreetMap data © OpenStreetMap contributors, ODbL`)},
 "legs": {
${lines.join(',\n')}
 }
}
`,
);
console.log(`\n${Object.keys(legs).length}/${wanted.size} legs have geometry → src/data/geo/legs.json`);
if (suspicious.length) console.log(`\nDistance mismatches (>25 %):\n  ${suspicious.join('\n  ')}`);
