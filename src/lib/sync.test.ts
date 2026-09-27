import { describe, expect, it } from 'vitest';
import { defaultSettings, type TripSettings } from '../state/settings';
import { canonical, reconcile, withChecklist } from './sync';

const trip = (patch: Partial<TripSettings> = {}): TripSettings => ({ ...defaultSettings(), onboarded: true, ...patch });

describe('canonical', () => {
  it('ignores object key order', () => {
    expect(canonical({ b: 1, a: { d: [1, { y: 2, x: 1 }], c: 0 } })).toBe(canonical({ a: { c: 0, d: [1, { x: 1, y: 2 }] }, b: 1 }));
  });
});

describe('reconcile', () => {
  it('uploads when the cloud is empty', () => {
    const local = trip({ days: 12 });
    expect(reconcile(local, null, null)).toEqual({ kind: 'use', settings: local, upload: true });
  });

  it('does nothing when both sides match', () => {
    const local = trip({ days: 12 });
    expect(reconcile(local, JSON.parse(JSON.stringify(local)), null)).toEqual({ kind: 'use', settings: local, upload: false });
  });

  it('gives a fresh device the cloud plan, keeping its packing ticks', () => {
    const local = { ...defaultSettings(), checklist: { passport: true } };
    const r = reconcile(local, trip({ days: 14 }), null);
    expect(r).toMatchObject({ kind: 'use', upload: false, settings: { days: 14, onboarded: true, checklist: { passport: true } } });
  });

  it('keeps local when the cloud copy was never set up', () => {
    const local = trip({ days: 12 });
    expect(reconcile(local, { ...defaultSettings(), onboarded: false }, null)).toMatchObject({ kind: 'use', upload: true, settings: local });
  });

  it('takes the cloud plan when only the cloud changed', () => {
    const local = trip({ days: 12 });
    const r = reconcile(local, trip({ days: 16 }), canonical(local));
    expect(r).toMatchObject({ kind: 'use', upload: false, settings: { days: 16 } });
  });

  it('pushes local when only this device changed', () => {
    const remote = trip({ days: 12 });
    const local = trip({ days: 9 });
    expect(reconcile(local, remote, canonical(remote))).toEqual({ kind: 'use', settings: local, upload: true });
  });

  it('asks when both changed', () => {
    const r = reconcile(trip({ days: 9 }), trip({ days: 16 }), canonical(trip({ days: 12 })));
    expect(r).toMatchObject({ kind: 'ask', remote: { days: 16 } });
  });

  it('cleans up bad cloud data through migrate', () => {
    const r = reconcile(trip(), { ...trip(), days: 999, pace: 'warp' }, canonical(trip()));
    expect(r).toMatchObject({ kind: 'use', settings: { days: 30, pace: 'moderate' } });
  });
});

describe('withChecklist', () => {
  it('keeps ticks from both plans', () => {
    const merged = withChecklist(trip({ checklist: { a: true, b: false } }), trip({ checklist: { b: true, c: false } }));
    expect(merged.checklist).toEqual({ a: true, b: true });
  });
});
