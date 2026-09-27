import { describe, expect, it } from 'vitest';
import { SECTIONS } from '../data/sections';
import { defaultSettings, migrate, type TripSettings } from '../state/settings';
import { planToIcs } from './ics';
import { makePlan } from './planner';
import { decodeSettings, encodeSettings, shareCodeFromHash, shareUrl } from './share';

const settings = (over: Partial<TripSettings> = {}): TripSettings => ({ ...defaultSettings(), ...over });

describe('share links', () => {
  const alt = SECTIONS.find((s) => s.variants.length > 1)!;
  const custom = settings({
    days: 14,
    startDate: '2026-11-02',
    startHub: 'kaohsiung',
    direction: 'cw',
    pace: 'relaxed',
    variants: { ...defaultSettings().variants, [alt.id]: alt.variants.find((v) => v.id !== alt.defaultVariant)!.id },
    pinned: ['hualien'],
    restDays: { hualien: 1 },
    riders: 2,
    bikes: 1,
    stay: 'mid',
    currency: 'EUR',
    saved: ['taroko'],
    checklist: { helmet: true },
  });

  it('round-trips settings, except the private checklist', () => {
    const back = decodeSettings(encodeSettings(custom));
    expect(back).toEqual({ ...custom, checklist: {} });
  });

  it('encodes defaults as an empty diff (short links)', () => {
    expect(decodeSettings(encodeSettings(defaultSettings()))).toEqual(defaultSettings());
    expect(encodeSettings(defaultSettings()).length).toBeLessThan(5);
  });

  it('is URL-safe and survives a full URL round trip', () => {
    const url = shareUrl('https://example.com/huan-dao/?x=1#/days', custom);
    expect(url).toMatch(/^https:\/\/example\.com\/huan-dao\/\?x=1#\/plan\?s=[A-Za-z0-9_-]+$/);
    const code = shareCodeFromHash(new URL(url).hash)!;
    expect(decodeSettings(code)?.days).toBe(14);
  });

  it('rejects garbage without throwing', () => {
    expect(decodeSettings('%%%')).toBeUndefined();
    expect(decodeSettings(btoa('[1,2]'))).toBeUndefined();
    expect(shareCodeFromHash('#/days')).toBeUndefined();
  });

  it('sanitises hostile or malformed values via migrate', () => {
    const s = migrate({
      startHub: 'atlantis',
      pace: 'warp',
      vehicle: 'tank',
      pinned: 'hualien',
      saved: [1, 'taroko', 'taroko'],
      restDays: { hualien: 99, nowhere: 2 },
      variants: 5,
      startDate: '<script>',
      currency: 'XYZ',
      checklist: [],
    });
    const d = defaultSettings();
    expect(s.startHub).toBe(d.startHub);
    expect(s.pace).toBe(d.pace);
    expect(s.vehicle).toBe(d.vehicle);
    expect(s.pinned).toEqual([]);
    expect(s.saved).toEqual(['taroko']);
    expect(s.restDays).toEqual({ hualien: 10 });
    expect(s.variants).toEqual(d.variants);
    expect(s.startDate).toBe('');
    expect(s.currency).toBe(d.currency);
    expect(s.checklist).toEqual({});
    expect(() => makePlan(s)).not.toThrow();
  });
});

describe('ics export', () => {
  const s = settings({ startDate: '2026-11-02', days: 10 });
  const plan = makePlan(s);
  const ics = planToIcs(plan, s.startDate, new Date('2026-09-27T10:00:00Z'))!;

  it('needs a start date', () => {
    expect(planToIcs(plan, '', new Date())).toBeUndefined();
  });

  it('has one all-day event per trip day on consecutive dates', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(plan.days.length);
    expect(ics).toContain('DTSTART;VALUE=DATE:20261102');
    expect(ics).toContain('DTEND;VALUE=DATE:20261112');
    expect(ics).toContain('DTSTAMP:20260927T100000Z');
  });

  it('folds lines to 75 octets and escapes text', () => {
    const enc = new TextEncoder();
    for (const line of ics.split('\r\n')) expect(enc.encode(line).length).toBeLessThanOrEqual(75);
    const unfolded = ics.replace(/\r\n /g, '');
    const desc = unfolded.split('\r\n').find((l) => l.startsWith('DESCRIPTION:'))!;
    expect(desc).toContain('\\n');
    expect(desc).not.toMatch(/[^\\][,;]/);
  });
});
