import { describe, expect, it } from 'vitest';
import { RIDE_OVERHEAD } from '../data/costs';
import { HUBS, SECTIONS } from '../data/sections';
import { buildRoute, orderedSections, variantFor, variantStops, type Route } from './route';

const defaults = Object.fromEntries(SECTIONS.map((s) => [s.id, s.defaultVariant]));

/** Every combination would be thousands of routes; one per variant covers every leg. */
const oneOfEachVariant = SECTIONS.flatMap((s) => s.variants.map((v) => ({ ...defaults, [s.id]: v.id })));

function expectConsistent(r: Route) {
  expect(r.legs.length).toBe(r.points.length - 1);
  r.legs.forEach((l, i) => {
    expect(l.from, `leg ${i}`).toBe(r.points[i]);
    expect(l.to, `leg ${i}`).toBe(r.points[i + 1]);
    expect(l.km).toBeGreaterThan(0);
    expect(l.hours).toBeGreaterThan(0);
  });
  expect(r.cumKm.length).toBe(r.points.length);
  expect(r.cumKm[0]).toBe(0);
  expect(r.totalKm).toBeCloseTo(r.legs.reduce((s, l) => s + l.km, 0));
  expect(r.totalHours).toBeCloseTo(r.legs.reduce((s, l) => s + l.hours, 0));
  for (let i = 1; i < r.cumKm.length; i++) expect(r.cumKm[i]).toBeGreaterThan(r.cumKm[i - 1]);
}

describe('orderedSections', () => {
  it.each(HUBS)('from %s visits every section once in both directions', (hub) => {
    for (const dir of ['cw', 'ccw'] as const) {
      const out = orderedSections(hub, dir);
      expect(new Set(out.map((o) => o.section.id)).size).toBe(SECTIONS.length);
      expect(out.every((o) => o.reversed === (dir === 'ccw'))).toBe(true);
      // Sections chain: each one starts where the previous ended.
      const start = (o: (typeof out)[number]) => (o.reversed ? o.section.to : o.section.from);
      const end = (o: (typeof out)[number]) => (o.reversed ? o.section.from : o.section.to);
      expect(start(out[0])).toBe(hub);
      out.forEach((o, i) => expect(start(out[(i + 1) % out.length])).toBe(end(o)));
    }
  });

  it('falls back to the first section for an unknown hub', () => {
    expect(orderedSections('atlantis', 'cw')[0].section.id).toBe(SECTIONS[0].id);
  });
});

describe('variantFor', () => {
  it('uses the chosen variant, else the default', () => {
    const s = SECTIONS.find((x) => x.variants.length > 1)!;
    const other = s.variants.find((v) => v.id !== s.defaultVariant)!;
    expect(variantFor(s, { [s.id]: other.id }).id).toBe(other.id);
    expect(variantFor(s, {}).id).toBe(s.defaultVariant);
    expect(variantFor(s, { [s.id]: 'does-not-exist' }).id).toBe(s.defaultVariant);
  });
});

describe('buildRoute', () => {
  it.each(HUBS)('is internally consistent starting at %s', (hub) => {
    for (const direction of ['cw', 'ccw'] as const) {
      const r = buildRoute({ startHub: hub, direction, variants: {} });
      expectConsistent(r);
      expect(r.points[0]).toBe(hub);
      expect(r.points.at(-1)).toBe(hub);
    }
  });

  it('counter-clockwise is the clockwise route reversed, for every variant', () => {
    for (const variants of oneOfEachVariant) {
      const cw = buildRoute({ startHub: 'taipei', direction: 'cw', variants });
      const ccw = buildRoute({ startHub: 'taipei', direction: 'ccw', variants });
      expectConsistent(cw);
      expectConsistent(ccw);
      expect(ccw.points).toEqual([...cw.points].reverse());
      const flipped = [...cw.legs].reverse().map((l) => ({ ...l, from: l.to, to: l.from }));
      expect(ccw.legs).toEqual(flipped);
    }
  });

  it('prices time as km / speed × overhead, scaled by the vehicle speed factor', () => {
    const sec = SECTIONS[0];
    const leg = sec.variants.find((v) => v.id === sec.defaultVariant)!.legs[0];
    const base = buildRoute({ startHub: sec.from, direction: 'cw', variants: {} });
    expect(base.legs[0].hours).toBeCloseTo((leg.km / leg.speed) * RIDE_OVERHEAD);
    const fast = buildRoute({ startHub: sec.from, direction: 'cw', variants: {}, speedFactor: 1.25 });
    expect(fast.totalKm).toBe(base.totalKm);
    expect(fast.totalHours).toBeCloseTo(base.totalHours / 1.25);
  });

  it('carries warnings and section ids onto legs', () => {
    const r = buildRoute({ startHub: 'taipei', direction: 'cw', variants: { 'yilan-hualien': 'suhua' } });
    const suhua = r.legs.filter((l) => l.sectionId === 'yilan-hualien');
    expect(suhua.length).toBeGreaterThan(0);
    expect(suhua.some((l) => l.warnings.some((w) => w.level === 'danger'))).toBe(true);
    expect(r.sections.find((s) => s.section.id === 'yilan-hualien')!.variant.id).toBe('suhua');
  });

  it('includes the new Hwy 23 and Pingxi variants', () => {
    const r = buildRoute({ startHub: 'taipei', direction: 'cw', variants: { 'hualien-taitung': 'rift-23', 'taipei-yilan': 'pingxi' } });
    expect(r.points).toEqual(expect.arrayContaining(['pingxi', 'fuli', 'donghe']));
    expect(r.legs.find((l) => l.from === 'fuli')!.road).toMatch(/Tai 23/);
  });
});

describe('variantStops', () => {
  it('lists hub to hub, reversed for counter-clockwise', () => {
    for (const s of SECTIONS) {
      for (const v of s.variants) {
        const cw = variantStops(s, v, false);
        expect(cw[0]).toBe(s.from);
        expect(cw.at(-1)).toBe(s.to);
        expect(variantStops(s, v, true)).toEqual([...cw].reverse());
      }
    }
  });
});
