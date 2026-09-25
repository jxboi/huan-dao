import { describe, expect, it } from 'vitest';
import { LEG_GEOMETRY } from '../data/geo/legs';
import { SECTIONS } from '../data/sections';
import { STOP_BY_ID } from '../data/stops';
import { decodePolyline, encodePolyline, haversineKm, legKey, legPath, pathKm, pathThrough, simplify, type LatLng } from './geo';

const stops = {
  a: { lat: 25, lng: 121 },
  b: { lat: 24, lng: 121.5 },
  c: { lat: 23, lng: 121.2 },
};

describe('polyline encoding', () => {
  // Example from Google's encoded polyline algorithm docs.
  const example: LatLng[] = [
    [38.5, -120.2],
    [40.7, -120.95],
    [43.252, -126.453],
  ];
  const encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';

  it('matches the reference example both ways', () => {
    expect(encodePolyline(example)).toBe(encoded);
    expect(decodePolyline(encoded)).toEqual(example);
  });

  it('round-trips at 1e-5 precision', () => {
    const pts: LatLng[] = [
      [25.04781, 121.51701],
      [24.99999, 121.6],
      [22.00001, 120.74321],
    ];
    decodePolyline(encodePolyline(pts)).forEach(([lat, lng], i) => {
      expect(lat).toBeCloseTo(pts[i][0], 5);
      expect(lng).toBeCloseTo(pts[i][1], 5);
    });
    expect(decodePolyline('')).toEqual([]);
  });
});

describe('simplify', () => {
  it('drops near-collinear points and keeps corners and ends', () => {
    const line: LatLng[] = [
      [0, 0],
      [0.5, 0.00001],
      [1, 0],
      [1, 1],
    ];
    expect(simplify(line, 0.001)).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
    ]);
    expect(simplify(line.slice(0, 2), 1)).toEqual(line.slice(0, 2));
  });
});

describe('distances', () => {
  it('haversine is about right for Taipei → Kaohsiung (~300 km as the crow flies)', () => {
    const km = haversineKm([25.048, 121.517], [22.627, 120.301]);
    expect(km).toBeGreaterThan(280);
    expect(km).toBeLessThan(310);
    expect(pathKm([[25, 121], [25, 121], [26, 121]])).toBeCloseTo(111.2, 0);
  });
});

describe('leg paths', () => {
  it('falls back to a straight line', () => {
    expect(legPath('a', 'b', stops, {})).toEqual([
      [25, 121],
      [24, 121.5],
    ]);
    expect(legPath('a', 'nowhere', stops, {})).toEqual([]);
  });

  it('uses snapped geometry, reversed for counter-clockwise travel', () => {
    const line: LatLng[] = [
      [25, 121],
      [24.5, 121.4],
      [24, 121.5],
    ];
    const legs = { [legKey('a', 'b')]: encodePolyline(line) };
    expect(legPath('a', 'b', stops, legs)).toEqual(line);
    expect(legPath('b', 'a', stops, legs)).toEqual([...line].reverse());
  });

  it('joins legs without duplicating shared stops', () => {
    expect(pathThrough(['a', 'b', 'c'], stops, {})).toEqual([
      [25, 121],
      [24, 121.5],
      [23, 121.2],
    ]);
    expect(pathThrough(['a'], stops, {})).toEqual([[25, 121]]);
  });
});

describe('generated geometry', () => {
  const legs = new Set(SECTIONS.flatMap((s) => s.variants.flatMap((v) => v.legs.map((l, i) => legKey(i ? v.legs[i - 1].to : s.from, l.to)))));

  it('only has clockwise keys for real legs, starting and ending near their stops', () => {
    for (const [key, poly] of Object.entries(LEG_GEOMETRY)) {
      expect(legs.has(key), key).toBe(true);
      const [from, to] = key.split('>');
      const line = decodePolyline(poly);
      expect(line.length, key).toBeGreaterThanOrEqual(2);
      const near = (p: LatLng, id: string) => haversineKm(p, [STOP_BY_ID[id].lat, STOP_BY_ID[id].lng]);
      expect(near(line[0], from), key).toBeLessThan(3);
      expect(near(line.at(-1)!, to), key).toBeLessThan(3);
    }
  });
});
