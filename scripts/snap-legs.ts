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
 * profile, ~1 request/s). Scooters ≤250cc may not use freeways, so requests pass
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
const TOLERANCE = 0.0003; // ≈ 30 m
const DELAY_MS = OSRM_URL.includes('project-osrm.org') ? 1100 : 0;

/**
 * Extra waypoints ([lat, lng]) per leg, for legs where the router picks the wrong road.
 * Example: 'taipei>pinglin': [[24.99, 121.63]] to keep it on Tai 9.
 */
const VIAS: Record<string, LatLng[]> = {};

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
export const LEG_GEOMETRY_SOURCE = ${JSON.stringify(`${OSRM_URL} (exclude=motorway), ${new Date().toISOString().slice(0, 10)}`)};
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
