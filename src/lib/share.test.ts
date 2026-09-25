import { describe, expect, it } from 'vitest';
import { defaultSettings, type TripSettings } from '../state/settings';
import { decodeShare, encodeShare, sameTrip, shareCodeFromHash, shareUrl } from './share';

const trip = (over: Partial<TripSettings> = {}): TripSettings => ({ ...defaultSettings(), onboarded: true, ...over });

describe('share links', () => {
  const custom = trip({
    days: 14,
    startDate: '2026-11-07',
    startHub: 'kaohsiung',
    direction: 'cw',
    pace: 'relaxed',
    variants: { ...defaultSettings().variants, 'hualien-taitung': 'rift-23', 'taipei-yilan': 'pingxi' },
    pinned: ['dulan'],
    restDays: { hualien: 1 },
    riders: 2,
    bikes: 1,
    stay: 'mid',
    food: 'foodie',
    saved: ['yehliu', 'pingxi-lanterns'],
    currency: 'EUR',
    checklist: { passport: true },
  });

  it('round-trips every trip setting', () => {
    const back = decodeShare(encodeShare(custom))!;
    expect(sameTrip(back, custom)).toBe(true);
    const { checklist: _c, ...rest } = custom;
    expect(back).toMatchObject(rest);
  });

  it('keeps personal state out of the link and uses the receiver’s', () => {
    const code = encodeShare(custom);
    const json = atob(code.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((code.length + 3) % 4));
    expect(json).not.toMatch(/checklist|onboarded|passport/);
    const mine = trip({ checklist: { sunscreen: true } });
    const back = decodeShare(code, mine)!;
    expect(back.checklist).toEqual({ sunscreen: true });
    expect(back.onboarded).toBe(true);
  });

  it('is short: only what differs from the defaults', () => {
    expect(encodeShare(trip()).length).toBeLessThan(20);
    expect(encodeShare(custom).length).toBeLessThan(500);
  });

  it('is URL-safe and survives non-ASCII', () => {
    const code = encodeShare(trip({ saved: ['台北-測試'] }));
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeShare(code)!.saved).toEqual(['台北-測試']);
  });

  it('rejects garbage and sanitises hostile values', () => {
    expect(decodeShare('not base64 !!')).toBeNull();
    expect(decodeShare(btoa('[1,2]'))).toBeNull();
    expect(decodeShare(btoa('"hi"'))).toBeNull();
    const hostile = btoa(JSON.stringify({ pace: 'turbo', days: 999, riders: -3, pinned: 'x', onboarded: false, checklist: { a: true } }));
    const s = decodeShare(hostile)!;
    expect(s.pace).toBe('moderate');
    expect(s.days).toBe(30);
    expect(s.riders).toBe(1);
    expect(s.pinned).toEqual([]);
    expect(s.onboarded).toBe(true);
    expect(s.checklist).toEqual({});
  });

  it('reads the code from the hash and builds links on any base URL', () => {
    expect(shareCodeFromHash('#/plan?s=abc_-1')).toBe('abc_-1');
    expect(shareCodeFromHash('#/plan')).toBeUndefined();
    expect(shareCodeFromHash('')).toBeUndefined();
    const url = shareUrl(custom, 'https://example.org/huan-dao/index.html#/days/3');
    expect(url.startsWith('https://example.org/huan-dao/index.html#/plan?s=')).toBe(true);
    expect(sameTrip(decodeShare(shareCodeFromHash(url.slice(url.indexOf('#')))!)!, custom)).toBe(true);
  });
});
