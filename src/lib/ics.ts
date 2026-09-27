import { STOP_BY_ID } from '../data/stops';
import { dateFor, type Plan } from './planner';

/**
 * iCalendar export: one all-day event per trip day (RFC 5545).
 * Needs a start date; returns undefined without one.
 * `now` is passed in (for DTSTAMP) so the function stays pure and testable.
 */
export function planToIcs(plan: Plan, startDate: string, now: Date): string | undefined {
  if (!dateFor(startDate, 0)) return undefined;
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const name = (id: string) => {
    const s = STOP_BY_ID[id];
    return s ? `${s.name} ${s.zh}` : id;
  };

  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Huan Dao Planner//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Huan Dao 環島'];
  for (const d of plan.days) {
    const day = dateFor(startDate, d.day - 1)!;
    const next = dateFor(startDate, d.day)!;
    const summary =
      d.kind === 'rest'
        ? `Huan Dao day ${d.day}: ${d.flex ? 'flex' : 'rest'} day in ${STOP_BY_ID[d.to]?.name ?? d.to}`
        : `Huan Dao day ${d.day}: ${STOP_BY_ID[d.from]?.name ?? d.from} → ${STOP_BY_ID[d.to]?.name ?? d.to}`;
    const desc: string[] = [];
    if (d.kind === 'ride') {
      desc.push(`${Math.round(d.km)} km · ~${d.hours.toFixed(1)} h riding`);
      desc.push(`Route: ${[d.from, ...d.via].map(name).join(' → ')}`);
      desc.push(`Roads: ${[...new Set(d.legs.map((l) => l.road))].join(' → ')}`);
    }
    for (const w of d.warnings) desc.push(`⚠ ${w.text}`);
    if (d.attractions.length) desc.push(`See: ${d.attractions.map((a) => a.name).join(', ')}`);
    if (d.overnight) desc.push(`Sleep: ${name(d.overnight)}`);

    lines.push(
      'BEGIN:VEVENT',
      `UID:huandao-${startDate}-day${d.day}@huandao.planner`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${day.replace(/-/g, '')}`,
      `DTEND;VALUE=DATE:${next.replace(/-/g, '')}`,
      `SUMMARY:${escapeText(summary)}`,
      `DESCRIPTION:${escapeText(desc.join('\n'))}`,
      `LOCATION:${escapeText(name(d.to))}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.flatMap(fold).join('\r\n') + '\r\n';
}

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Folds a content line to ≤ 75 octets per line, never splitting a UTF-8 character. */
function fold(line: string): string[] {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    const limit = out.length ? 74 : 75; // continuation lines start with a space
    if (bytes + n > limit) {
      out.push(out.length ? ` ${cur}` : cur);
      cur = '';
      bytes = 0;
    }
    cur += ch;
    bytes += n;
  }
  out.push(out.length ? ` ${cur}` : cur);
  return out;
}
