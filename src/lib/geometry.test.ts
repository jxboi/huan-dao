import { describe, expect, it } from 'vitest';
import geoJson from '../data/geo/legs.json';
import { SECTIONS } from '../data/sections';
import { STOP_BY_ID } from '../data/stops';
import { hasLegGeometry, joinPaths, legKey, legPath, type LegGeometryFile } from './geometry';
import { decodePolyline, distanceM, encodePolyline, simplify, type LatLng } from './polyline';

const coords = (id: string): LatLng | undefined => {
  const s = STOP_BY_ID[id];
  return s ? [s.lat, s.lng] : undefined;
};

describe('polyline', () => {
  it('matches the reference encoding from the Google docs', () => {
    const pts: LatLng[] = [
      [38.5, -120.2],
      [40.7, -120.95],
      [43.252, -126.453],
    ];
    expect(encodePolyline(pts)).toBe('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toEqual(pts);
  });

  it('round-trips at precision 6 (Valhalla)', () => {
    const pts: LatLng[] = [
      [25.047675, 121.517055],
      [24.757613, 121.753433],
    ];
    expect(decodePolyline(encodePolyline(pts, 6), 6)).toEqual(pts);
  });

  it('simplify drops near-collinear points but keeps corners and endpoints', () => {
    const pts: LatLng[] = [
      [25, 121],
      [25.00001, 121.005], // ~1 m off the line
      [25, 121.01],
      [25.01, 121.01], // a real corner
    ];
    expect(simplify(pts, 10)).toEqual([pts[0], pts[2], pts[3]]);
  });
});

describe('leg geometry lookup', () => {
  const geo: LegGeometryFile = {
    generated: '2026-09-27',
    source: 'test',
    legs: { [legKey('taipei', 'keelung')]: { km: 30, poly: encodePolyline([[25.04, 121.51], [25.1, 121.6], [25.13, 121.74]]) } },
  };

  it('uses stored geometry forwards and reversed', () => {
    const fwd = legPath(geo, 'taipei', 'keelung', coords);
    const rev = legPath(geo, 'keelung', 'taipei', coords);
    expect(fwd.snapped).toBe(true);
    expect(fwd.points).toHaveLength(3);
    expect(rev.points).toEqual([...fwd.points].reverse());
    expect(hasLegGeometry(geo, 'keelung', 'taipei')).toBe(true);
  });

  it('falls back to a straight line', () => {
    const p = legPath(geo, 'keelung', 'jiufen', coords);
    expect(p.snapped).toBe(false);
    expect(p.points).toEqual([coords('keelung'), coords('jiufen')]);
    expect(legPath(null, 'taipei', 'keelung', coords).snapped).toBe(false);
  });

  it('joins paths without duplicating shared endpoints', () => {
    expect(joinPaths([[[0, 0], [1, 1]], [[1, 1], [2, 2]], []])).toEqual([[0, 0], [1, 1], [2, 2]]);
  });
});

describe('stored geometry (src/data/geo/legs.json)', () => {
  const geo = geoJson as LegGeometryFile;
  const legs = new Map<string, { from: string; to: string }>();
  for (const s of SECTIONS) for (const v of s.variants) {
    let from = s.from;
    for (const l of v.legs) {
      legs.set(legKey(from, l.to), { from, to: l.to });
      from = l.to;
    }
  }

  it('only has geometry for legs that exist (re-run `npm run geo` after editing sections)', () => {
    for (const key of Object.keys(geo.legs)) expect(legs.has(key), key).toBe(true);
  });

  it('starts and ends near its stops', () => {
    for (const [key, { poly }] of Object.entries(geo.legs)) {
      const { from, to } = legs.get(key)!;
      const pts = decodePolyline(poly);
      expect(pts.length, key).toBeGreaterThanOrEqual(2);
      // Routers snap town centres to the nearest road; 3 km catches moved stops.
      expect(distanceM(pts[0], coords(from)!), `${key} start`).toBeLessThan(3000);
      expect(distanceM(pts.at(-1)!, coords(to)!), `${key} end`).toBeLessThan(3000);
    }
  });
});
