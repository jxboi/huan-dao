import { describe, expect, it } from 'vitest';
import { STOP_BY_ID } from '../data/stops';
import { defaultSettings, type TripSettings } from '../state/settings';
import { exportFileName, icsEscape, icsFold, toGpx, toIcs, xmlEscape } from './export';
import { encodePolyline, legKey } from './geo';
import { makePlan } from './planner';

const plan = (over: Partial<TripSettings> = {}) => makePlan({ ...defaultSettings(), ...over });
const NOW = new Date('2026-09-25T08:30:00Z');
const bytes = (s: string) => new TextEncoder().encode(s).length;

describe('iCalendar', () => {
  it('needs a start date', () => {
    expect(toIcs(plan({ startDate: '' }), 'Trip', NOW)).toBeNull();
  });

  it('has one all-day event per day with consecutive dates', () => {
    const p = plan({ days: 10, startDate: '2026-12-30', restDays: { hualien: 1 } });
    const ics = toIcs(p, 'Huan Dao, 10 days', NOW)!;
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)!.length).toBe(10);
    expect(ics).toContain('DTSTART;VALUE=DATE:20261230');
    expect(ics).toContain('DTEND;VALUE=DATE:20261231');
    // Crosses the new year: the last day is 2027-01-08, ending the 9th.
    expect(ics).toContain('DTSTART;VALUE=DATE:20270108');
    expect(ics).toContain('DTEND;VALUE=DATE:20270109');
    expect(ics).toContain('DTSTAMP:20260925T083000Z');
    expect(ics).toContain('X-WR-CALNAME:Huan Dao\\, 10 days');
    const uids = ics.match(/^UID:.*$/gm)!;
    expect(new Set(uids).size).toBe(10);
    expect(ics).toMatch(/SUMMARY:Day 1: Taipei → \w+ \(\d+ km\)/);
  });

  it('uses CRLF and folds long lines to 75 octets', () => {
    const ics = toIcs(plan({ days: 7, startDate: '2026-11-02' }), 'Trip', NOW)!;
    const lines = ics.split('\r\n');
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    for (const l of lines) expect(bytes(l)).toBeLessThanOrEqual(75);
    expect(lines.some((l) => l.startsWith(' '))).toBe(true);
  });

  it('folds by UTF-8 octets without splitting characters, and unfolds back', () => {
    const line = `DESCRIPTION:${'台北→花蓮 '.repeat(20)}`;
    const folded = icsFold(line);
    for (const l of folded.split('\r\n')) expect(bytes(l)).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, '')).toBe(line);
    expect(icsFold('SHORT')).toBe('SHORT');
  });

  it('escapes text', () => {
    expect(icsEscape('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
  });
});

describe('GPX', () => {
  it('has a waypoint per overnight town and a route per riding day', () => {
    const p = plan({ days: 10 });
    const gpx = toGpx(p, 'Trip & more');
    expect(gpx.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(gpx).toContain('<name>Trip &amp; more</name>');
    const overnights = new Set(p.days.map((d) => d.overnight).filter(Boolean));
    expect(gpx.match(/<wpt /g)!.length).toBe(overnights.size + 1); // + start/finish
    expect(gpx.match(/<rte>/g)!.length).toBe(p.ridingDays);
    const routePoints = p.days.filter((d) => d.kind === 'ride').reduce((n, d) => n + d.via.length + 1, 0);
    expect(gpx.match(/<rtept /g)!.length).toBe(routePoints);
    expect(gpx).not.toContain('<trk>');
    // Balanced tags.
    for (const tag of ['gpx', 'rte', 'wpt', 'rtept', 'metadata']) {
      expect(gpx.match(new RegExp(`<${tag}[ >]`, 'g'))?.length ?? 0, tag).toBe(gpx.match(new RegExp(`</${tag}>`, 'g'))?.length ?? 0);
    }
  });

  it('adds tracks only for days whose legs all have road geometry', () => {
    const p = plan({ days: 10 });
    const day = p.days.find((d) => d.kind === 'ride')!;
    const ids = [day.from, ...day.via];
    const legs: Record<string, string> = {};
    ids.slice(1).forEach((to, i) => {
      const [a, b] = [STOP_BY_ID[ids[i]], STOP_BY_ID[to]];
      // Stored clockwise: this plan is counter-clockwise, so store the reverse.
      legs[legKey(to, ids[i])] = encodePolyline([
        [b.lat, b.lng],
        [(a.lat + b.lat) / 2 + 0.01, (a.lng + b.lng) / 2],
        [a.lat, a.lng],
      ]);
    });
    const gpx = toGpx(p, 'Trip', legs);
    expect(gpx.match(/<trk>/g)!.length).toBe(1);
    expect(gpx.match(/<trkpt /g)!.length).toBe(1 + (ids.length - 1) * 2);
  });

  it('escapes XML', () => {
    expect(xmlEscape(`<a href="x">Tom & 'Jerry'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; &apos;Jerry&apos;&lt;/a&gt;');
  });
});

describe('file names', () => {
  it('include the start date when known', () => {
    expect(exportFileName(plan({ days: 9, startDate: '2026-11-02' }), 'ics')).toBe('huandao-2026-11-02-9d.ics');
    expect(exportFileName(plan({ days: 9 }), 'gpx')).toBe('huandao-9d.gpx');
  });
});
