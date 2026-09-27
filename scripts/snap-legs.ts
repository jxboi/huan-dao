/**
 * Generate road-snapped geometry for every leg in src/data/sections.ts and write it to
 * src/data/geo/legs.ts. Also prints legs whose routed distance disagrees with the km in the
 * data by more than 20 % — a useful check on research/01 numbers.
 *
 *   npm run snap-legs                       # snap legs that have no geometry yet
 *   npm run snap-legs -- --force            # re-snap everything
 *   npm run snap-legs -- --only=yilan>luodong,suao>nanao
 *   npm run snap-legs -- --dry-run          # report distances only, write nothing
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

const OUT = fileURLToPath(new URL('../src/data/geo/legs.ts', import.meta.url));
const OSRM_URL = (process.env.OSRM_URL ?? 'https://router.project-osrm.org').replace(/\/$/, '');
const VALHALLA_URL = process.env.VALHALLA_URL?.replace(/\/$/, '');
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
  // Hakka hills: router otherwise runs up the coast on Tai 61 (expressway sections ban scooters). Force Tai 3 via
  // Dahu, Shitan and Beipu, then County 122 from Xiagongguan (Zhudong) into Hsinchu (research/01).
  'sanyi>hsinchu': [[24.423, 120.866], [24.54, 120.9205], [24.702, 121.0567], [24.7231, 121.096]],
};

const args = process.argv.slice(2);
const force = args.includes('--force');
const dryRun = args.includes('--dry-run');
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
  const mismatches: string[] = [];
  let done = 0;
  let failed = 0;

  for (const [key, leg] of allLegs()) {
    if (only && !only.includes(key)) continue;
    if (!force && !only && existing[key] && !dryRun) continue;
    const a = STOP_BY_ID[leg.from];
    const b = STOP_BY_ID[leg.to];
    const pts: LatLng[] = [[a.lat, a.lng], ...(VIAS[key] ?? []), [b.lat, b.lng]];
    try {
      const { line, km } = await route(pts);
      const simple = simplify(line, TOLERANCE);
      out[key] = encodePolyline(simple);
      const diff = (km - leg.km) / leg.km;
      const note = `${key.padEnd(24)} data ${String(leg.km).padStart(4)} km · routed ${km.toFixed(0).padStart(4)} km (${(diff * 100).toFixed(0)}%) · ${simple.length} pts · ${leg.road}`;
      console.log(note);
      if (Math.abs(diff) > 0.2) mismatches.push(note);
      if (Math.abs(pathKm(simple) - km) / km > 0.1) console.warn(`  ! simplified line is much shorter than the route for ${key}`);
      done++;
    } catch (e) {
      console.error(`${key}: ${(e as Error).message}`);
      failed++;
    }
    if (DELAY_MS) await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  if (mismatches.length) {
    console.log(`\n${mismatches.length} leg(s) differ from the data by more than 20 % — check the road choice or the km:`);
    mismatches.forEach((m) => console.log(`  ${m}`));
  }
  console.log(`\n${done} snapped, ${failed} failed.`);
  if (dryRun || !done) return;

  const sorted = Object.fromEntries(Object.entries(out).sort(([x], [y]) => x.localeCompare(y)));
  const body = Object.entries(sorted)
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

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
