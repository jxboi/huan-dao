/**
 * Encoded-polyline helpers (Google's algorithm) plus Douglas–Peucker
 * simplification. Used to store road-snapped leg geometry compactly in
 * `src/data/geo/legs.json` (see scripts/build-geometry.ts).
 */

export type LatLng = [number, number];

export function encodePolyline(points: LatLng[], precision = 5): string {
  const f = 10 ** precision;
  let out = '';
  let pLat = 0;
  let pLng = 0;
  for (const [lat, lng] of points) {
    const iLat = Math.round(lat * f);
    const iLng = Math.round(lng * f);
    out += encodeValue(iLat - pLat) + encodeValue(iLng - pLng);
    pLat = iLat;
    pLng = iLng;
  }
  return out;
}

function encodeValue(v: number): string {
  let n = v < 0 ? ~(v << 1) : v << 1;
  let out = '';
  while (n >= 0x20) {
    out += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
    n >>= 5;
  }
  return out + String.fromCharCode(n + 63);
}

export function decodePolyline(str: string, precision = 5): LatLng[] {
  const f = 10 ** precision;
  const points: LatLng[] = [];
  let i = 0;
  let lat = 0;
  let lng = 0;
  const next = () => {
    let shift = 0;
    let result = 0;
    let b: number;
    do {
      b = str.charCodeAt(i++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (i < str.length) {
    lat += next();
    lng += next();
    points.push([lat / f, lng / f]);
  }
  return points;
}

/** Approximate distance in metres (equirectangular; fine at leg scale). */
export function distanceM([aLat, aLng]: LatLng, [bLat, bLng]: LatLng): number {
  const R = 6371000;
  const x = ((bLng - aLng) * Math.PI) / 180 * Math.cos((((aLat + bLat) / 2) * Math.PI) / 180);
  const y = ((bLat - aLat) * Math.PI) / 180;
  return Math.sqrt(x * x + y * y) * R;
}

export function pathLengthKm(points: LatLng[]): number {
  let m = 0;
  for (let i = 1; i < points.length; i++) m += distanceM(points[i - 1], points[i]);
  return m / 1000;
}

/** Douglas–Peucker simplification with a tolerance in metres. Keeps both endpoints. */
export function simplify(points: LatLng[], toleranceM: number): LatLng[] {
  if (points.length <= 2) return points.slice();
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let maxD = 0;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = segmentDistanceM(points[i], points[a], points[b]);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (idx >= 0 && maxD > toleranceM) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function segmentDistanceM(p: LatLng, a: LatLng, b: LatLng): number {
  // Project onto a local flat plane (metres) centred on a.
  const k = Math.cos((a[0] * Math.PI) / 180);
  const toXY = ([lat, lng]: LatLng) => [(lng - a[1]) * k * 111320, (lat - a[0]) * 110540];
  const [px, py] = toXY(p);
  const [bx, by] = toXY(b);
  const len2 = bx * bx + by * by;
  const t = len2 ? Math.max(0, Math.min(1, (px * bx + py * by) / len2)) : 0;
  const dx = px - t * bx;
  const dy = py - t * by;
  return Math.sqrt(dx * dx + dy * dy);
}
