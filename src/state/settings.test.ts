import { describe, expect, it } from 'vitest';
import { makeBudget } from '../lib/budget';
import { makePlan } from '../lib/planner';
import { SETTINGS_VERSION, defaultSettings, migrate } from './settings';

describe('migrate', () => {
  it('returns defaults for missing or non-object state', () => {
    for (const raw of [undefined, null, 42, 'x', [1, 2]]) {
      expect(migrate(raw)).toEqual(defaultSettings());
    }
  });

  it('keeps a valid saved state as it is', () => {
    const saved = {
      ...defaultSettings(),
      days: 14,
      startDate: '2026-11-07',
      startHub: 'kaohsiung',
      direction: 'cw' as const,
      pace: 'relaxed' as const,
      pinned: ['dulan'],
      restDays: { hualien: 2 },
      riders: 2,
      bikes: 1,
      stay: 'mid' as const,
      saved: ['yehliu'],
      currency: 'EUR',
      checklist: { passport: true },
      onboarded: true,
    };
    expect(migrate(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
  });

  it('clamps numbers into range', () => {
    expect(migrate({ days: 1 }).days).toBe(3);
    expect(migrate({ days: 12.6 }).days).toBe(13);
    expect(migrate({ days: 'lots' }).days).toBe(10);
    expect(migrate({ riders: 20 }).riders).toBe(8);
    expect(migrate({ riders: 4, bikes: 1 }).bikes).toBe(2); // at most two per bike
    expect(migrate({ riders: 2, bikes: 5 }).bikes).toBe(2);
  });

  it('replaces unknown enum values and ids with defaults', () => {
    const d = defaultSettings();
    const s = migrate({
      pace: 'turbo',
      direction: 'up',
      startHub: 'atlantis',
      vehicle: 'tank',
      stay: 'castle',
      food: 'air',
      season: 'monsoon',
      currency: 'DOGE',
      startDate: 'next week',
    });
    expect(s.pace).toBe(d.pace);
    expect(s.direction).toBe(d.direction);
    expect(s.startHub).toBe(d.startHub);
    expect(s.vehicle).toBe(d.vehicle);
    expect(s.stay).toBe(d.stay);
    expect(s.food).toBe(d.food);
    expect(s.season).toBe(d.season);
    expect(s.currency).toBe(d.currency);
    expect(s.startDate).toBe('');
  });

  it('cleans malformed collections', () => {
    const s = migrate({
      pinned: 'dulan',
      saved: ['yehliu', 3, null],
      restDays: { hualien: '2', taitung: -1, kenting: 99 },
      checklist: { a: true, b: 'yes' },
      variants: ['nope'],
    });
    expect(s.pinned).toEqual([]);
    expect(s.saved).toEqual(['yehliu']);
    expect(s.restDays).toEqual({ hualien: 2, kenting: 10 });
    expect(s.checklist).toEqual({ a: true });
    expect(s.variants).toEqual(defaultSettings().variants);
  });

  it('always stamps the current version', () => {
    expect(migrate({ version: 0 }).version).toBe(SETTINGS_VERSION);
  });

  it('whatever comes in, the planner and budget can run on the result', () => {
    const junk = [{ pace: 'turbo' }, { pinned: 'x', restDays: [1] }, { variants: null, startHub: 7 }, { days: -5, riders: 0 }];
    for (const raw of junk) {
      const s = migrate(raw);
      const plan = makePlan(s);
      expect(plan.days.length).toBe(s.days);
      expect(makeBudget(s, plan).total).toBeGreaterThan(0);
    }
  });
});
