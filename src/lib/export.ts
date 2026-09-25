import { STOP_BY_ID } from '../data/stops';
import { addDays } from './dates';
import { legKey, pathThrough } from './geo';
import type { Plan, PlanDay } from './planner';

/**
 * Plan exports as plain text files: an iCalendar (.ics) with one all-day event per day, and a
 * GPX with overnight waypoints plus one route per riding day. Pure — the UI does the download.
 */

const name = (id: string) => STOP_BY_ID[id]?.name ?? id;
const zh = (id: string) => STOP_BY_ID[id]?.zh ?? '';

export function dayTitle(d: PlanDay): string {
  return d.kind === 'rest' ? `${d.flex ? 'Flex' : 'Rest'} day in ${name(d.to)}` : `${name(d.from)} → ${name(d.to)}`;
}

function dayDetails(d: PlanDay): string[] {
  const lines: string[] = [];
  if (d.kind === 'ride') {
    lines.push(`${Math.round(d.km)} km, about ${d.hours.toFixed(1)} h riding`);
    lines.push(`Via: ${[d.from, ...d.via].map(name).join(' → ')}`);
    lines.push(`Roads: ${[...new Set(d.legs.map((l) => l.road))].join(' → ')}`);
    for (const w of d.warnings) lines.push(`${w.level === 'danger' ? '⚠ ' : ''}${w.text}`);
  }
  if (d.attractions.length) lines.push(`${d.kind === 'rest' ? 'Things to do' : 'Stops'}: ${d.attractions.map((a) => a.name).join(', ')}`);
  if (d.holiday) lines.push(`Public holiday: ${d.holiday.name} — book ahead, expect crowds`);
  lines.push(d.overnight ? `Sleep in ${name(d.overnight)} ${zh(d.overnight)}` : 'Last day — back at the start');
  return lines;
}

// ── iCalendar ─────────────────────────────────────────────────────────────

/** RFC 5545 text escaping. */
export function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Fold a content line to ≤ 75 octets (UTF-8), continuation lines start with a space. */
export function icsFold(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = '';
  let curBytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    const limit = out.length ? 74 : 75; // continuation lines lose one octet to the leading space
    if (curBytes + b > limit) {
      out.push(cur);
      cur = '';
      curBytes = 0;
    }
    cur += ch;
    curBytes += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}

const icsDate = (iso: string) => iso.replace(/-/g, '');

/** Calendar for the trip, or null without a start date. `now` is the DTSTAMP. */
export function toIcs(plan: Plan, title: string, now: Date): string | null {
  if (!plan.days[0]?.date) return null;
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const start = plan.days[0].date;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Huan Dao Planner//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${icsEscape(title)}`];
  for (const d of plan.days) {
    if (!d.date) continue;
    const summary = `Day ${d.day}: ${dayTitle(d)}${d.kind === 'ride' ? ` (${Math.round(d.km)} km)` : ''}`;
    const where = d.overnight ?? d.to;
    lines.push(
      'BEGIN:VEVENT',
      `UID:huandao-${icsDate(start)}-${plan.route.points[0]}-day${d.day}@huandao.planner`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(d.date)}`,
      `DTEND;VALUE=DATE:${icsDate(addDays(d.date, 1))}`,
      `SUMMARY:${icsEscape(summary)}`,
      `LOCATION:${icsEscape(`${name(where)} ${zh(where)}, Taiwan`)}`,
      `DESCRIPTION:${icsEscape(dayDetails(d).join('\n'))}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(icsFold).join('\r\n') + '\r\n';
}

// ── GPX ───────────────────────────────────────────────────────────────────

export function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

const pt = (tag: string, lat: number, lng: number, inner = '') => `<${tag} lat="${lat.toFixed(6)}" lon="${lng.toFixed(6)}">${inner}</${tag}>`;

/**
 * GPX 1.1: a waypoint per overnight stop and one <rte> per riding day through its stops (apps
 * like OsmAnd or Organic Maps route between them). Days whose every leg has road-snapped
 * geometry also get a <trk> with the actual line.
 */
export function toGpx(plan: Plan, title: string, legs: Record<string, string> = {}): string {
  const out = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="Huan Dao Planner" xmlns="http://www.topografix.com/GPX/1/1">',
    `<metadata><name>${xmlEscape(title)}</name></metadata>`,
  ];
  const nights = new Map<string, number[]>();
  for (const d of plan.days) if (d.overnight) nights.set(d.overnight, [...(nights.get(d.overnight) ?? []), d.day]);
  const start = STOP_BY_ID[plan.route.points[0]];
  if (start) out.push(pt('wpt', start.lat, start.lng, `<name>${xmlEscape(`Start & finish: ${start.name} ${start.zh}`)}</name><sym>Flag</sym>`));
  nights.forEach((days, id) => {
    const s = STOP_BY_ID[id];
    if (!s) return;
    const label = `${days.length > 1 ? 'Nights' : 'Night'} ${days.join(', ')}: ${s.name} ${s.zh}`;
    out.push(pt('wpt', s.lat, s.lng, `<name>${xmlEscape(label)}</name><sym>Lodging</sym>`));
  });

  const rides = plan.days.filter((d) => d.kind === 'ride');
  for (const d of rides) {
    const ids = [d.from, ...d.via];
    const pts = ids.map((id) => STOP_BY_ID[id]).filter(Boolean);
    out.push(`<rte><name>${xmlEscape(`Day ${d.day}: ${dayTitle(d)}`)}</name>`);
    pts.forEach((s) => out.push(pt('rtept', s.lat, s.lng, `<name>${xmlEscape(s.name)}</name>`)));
    out.push('</rte>');
  }
  for (const d of rides) {
    const ids = [d.from, ...d.via];
    const snapped = ids.slice(1).every((to, i) => legs[legKey(ids[i], to)] || legs[legKey(to, ids[i])]);
    if (!snapped) continue;
    out.push(`<trk><name>${xmlEscape(`Day ${d.day}: ${dayTitle(d)}`)}</name><trkseg>`);
    pathThrough(ids, STOP_BY_ID, legs).forEach(([lat, lng]) => out.push(pt('trkpt', lat, lng)));
    out.push('</trkseg></trk>');
  }
  out.push('</gpx>');
  return out.join('\n') + '\n';
}

/** "huandao-2026-10-30-10d" */
export function exportFileName(plan: Plan, ext: string): string {
  const date = plan.days[0]?.date;
  return `huandao-${date ? `${date}-` : ''}${plan.days.length}d.${ext}`;
}
