import { decodePolyline, type LatLng } from './polyline';

/**
 * Road-snapped leg geometry, pre-computed by `npm run geo`
 * (scripts/build-geometry.ts) and stored in `src/data/geo/legs.json`.
 * Keys are clockwise `from>to` stop ids, exactly as the legs are listed in
 * `SECTIONS`. Legs without geometry fall back to a straight line.
 */
export interface LegGeometryFile {
  generated: string | null;
  source: string | null;
  /** Encoded polyline (precision 5) + routed distance per leg. */
  legs: Record<string, { poly: string; km: number }>;
}

export const legKey = (from: string, to: string) => `${from}>${to}`;

export const hasLegGeometry = (geo: LegGeometryFile | null, from: string, to: string) =>
  !!(geo?.legs[legKey(from, to)] ?? geo?.legs[legKey(to, from)]);

/**
 * Path for travelling from → to. Uses the stored geometry in either
 * direction; otherwise a straight line between the two stops.
 */
export function legPath(
  geo: LegGeometryFile | null,
  from: string,
  to: string,
  coords: (id: string) => LatLng | undefined,
): { points: LatLng[]; snapped: boolean } {
  const fwd = geo?.legs[legKey(from, to)];
  if (fwd) return { points: decodePolyline(fwd.poly), snapped: true };
  const rev = geo?.legs[legKey(to, from)];
  if (rev) return { points: decodePolyline(rev.poly).reverse(), snapped: true };
  const a = coords(from);
  const b = coords(to);
  return { points: a && b ? [a, b] : [], snapped: false };
}

/** Joins consecutive leg paths into one line, dropping duplicated join points. */
export function joinPaths(paths: LatLng[][]): LatLng[] {
  const out: LatLng[] = [];
  for (const p of paths) {
    const last = out.at(-1);
    const first = p[0];
    out.push(...(last && first && last[0] === first[0] && last[1] === first[1] ? p.slice(1) : p));
  }
  return out;
}
