import { describe, expect, it } from 'vitest';
import { haversineKm } from '../lib/geo';
import { ATTRACTIONS } from './attractions';
import { HUBS, SECTIONS } from './sections';
import { STOPS, STOP_BY_ID } from './stops';

/** Sanity checks on the hand-entered data — catch typos in coordinates and distances. */

const at = (id: string): [number, number] => [STOP_BY_ID[id].lat, STOP_BY_ID[id].lng];

describe('stops', () => {
  it('have unique ids and sit on Taiwan', () => {
    expect(new Set(STOPS.map((s) => s.id)).size).toBe(STOPS.length);
    for (const s of STOPS) {
      expect(s.lat, s.id).toBeGreaterThan(21.8);
      expect(s.lat, s.id).toBeLessThan(25.4);
      expect(s.lng, s.id).toBeGreaterThan(119.9);
      expect(s.lng, s.id).toBeLessThan(122.1);
      expect(s.lodgingFactor, s.id).toBeGreaterThan(0.5);
      expect(s.lodgingFactor, s.id).toBeLessThan(2);
    }
  });

  it('every hub is somewhere you can sleep', () => {
    for (const h of HUBS) expect(STOP_BY_ID[h].overnight, h).toBeGreaterThan(0);
  });
});

describe('sections', () => {
  it('have unique variant ids and a unique stop list per variant', () => {
    for (const s of SECTIONS) {
      expect(new Set(s.variants.map((v) => v.id)).size, s.id).toBe(s.variants.length);
      for (const v of s.variants) {
        const nodes = [s.from, ...v.legs.map((l) => l.to)];
        expect(new Set(nodes).size, `${s.id}/${v.id}`).toBe(nodes.length);
      }
    }
  });

  it('legs are no shorter than the straight line and use plausible speeds', () => {
    for (const s of SECTIONS) {
      for (const v of s.variants) {
        v.legs.forEach((l, i) => {
          const from = i ? v.legs[i - 1].to : s.from;
          const name = `${s.id}/${v.id}: ${from}>${l.to}`;
          // 5 % slack for approximate town-centre coordinates.
          expect(l.km, name).toBeGreaterThanOrEqual(haversineKm(at(from), at(l.to)) * 0.95);
          expect(l.speed, name).toBeGreaterThanOrEqual(20);
          expect(l.speed, name).toBeLessThanOrEqual(60);
        });
      }
    }
  });

  it('road warnings with a checked date use yyyy-mm', () => {
    const ws = SECTIONS.flatMap((s) => s.variants.flatMap((v) => v.legs.flatMap((l) => l.warnings ?? [])));
    for (const w of ws) if (w.checked) expect(w.checked).toMatch(/^\d{4}-\d{2}(-\d{2})?$/);
  });
});

describe('attractions', () => {
  it('are near the stop they are planned from', () => {
    for (const a of ATTRACTIONS) {
      const km = haversineKm([a.lat, a.lng], at(a.stopId));
      expect(km, a.id).toBeLessThan(a.sideTrip ? 60 : 40);
    }
  });

  it('have sane durations and prices', () => {
    for (const a of ATTRACTIONS) {
      expect(a.hours, a.id).toBeGreaterThan(0);
      expect(a.hours, a.id).toBeLessThanOrEqual(a.sideTrip ? 48 : 10); // island side trips can be overnight
      expect(a.cost, a.id).toBeGreaterThanOrEqual(0);
    }
  });
});
