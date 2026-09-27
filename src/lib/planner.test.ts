import { describe, expect, it } from 'vitest';
import { SECTIONS } from '../data/sections';
import { STOP_BY_ID } from '../data/stops';
import { ATTRACTIONS } from '../data/attractions';
import { defaultSettings, migrate, type TripSettings } from '../state/settings';
import { makeBudget } from './budget';
import { makePlan } from './planner';
import { buildRoute } from './route';

const settings = (over: Partial<TripSettings> = {}): TripSettings => ({ ...defaultSettings(), ...over });

describe('data integrity', () => {
  it('every leg and section references a known stop', () => {
    for (const s of SECTIONS) {
      expect(STOP_BY_ID[s.from], s.from).toBeDefined();
      expect(STOP_BY_ID[s.to], s.to).toBeDefined();
      expect(s.variants.some((v) => v.id === s.defaultVariant)).toBe(true);
      for (const v of s.variants) {
        expect(v.legs.at(-1)!.to, `${s.id}/${v.id} ends at hub`).toBe(s.to);
        for (const l of v.legs) expect(STOP_BY_ID[l.to], l.to).toBeDefined();
      }
    }
  });

  it('sections form a closed loop', () => {
    SECTIONS.forEach((s, i) => expect(SECTIONS[(i + 1) % SECTIONS.length].from).toBe(s.to));
  });

  it('attractions reference known stops and have unique ids', () => {
    const ids = new Set<string>();
    for (const a of ATTRACTIONS) {
      expect(STOP_BY_ID[a.stopId], a.id).toBeDefined();
      expect(ids.has(a.id), a.id).toBe(false);
      ids.add(a.id);
    }
  });
});

describe('route', () => {
  it('loops back to the start in both directions with the same distance', () => {
    const cw = buildRoute({ startHub: 'taipei', direction: 'cw', variants: {} });
    const ccw = buildRoute({ startHub: 'taipei', direction: 'ccw', variants: {} });
    expect(cw.points[0]).toBe('taipei');
    expect(cw.points.at(-1)).toBe('taipei');
    expect(ccw.points[0]).toBe('taipei');
    expect(ccw.points.at(-1)).toBe('taipei');
    expect(cw.totalKm).toBe(ccw.totalKm);
    expect(cw.totalKm).toBeGreaterThan(900);
    expect(cw.totalKm).toBeLessThan(1300);
    // Counter-clockwise from Taipei goes west first.
    expect(ccw.points[1]).toBe('hsinchu');
    expect(cw.points[1]).toBe('keelung');
  });

  it('can start at any hub', () => {
    const r = buildRoute({ startHub: 'kaohsiung', direction: 'ccw', variants: {} });
    expect(r.points[0]).toBe('kaohsiung');
    expect(r.points.at(-1)).toBe('kaohsiung');
    expect(r.points[1]).toBe('donggang'); // ccw from Kaohsiung heads south to Kenting
  });

  it('respects chosen variants', () => {
    const r = buildRoute({ startHub: 'taipei', direction: 'cw', variants: { 'hualien-taitung': 'rift-9' } });
    expect(r.points).toContain('chishang');
    expect(r.points).not.toContain('chenggong');
  });
});

describe('planner', () => {
  it('uses exactly the requested number of days', () => {
    for (const days of [5, 7, 10, 14, 21]) {
      const plan = makePlan(settings({ days }));
      expect(plan.days.length, `days=${days}`).toBe(days);
      expect(plan.days.at(-1)!.to).toBe('taipei');
    }
  });

  it('never sleeps in a pass-through-only stop', () => {
    const plan = makePlan(settings({ days: 12 }));
    for (const d of plan.days) if (d.overnight) expect(STOP_BY_ID[d.overnight].overnight).toBeGreaterThan(0);
  });

  it('honours pinned overnight stops and rest days', () => {
    const plan = makePlan(settings({ days: 10, pinned: ['dulan'], restDays: { hualien: 1 } }));
    expect(plan.days.some((d) => d.kind === 'ride' && d.overnight === 'dulan')).toBe(true);
    expect(plan.days.some((d) => d.kind === 'rest' && !d.flex && d.overnight === 'hualien')).toBe(true);
    expect(plan.days.length).toBe(10);
  });

  it('adds flex days when there are more days than the pace needs', () => {
    const plan = makePlan(settings({ days: 25, pace: 'fast' }));
    expect(plan.flexDays).toBeGreaterThan(0);
    expect(plan.days.length).toBe(25);
  });

  it('warns when the trip is too short', () => {
    const plan = makePlan(settings({ days: 3, pace: 'relaxed' }));
    expect(plan.notes.join(' ')).toMatch(/tight/);
  });

  it('dates days from the start date', () => {
    const plan = makePlan(settings({ days: 7, startDate: '2026-10-30' }));
    expect(plan.days[0].date).toBe('2026-10-30');
    expect(plan.days[2].date).toBe('2026-11-01');
  });
});

describe('budget', () => {
  it('produces positive totals that scale with riders', () => {
    const s1 = settings({ days: 10, riders: 1, bikes: 1 });
    const s2 = settings({ days: 10, riders: 2, bikes: 1 });
    const b1 = makeBudget(s1, makePlan(s1));
    const b2 = makeBudget(s2, makePlan(s2));
    expect(b1.total).toBeGreaterThan(10000);
    expect(b2.total).toBeGreaterThan(b1.total);
    // Sharing a bike and a room makes it cheaper per person.
    expect(b2.perPerson).toBeLessThan(b1.perPerson);
  });

  it('own bike has no rental cost', () => {
    const s = settings({ vehicle: 'own125' });
    const b = makeBudget(s, makePlan(s));
    expect(b.lines.find((l) => l.id === 'rental')!.total).toBe(0);
  });
});

describe('settings migration', () => {
  it('fills defaults and fixes invalid values', () => {
    const s = migrate({ days: 99, riders: 3, bikes: 0, variants: { 'taipei-yilan': 'nope' } });
    expect(s.days).toBe(30);
    expect(s.bikes).toBe(2);
    expect(s.variants['taipei-yilan']).toBe('ne-coast');
  });

  it('skips onboarding for state saved before it existed, but not for new users', () => {
    expect(migrate({ days: 12 }).onboarded).toBe(true);
    expect(migrate({ days: 12, onboarded: false }).onboarded).toBe(false);
    expect(defaultSettings().onboarded).toBe(false);
    expect(migrate(undefined).onboarded).toBe(false);
  });
});
