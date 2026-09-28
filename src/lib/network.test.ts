import { describe, expect, it } from 'vitest';
import { LINKS } from '../data/links';
import { SECTIONS, SECTION_BY_ID } from '../data/sections';
import { STOPS } from '../data/stops';
import { defaultSettings } from '../state/settings';
import { changeDayEnd, chooseDayRoute, customiseSection, dayEndOptions, dayRouteOptions, setBypass, removeSectionStop, sectionStops } from './editRoute';
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

describe('changeDayEnd further along the route', () => {
  // A rider's 8-day trip: day 3 is Puli → Alishan, day 4 Alishan → Tainan. They want Puli → Tainan in one day.
  const d = defaultSettings();
  const base = {
    ...d,
    days: 8,
    variants: { ...d.variants, 'chiayi-taichung': 'custom' },
    customRoutes: { 'chiayi-taichung': ['alishan', 'puli'] },
    pinned: ['hsinchu', 'puli', 'alishan', 'kenting', 'chenggong', 'suao'],
  };
  const plan = makePlan(base);
  const day = plan.days.find((x) => x.from === 'puli')!;

  it('rides through instead of stopping at the old end again', () => {
    expect(day.to).toBe('alishan');
    const next = changeDayEnd(base, plan.route, { ...day, sectionIds: day.legs.map((l) => l.sectionId) }, 'tainan');
    const after = makePlan(next);
    expect(after.days.find((x) => x.from === 'puli')?.to).toBe('tainan');
    expect(after.route.points).not.toContain('alishan'); // a detour once you're not sleeping there
    expect(next.passThrough).toContain('chiayi');
    expect(after.days.length).toBe(base.days);
  });

  it('lets you sleep at a pass-through town again by pinning it', () => {
    const next = changeDayEnd(base, plan.route, { ...day, sectionIds: day.legs.map((l) => l.sectionId) }, 'tainan');
    const again = makePlan({ ...next, pinned: [...next.pinned, 'chiayi'] });
    expect(again.days.some((x) => x.to === 'chiayi')).toBe(true);
  });
});

describe('fast or scenic day routes', () => {
  // Hsinchu → Puli, anticlockwise from Taipei with Puli on a custom Chiayi–Taichung route (the rider's day 2).
  const base = { ...defaultSettings(), variants: { ...defaultSettings().variants, 'chiayi-taichung': 'custom' }, customRoutes: { 'chiayi-taichung': ['puli'] } };
  const day = { from: 'hsinchu', to: 'puli', via: ['taichung', 'puli'], sectionIds: ['taichung-hsinchu', 'chiayi-taichung'] };
  const oneSection = (id: string) => {
    const sec = SECTION_BY_ID[id];
    return { from: sec.to, to: sec.from, via: [sec.from], sectionIds: [id] };
  };

  it('offers Tai 1 as fast and Tai 3 round Taichung as scenic', () => {
    const [fast, scenic, ...rest] = dayRouteOptions(base, day);
    expect(fast).toMatchObject({ kind: 'fast', current: true, km: 176, path: ['hsinchu', 'taichung', 'puli'] });
    expect(scenic).toMatchObject({ kind: 'scenic', path: ['hsinchu', 'beipu', 'dahu', 'dongshi', 'puli'], bypasses: { 'tai21-guoxing': true } });
    expect(scenic.variants['taichung-hsinchu']).toBe('tai3');
    // Sun Moon Lake + bypass gives the same day, but your custom route through Puli is kept.
    expect(scenic.variants['chiayi-taichung']).toBe('custom');
    expect(scenic.name).toBe('Tai 3 inland (Dongshi, Dahu, Beipu) + Tai 21 via Guoxing (skip Taichung)');
    expect(scenic.scenic).toBeGreaterThan(fast.scenic);
    // The rest, quickest first: Tai 3 through Taichung, then the Hakka Hills via Sanyi.
    expect(rest.map((o) => o.kind)).toEqual(['other', 'other']);
    expect(rest.map((o) => o.variants['taichung-hsinchu'])).toEqual(['tai3', 'hakka-hills']);
    expect(rest[0].hours).toBeLessThanOrEqual(rest[1].hours);
  });

  it('keeps the day\'s end: every option still ends in Puli', () => {
    for (const o of dayRouteOptions(base, day)) expect(o.path.at(-1)).toBe('puli');
  });

  it('offers a long scenic route when it fits a day at your pace, and lists the rest', () => {
    // Taichung → Chiayi: Sun Moon Lake (~5.7 h) fits a balanced day; Alishan (~9 h) doesn't.
    const opts = dayRouteOptions(defaultSettings(), oneSection('chiayi-taichung'));
    expect(opts.map((o) => [o.kind, o.variants['chiayi-taichung'], o.long])).toEqual([
      ['fast', 'plains', false],
      ['scenic', 'sun-moon-lake', false],
      ['other', 'alishan', true],
    ]);
    // …and not at a relaxed pace (max 5 h a day).
    expect(dayRouteOptions({ ...defaultSettings(), pace: 'relaxed' }, oneSection('chiayi-taichung'))[1].kind).toBe('other');
  });

  it('when the fastest is also the most scenic, the others are still listed', () => {
    const opts = dayRouteOptions(defaultSettings(), oneSection('hualien-taitung'));
    expect(opts[0]).toMatchObject({ kind: 'fast', current: true });
    expect(opts.slice(1).every((o) => o.kind === 'other')).toBe(true);
    expect(opts.map((o) => o.variants['hualien-taitung']).sort()).toEqual(['coast-11', 'rift-23', 'rift-9', 'valley-coast']);
  });

  it('marks the route you ride now', () => {
    const s = { ...base, variants: { ...base.variants, 'taichung-hsinchu': 'hakka-hills' } };
    const opts = dayRouteOptions(s, day);
    expect(opts.filter((o) => o.current).map((o) => o.variants['taichung-hsinchu'])).toEqual(['hakka-hills']);
  });

  it('choosing one switches the section, turns the bypass on and pins both ends', () => {
    const scenic = dayRouteOptions(base, day)[1];
    const next = chooseDayRoute(base, day, scenic);
    expect(next.variants['taichung-hsinchu']).toBe('tai3');
    expect(next.variants['chiayi-taichung']).toBe('custom');
    expect(next.bypasses).toEqual(['tai21-guoxing']);
    expect(next.pinned).toEqual(expect.arrayContaining(['hsinchu', 'puli']));
    const plan = makePlan(next);
    expect(plan.route.points).not.toContain('taichung');
    expect(plan.route.points).toEqual(expect.arrayContaining(['dongshi', 'puli']));
    // …and choosing the fast one again turns it off.
    const back = chooseDayRoute(next, day, dayRouteOptions(next, { ...day, via: ['beipu', 'dahu', 'dongshi', 'puli'], bypasses: ['tai21-guoxing'] })[0]);
    expect(back.bypasses).toEqual([]);
    expect(back.variants['taichung-hsinchu']).toBe('tai1');
  });

  it('a longer route keeps the day whole instead of splitting it at a town it passes', () => {
    // e.g. Taichung → Chiayi over Alishan used to end the day at Alishan.
    const s = defaultSettings();
    for (const d of makePlan(s).days) {
      if (d.kind !== 'ride') continue;
      const ref = { from: d.from, to: d.to, via: d.via, sectionIds: [...new Set(d.legs.map((l) => l.sectionId))] };
      for (const o of dayRouteOptions(s, ref)) {
        const after = makePlan(chooseDayRoute(s, ref, o)).days.find((x) => x.kind === 'ride' && x.from === d.from);
        expect(after?.to, `${d.from} → ${d.to} via ${o.name}`).toBe(d.to);
      }
    }
  });

  it('offers nothing when a day has only one way to go', () => {
    expect(dayRouteOptions(defaultSettings(), oneSection('kenting-kaohsiung'))).toEqual([]);
  });
});

describe('bypasses', () => {
  const sml = { 'chiayi-taichung': 'sun-moon-lake', 'taichung-hsinchu': 'tai3' };

  it('ride round the hub in both directions when both sides reach them', () => {
    for (const direction of ['cw', 'ccw'] as const) {
      const r = buildRoute({ startHub: 'taipei', direction, variants: sml, bypasses: ['tai21-guoxing'] });
      expect(r.bypasses).toEqual(['tai21-guoxing']);
      expect(r.points).not.toContain('taichung');
      const cw = direction === 'cw' ? r.points : [...r.points].reverse();
      const i = cw.indexOf('sunmoonlake');
      expect(cw.slice(i, i + 3)).toEqual(['sunmoonlake', 'puli', 'dongshi']);
      r.legs.forEach((l, k) => expect(l.from).toBe(r.points[k]));
      const leg = r.legs.find((l) => l.from === (direction === 'cw' ? 'puli' : 'dongshi'))!;
      expect(leg.road).toBe(direction === 'cw' ? 'Tai 14 / Tai 21' : 'Tai 21 / Tai 14');
      expect(leg.bypass).toBe('tai21-guoxing');
      expect(r.totalKm).toBeCloseTo(r.legs.reduce((a, l) => a + l.km, 0));
    }
  });

  it('do nothing where a side doesn\'t reach them, or when the trip starts at the hub', () => {
    expect(buildRoute({ startHub: 'taipei', direction: 'ccw', variants: {}, bypasses: ['tai21-guoxing'] }).points).toContain('taichung');
    expect(buildRoute({ startHub: 'taichung', direction: 'ccw', variants: sml, bypasses: ['tai21-guoxing'] }).bypasses).toEqual([]);
  });

  it('from Puli on a custom route, only the Puli → Dongshi part is ridden', () => {
    const r = buildRoute({
      startHub: 'taipei', direction: 'ccw', variants: { 'chiayi-taichung': 'custom', 'taichung-hsinchu': 'tai3' },
      customRoutes: { 'chiayi-taichung': ['puli'] }, bypasses: ['tai21-guoxing'],
    });
    const i = r.points.indexOf('dongshi');
    expect(r.points.slice(i, i + 3)).toEqual(['dongshi', 'puli', 'sunmoonlake']);
  });

  it('switching one on sets up the sections either side', () => {
    const s = setBypass(defaultSettings(), 'tai21-guoxing', true);
    expect(s.bypasses).toEqual(['tai21-guoxing']);
    expect(s.variants['taichung-hsinchu']).toBe('tai3');
    expect(s.variants['chiayi-taichung']).toBe('sun-moon-lake');
    expect(makePlan(s).route.bypasses).toEqual(['tai21-guoxing']);
    // A custom route through Puli already reaches it and is kept.
    const custom = { ...defaultSettings(), variants: { ...defaultSettings().variants, 'chiayi-taichung': 'custom' }, customRoutes: { 'chiayi-taichung': ['puli'] } };
    expect(setBypass(custom, 'tai21-guoxing', true).variants['chiayi-taichung']).toBe('custom');
    expect(setBypass(s, 'tai21-guoxing', false).bypasses).toEqual([]);
  });
});
