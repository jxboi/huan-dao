/**
 * Generate road-snapped geometry for every leg in src/data/sections.ts and write it to
 * src/data/geo/legs.ts. Also prints legs whose routed distance disagrees with the km in the
 * data by more than 20 % — a useful check on research/01 numbers.
 *
 *   npm run snap-legs                       # snap legs that have no geometry yet
 *   npm run snap-legs -- --force            # re-snap everything
 *   npm run snap-legs -- --only=yilan>luodong,suao>nanao
 *   npm run snap-legs -- --dry-run          # report distances only, write nothing
 *   npm run snap-legs -- --roads-only       # re-check existing lines: record their roads, don't re-route
 *
 * Every line is map-matched with Valhalla (trace_attributes) to record the roads it follows in
 * src/data/geo/legRoads.ts, and checked against src/data/scooterRules.ts: a newly routed line that uses a road
 * white-plate scooters may not ride (freeway, expressway, Suhua new-road tunnel) is NOT saved. Add VIAS to steer
 * it, or pass --allow-banned to save it anyway (the tests will still fail until a rule allows it).
 *
 * Router: any OSRM-compatible server, set with OSRM_URL (default: the public OSRM demo, car
 * profile, ~1 request/s). Or set VALHALLA_URL (e.g. https://valhalla1.openstreetmap.de) to use
 * Valhalla's `motor_scooter` costing, which never uses motorways and honours moped/scooter access
 * tags — closer to Taiwan's ≤250cc rules than OSRM's car profile. Scooters ≤250cc may not use freeways, so requests pass
 * `exclude=motorway`; expressways tagged as trunk roads (parts of Tai 61–88) can still slip
 * through, so check the result on the map. For best results run OSRM locally with a
 * scooter/moped profile. Force a road with VIAS below.
 *
 * Needs Node ≥ 22.18 (runs TypeScript directly).
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SECTIONS } from '../src/data/sections.ts';
import { STOP_BY_ID } from '../src/data/stops.ts';
import { decodePolyline, encodePolyline, pathKm, simplify, type LatLng } from '../src/lib/geo.ts';
import { describeSeg, lineFingerprint, namedShare, violations, type RoadSeg } from '../src/lib/roadCheck.ts';
import { SCOOTER_RULES } from '../src/data/scooterRules.ts';

const OUT = fileURLToPath(new URL('../src/data/geo/legs.ts', import.meta.url));
const ROADS_OUT = fileURLToPath(new URL('../src/data/geo/legRoads.ts', import.meta.url));
const OSRM_URL = (process.env.OSRM_URL ?? 'https://router.project-osrm.org').replace(/\/$/, '');
const VALHALLA_URL = process.env.VALHALLA_URL?.replace(/\/$/, '');
// Map-matching (which roads a line follows) always uses Valhalla; OSRM has no equivalent with road classes.
const TRACE_URL = VALHALLA_URL ?? 'https://valhalla1.openstreetmap.de';
const ROUTER = VALHALLA_URL ? `${VALHALLA_URL} (motor_scooter)` : `${OSRM_URL} (exclude=motorway)`;
const TOLERANCE = 0.0003; // ≈ 30 m
const DELAY_MS = /project-osrm\.org|openstreetmap\.de/.test(VALHALLA_URL ?? OSRM_URL) ? 1100 : 0;

/**
 * Extra waypoints ([lat, lng]) per leg, for legs where the router picks the wrong road.
 * Example: 'taipei>pinglin': [[24.99, 121.63]] to keep it on Tai 9.
 */
const VIAS: Record<string, LatLng[]> = {
  // Router otherwise detours via Guangfu / Tai 11A and the coast instead of along the Xiuguluan River.
  'ruisui>jingpu': [[23.505, 121.44]],
  // Router otherwise leaves Tai 23 for the coast road.
  'fuli>donghe': [[23.08, 121.31]],
  // County 106 via Shenkeng & Shiding (research/01). Surface streets out of Taipei: the router otherwise takes the
  // 市民大道高架 / 環東大道 / 建國 elevated expressways, which ban scooters.
  'taipei>pingxi': [[25.0415, 121.544], [25.0215, 121.557], [24.9985, 121.57], [24.9993, 121.6158], [24.9914, 121.6583]],
  // White-plate scooters may not use the 蘇花改 Nan'ao–Heping tunnels (Tai 9): keep to the old road, Tai 9D (research/02).
  'nanao>heping': [[24.4448, 121.7824], [24.3947, 121.7847], [24.3484, 121.7733]],
  // Tai 21 to Puli, Tai 14 via Guoxing to Caotun, Tai 3 via Wufeng; router otherwise takes County 136 over the hills.
  'sunmoonlake>taichung': [[23.918, 120.927], [23.966, 120.946], [24.042, 120.858], [23.9737, 120.6802], [24.061, 120.7]],
  // Surface streets in and out of Taipei: routers otherwise use Taipei's expressways/elevated roads (市民大道高架,
  // 環東大道, 建國, 洲美, 中山高架), which ban white-plate scooters (research/02).
  'taipei>keelung': [[25.0415, 121.544], [25.052, 121.607], [25.063, 121.657]],
  'taipei>pinglin': [[25.0395, 121.5185], [25.027, 121.5225], [25.013, 121.535], [24.975, 121.54]],
  'tamsui>taipei': [[25.1255, 121.47], [25.106, 121.503], [25.08, 121.519]],
  // Into Taipei via Banqiao and Wanhua: Tai 1 through Xinzhuang/Sanchong and the Taipei Bridge approach are elevated.
  'hsinchu>taipei': [[24.99, 121.3], [25.033, 121.438], [25.012, 121.463], [25.034, 121.5]],
  // Tai 15 through Bali, onto 淡江大橋 from the 挖子尾 ramp rather than the Tai 61 expressway (research/02).
  'hsinchu>tamsui': [[25.148, 121.4], [25.1595, 121.419]],
  // "Tai 1 (west plains)": keep to Tai 1 via Dajia, Tongxiao and Zhunan (router otherwise goes inland on Tai 13
  // and touches the Tai 61 expressway near Hsinchu).
  'taichung>hsinchu': [[24.346, 120.6245], [24.4905, 120.68], [24.615, 120.796], [24.656, 120.866], [24.719, 120.917], [24.763, 120.913]],
  // Hakka hills: router otherwise runs up the coast on Tai 61 (expressway sections ban scooters). Force Tai 3 via
  // Dahu, Shitan and Beipu, then County 122 from Xiagongguan (Zhudong) into Hsinchu (research/01).
  'sanyi>hsinchu': [[24.423, 120.866], [24.54, 120.9205], [24.702, 121.0567], [24.7231, 121.096]],
};

const args = process.argv.slice(2);
const force = args.includes('--force');
const dryRun = args.includes('--dry-run');
const roadsOnly = args.includes('--roads-only');
const allowBanned = args.includes('--allow-banned');
const only = args.find((a) => a.startsWith('--only='))?.slice(7).split(',');

function allLegs() {
  const legs = new Map<string, { from: string; to: string; km: number; road: string }>();
  for (const s of SECTIONS) {
    for (const v of s.variants) {
      let from = s.from;
      for (const l of v.legs) {
        const key = `${from}>${l.to}`;
        if (!legs.has(key)) legs.set(key, { from, to: l.to, km: l.km, road: l.road });
        from = l.to;
      }
    }
  }
  return legs;
}

function readExisting(): Record<string, string> {
  if (!existsSync(OUT)) return {};
  const m = readFileSync(OUT, 'utf8').match(/LEG_GEOMETRY: Record<string, string> = (\{[\s\S]*?\});/);
  return m ? JSON.parse(m[1].replace(/,\s*}$/, '}')) : {};
}

interface LegRoads {
  /** lineFingerprint() of the encoded line the roads were read from. */
  line: string;
  roads: RoadSeg[];
}

function readExistingRoads(): Record<string, LegRoads> {
  if (!existsSync(ROADS_OUT)) return {};
  const m = readFileSync(ROADS_OUT, 'utf8').match(/LEG_ROADS: Record<string, LegRoads> = (\{[\s\S]*\});/);
  return m ? JSON.parse(m[1]) : {};
}

/** The roads a line follows, in order: consecutive edges with the same names/class/tunnel merged into runs. */
async function traceRoads(line: LatLng[]): Promise<RoadSeg[]> {
  const res = await fetch(`${TRACE_URL}/trace_attributes`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'huan-dao-planner snap-legs' },
    body: JSON.stringify({
      shape: line.map(([lat, lon]) => ({ lat, lon })),
      costing: 'motor_scooter',
      shape_match: 'map_snap',
      filters: {
        attributes: ['edge.names', 'edge.length', 'edge.road_class', 'edge.tunnel', 'edge.begin_shape_index', 'shape'],
        action: 'include',
      },
    }),
  });
  if (!res.ok) throw new Error(`trace ${res.status} ${await res.text()}`);
  const json = (await res.json()) as {
    shape: string;
    edges: { names?: string[]; length: number; road_class: string; tunnel?: boolean; begin_shape_index: number }[];
  };
  const shape = decodePolyline(json.shape, 6);
  const segs: RoadSeg[] = [];
  for (const e of json.edges) {
    const names = e.names ?? [];
    const last = segs[segs.length - 1];
    if (last && last.cls === e.road_class && !!last.tunnel === !!e.tunnel && last.names.join('/') === names.join('/')) {
      last.km += e.length;
    } else {
      const [lat, lng] = shape[e.begin_shape_index] ?? line[0];
      segs.push({ names, cls: e.road_class, km: e.length, ...(e.tunnel ? { tunnel: true } : {}), lat, lng });
    }
  }
  return segs.map((x) => ({ ...x, km: Math.round(x.km * 100) / 100, lat: Math.round(x.lat * 1000) / 1000, lng: Math.round(x.lng * 1000) / 1000 }));
}

async function route(points: LatLng[]): Promise<{ line: LatLng[]; km: number }> {
  return VALHALLA_URL ? routeValhalla(points) : routeOsrm(points);
}

async function routeValhalla(points: LatLng[]): Promise<{ line: LatLng[]; km: number }> {
  const res = await fetch(`${VALHALLA_URL}/route`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      // Ends break the route; extra VIAS only force the path through a point.
      locations: points.map(([lat, lon], i) => ({ lat, lon, type: i === 0 || i === points.length - 1 ? 'break' : 'through' })),
      costing: 'motor_scooter',
      costing_options: { motor_scooter: { use_primary: 0.6, use_hills: 0.6 } },
      units: 'kilometers',
      directions_type: 'none',
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const json = (await res.json()) as { trip: { summary: { length: number }; legs: { shape: string }[] } };
  // Valhalla shapes are precision-6 polylines.
  return { line: json.trip.legs.flatMap((l) => decodePolyline(l.shape, 6)), km: json.trip.summary.length };
}

async function routeOsrm(points: LatLng[]): Promise<{ line: LatLng[]; km: number }> {
  const coords = points.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const url = `${OSRM_URL}/route/v1/driving/${coords}?overview=full&geometries=polyline&exclude=motorway`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const json = (await res.json()) as { code: string; message?: string; routes?: { geometry: string; distance: number }[] };
  if (json.code !== 'Ok' || !json.routes?.length) throw new Error(json.message ?? json.code);
  return { line: decodePolyline(json.routes[0].geometry), km: json.routes[0].distance / 1000 };
}

async function main() {
  const existing = readExisting();
  const out: Record<string, string> = { ...existing };
  const roads: Record<string, LegRoads> = readExistingRoads();
  const mismatches: string[] = [];
  const offRoad: string[] = [];
  const rejected: string[] = [];
  let done = 0;
  let failed = 0;

  for (const [key, leg] of allLegs()) {
    if (only && !only.includes(key)) continue;
    if (roadsOnly && !existing[key]) continue;
    if (!roadsOnly && !force && !only && existing[key] && !dryRun) continue;
    const a = STOP_BY_ID[leg.from];
    const b = STOP_BY_ID[leg.to];
    const pts: LatLng[] = [[a.lat, a.lng], ...(VIAS[key] ?? []), [b.lat, b.lng]];
    try {
      let simple: LatLng[];
      if (roadsOnly) {
        simple = decodePolyline(existing[key]);
      } else {
        const { line, km } = await route(pts);
        simple = simplify(line, TOLERANCE);
        const diff = (km - leg.km) / leg.km;
        const note = `${key.padEnd(24)} data ${String(leg.km).padStart(4)} km · routed ${km.toFixed(0).padStart(4)} km (${(diff * 100).toFixed(0)}%) · ${simple.length} pts · ${leg.road}`;
        console.log(note);
        if (Math.abs(diff) > 0.2) mismatches.push(note);
        if (Math.abs(pathKm(simple) - km) / km > 0.1) console.warn(`  ! simplified line is much shorter than the route for ${key}`);
        if (DELAY_MS) await new Promise((r) => setTimeout(r, DELAY_MS));
      }

      const segs = await traceRoads(simple);
      const bad = violations(segs, SCOOTER_RULES);
      const share = namedShare(leg.road, segs);
      if (roadsOnly) console.log(`${key.padEnd(24)} ${(share * 100).toFixed(0).padStart(3)} % on "${leg.road}"${bad.length ? ` · ${bad.length} banned run(s)` : ''}`);
      bad.forEach((v) => console.warn(`  ✗ ${v.rule.label}: ${describeSeg(v.seg)}`));
      if (share < 0.5) offRoad.push(`${key.padEnd(24)} ${(share * 100).toFixed(0)} % on "${leg.road}"`);

      if (bad.length && !roadsOnly && !allowBanned) {
        rejected.push(key);
        failed++;
      } else {
        if (!roadsOnly) out[key] = encodePolyline(simple);
        roads[key] = { line: lineFingerprint(out[key]), roads: segs };
        done++;
      }
    } catch (e) {
      console.error(`${key}: ${(e as Error).message}`);
      failed++;
    }
    await new Promise((r) => setTimeout(r, 1100)); // public Valhalla: ~1 request/s
  }

  if (mismatches.length) {
    console.log(`\n${mismatches.length} leg(s) differ from the data by more than 20 % — check the road choice or the km:`);
    mismatches.forEach((m) => console.log(`  ${m}`));
  }
  if (offRoad.length) {
    console.log(`\n${offRoad.length} leg(s) spend less than half their distance on the roads the data names:`);
    offRoad.forEach((m) => console.log(`  ${m}`));
  }
  if (rejected.length) {
    console.log(`\nNOT saved — uses roads scooters may not ride (add VIAS, or --allow-banned): ${rejected.join(', ')}`);
  }
  console.log(`\n${done} ${roadsOnly ? 'checked' : 'snapped'}, ${failed} failed.`);
  if (dryRun || !done) return;

  if (!roadsOnly) writeGeometry(out);
  writeRoads(roads);
}

function sortKeys<T>(o: Record<string, T>): [string, T][] {
  return Object.entries(o).sort(([x], [y]) => x.localeCompare(y));
}

function writeGeometry(out: Record<string, string>) {
  const body = sortKeys(out)
    .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
    .join('\n');
  writeFileSync(
    OUT,
    `/**
 * Road-snapped leg geometry, keyed "from>to" in clockwise order (see lib/geo.ts), as Google
 * encoded polylines (precision 5). GENERATED by \`npm run snap-legs\` — see scripts/snap-legs.ts.
 * Legs missing here are drawn as straight lines.
 */
export const LEG_GEOMETRY_SOURCE = ${JSON.stringify(`${ROUTER}, ${new Date().toISOString().slice(0, 10)}`)};
export const LEG_GEOMETRY: Record<string, string> = {
${body}
};
`,
  );
  console.log(`Wrote ${OUT}`);
}

function writeRoads(roads: Record<string, LegRoads>) {
  // Valid JSON between "= " and ";" so readExistingRoads can parse it back.
  const body = sortKeys(roads)
    .map(
      ([k, { line, roads: segs }]) =>
        `  ${JSON.stringify(k)}: {\n    "line": ${JSON.stringify(line)},\n    "roads": [\n${segs.map((x) => `      ${JSON.stringify(x)}`).join(',\n')}\n    ]\n  }`,
    )
    .join(',\n');
  writeFileSync(
    ROADS_OUT,
    `/**
 * The roads each leg's map line (legs.ts) follows, from Valhalla map-matching, in clockwise order.
 * GENERATED by \`npm run snap-legs\` — see scripts/snap-legs.ts. Used only by tests
 * (scooterRules.test.ts), never shipped to the browser.
 */
import type { RoadSeg } from '../../lib/roadCheck';

/** \`line\` is lineFingerprint() of the legs.ts line the roads were read from; a mismatch means re-run snap-legs. */
export interface LegRoads {
  line: string;
  roads: RoadSeg[];
}

export const LEG_ROADS_SOURCE = ${JSON.stringify(`${TRACE_URL} trace_attributes (motor_scooter), ${new Date().toISOString().slice(0, 10)}`)};
export const LEG_ROADS: Record<string, LegRoads> = {
${body}
};
`,
  );
  console.log(`Wrote ${ROADS_OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
