import { describe, expect, it } from 'vitest';
import { LINKS } from '../data/links';
import { SECTIONS, SECTION_BY_ID } from '../data/sections';
import { STOPS } from '../data/stops';
import { defaultSettings } from '../state/settings';
import { changeDayEnd, chooseDayRoute, customiseSection, dayEndOptions, dayRouteOptions, removeSectionStop, sectionStops } from './editRoute';
import { customVariant, distanceKm, edgeBetween, expandStops, NETWORK_STOPS, presetStops, shortestPath } from './network';
import { makePlan } from './planner';
import { buildRoute } from './route';

describe('road network', () => {
  it('reaches every stop from Taipei', () => {
    for (const s of STOPS) expect(shortestPath('taipei', s.id), s.id).not.toBeNull();
    expect(NETWORK_STOPS.length).toBe(STOPS.length);
  });

  it('links join known stops', () => {
    const ids = new Set(STOPS.map((s) => s.id));
    for (const l of LINKS) {
      expect(ids.has(l.from), l.from).toBe(true);
      expect(ids.has(l.to), l.to).toBe(true);
    }
  });

  it('flips multi-road names when riding an edge backwards', () => {
    expect(edgeBetween('taipei', 'keelung')!.road).toBe('Tai 5 / Tai 2');
    expect(edgeBetween('keelung', 'taipei')!.road).toBe('Tai 2 / Tai 5');
  });

  it('a custom route through a preset\'s own stops is that preset', () => {
    for (const sec of SECTIONS) {
      for (const v of sec.variants) {
        const c = customVariant(sec, presetStops(v));
        expect(c.legs.map((l) => l.to), `${sec.id}/${v.id}`).toEqual(v.legs.map((l) => l.to));
        expect(c.legs.reduce((a, l) => a + l.km, 0)).toBeCloseTo(v.legs.reduce((a, l) => a + l.km, 0));
      }
    }
  });

  it('fills gaps between chosen stops with the shortest roads', () => {
    const sec = SECTION_BY_ID['chiayi-taichung'];
    expect(expandStops(sec, ['puli'])).toEqual(['chiayi', 'sunmoonlake', 'puli', 'taichung']);
    expect(distanceKm('taichung', 'puli')).toBe(64);
  });
});

describe('custom routes in the planner', () => {
  it('builds a closed loop in both directions with a custom section', () => {
    for (const direction of ['cw', 'ccw'] as const) {
      const r = buildRoute({ startHub: 'taipei', direction, variants: { 'chiayi-taichung': 'custom' }, customRoutes: { 'chiayi-taichung': ['puli'] } });
      expect(r.points[0]).toBe('taipei');
      expect(r.points[r.points.length - 1]).toBe('taipei');
      expect(r.points).toContain('puli');
      r.legs.forEach((l, i) => expect(l.from).toBe(r.points[i]));
    }
  });

  it('customising a section starts from the preset it used', () => {
    const s = customiseSection(defaultSettings(), 'chiayi-taichung');
    expect(s.variants['chiayi-taichung']).toBe('custom');
    expect(sectionStops(s, SECTION_BY_ID['chiayi-taichung'])).toEqual(['lukang', 'changhua']);
    const r = removeSectionStop(s, 'chiayi-taichung', 'changhua');
    expect(r.customRoutes['chiayi-taichung']).toEqual(['lukang']);
  });
});

describe('changeDayEnd', () => {
  // The screenshot trip: 8 riding days counter-clockwise from Taipei, day 2 is Hsinchu → Lukang.
  const base = { ...defaultSettings(), days: 8 };
  const plan = makePlan(base);
  const day = plan.days.find((d) => d.from === 'hsinchu' && d.to === 'lukang');

  it('turns Hsinchu → Lukang into Hsinchu → Puli', () => {
    expect(day).toBeDefined();
    const next = changeDayEnd(base, plan.route, { ...day!, sectionIds: day!.legs.map((l) => l.sectionId) }, 'puli');
    expect(next.pinned).toEqual(expect.arrayContaining(['hsinchu', 'puli']));
    expect(next.pinned).not.toContain('lukang');
    const after = makePlan(next);
    const d2 = after.days.find((d) => d.from === 'hsinchu');
    expect(d2?.to).toBe('puli');
    expect(after.route.points).not.toContain('lukang');
    // Taichung → Puli → Sun Moon Lake → Chiayi, no doubling back.
    const pts = after.route.points.slice(0, -1);
    expect(new Set(pts).size).toBe(pts.length);
    expect(after.days.length).toBe(base.days);
  });

  it('offers towns ahead or that fit today, not ones already behind you', () => {
    const ids = dayEndOptions(base, plan.route, { ...day!, sectionIds: day!.legs.map((l) => l.sectionId) }).map((o) => o.id);
    expect(ids).toContain('puli');
    expect(ids).toContain('sunmoonlake');
    expect(ids).toContain('changhua');
    expect(ids).not.toContain('kenting'); // days away
    expect(ids).not.toContain('keelung');
    expect(ids).not.toContain('tamsui');
    expect(ids).not.toContain('taipei');
  });

  it('just moves the pin when the new end is already on the route', () => {
    const next = changeDayEnd(base, plan.route, { ...day!, sectionIds: day!.legs.map((l) => l.sectionId) }, 'changhua');
    expect(next.variants).toEqual(base.variants);
    expect(next.pinned).toContain('changhua');
  });
});

describe('fast or scenic day routes', () => {
  // Hsinchu → Puli, anticlockwise from Taipei with Puli on a custom Chiayi–Taichung route (the rider's day 2).
  const base = { ...defaultSettings(), variants: { ...defaultSettings().variants, 'chiayi-taichung': 'custom' }, customRoutes: { 'chiayi-taichung': ['puli'] } };
  const day = { from: 'hsinchu', to: 'puli', via: ['taichung', 'puli'], sectionIds: ['taichung-hsinchu', 'chiayi-taichung'] };

  it('offers Tai 1 as fast and the Hakka Hills as scenic', () => {
    const opts = dayRouteOptions(base, day);
    expect(opts.map((o) => o.kind)).toEqual(['fast', 'scenic']);
    const [fast, scenic] = opts;
    expect(fast.current).toBe(true);
    expect(fast.path).toEqual(['hsinchu', 'taichung', 'puli']);
    expect(fast.km).toBe(176);
    expect(scenic.variants['taichung-hsinchu']).toBe('hakka-hills');
    expect(scenic.path).toEqual(['hsinchu', 'sanyi', 'taichung', 'puli']);
    expect(scenic.km).toBe(209);
    expect(scenic.hours).toBeGreaterThan(fast.hours);
    expect(scenic.scenic).toBeGreaterThan(fast.scenic);
  });

  it('keeps the day\'s end: presets that skip Puli are not offered', () => {
    for (const o of dayRouteOptions(base, day)) expect(o.variants['chiayi-taichung']).toBe('custom');
  });

  it('drops a scenic option that takes far longer than the fast one', () => {
    // Taichung → Chiayi: Sun Moon Lake (183 km) and Alishan are well over 1.6× the Tai 1 plains ride.
    const d = { from: 'taichung', to: 'chiayi', via: ['changhua', 'lukang', 'chiayi'], sectionIds: ['chiayi-taichung'] };
    expect(dayRouteOptions(defaultSettings(), d)).toEqual([]);
  });

  it('marks the route you ride now', () => {
    const s = { ...base, variants: { ...base.variants, 'taichung-hsinchu': 'hakka-hills' } };
    const opts = dayRouteOptions(s, day);
    expect(opts.find((o) => o.current)?.kind).toBe('scenic');
  });

  it('choosing one switches the section and pins both ends', () => {
    const scenic = dayRouteOptions(base, day)[1];
    const next = chooseDayRoute(base, day, scenic.variants);
    expect(next.variants['taichung-hsinchu']).toBe('hakka-hills');
    expect(next.pinned).toEqual(expect.arrayContaining(['hsinchu', 'puli']));
    const plan = makePlan(next);
    expect(plan.route.points).toContain('sanyi');
    const nights = plan.days.map((d) => d.overnight);
    expect(nights).toEqual(expect.arrayContaining(['hsinchu', 'puli']));
  });

  it('offers nothing when a day has only one way to go', () => {
    const d = { from: 'kaohsiung', to: 'tainan', via: ['tainan'], sectionIds: ['kaohsiung-tainan'] };
    expect(dayRouteOptions(defaultSettings(), d)).toEqual([]);
  });
});
