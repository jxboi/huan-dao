/**
 * Turns a leg's free-text `road` (e.g. "Tai 9D / Tai 9", "County 64 (Rui-Gang)")
 * into road badges that match what riders see on Taiwanese signs (台9丁, 縣道64).
 */

export type RoadKind = 'provincial' | 'county' | 'other';

export interface RoadRef {
  kind: RoadKind;
  /** English label, e.g. "Tai 9D". */
  label: string;
  /** Sign text, e.g. "台9丁" or "縣道64". Empty for unrecognised roads. */
  zh: string;
  /** Trailing detail such as "South Link", "via Shuangxi", "frontage". */
  note?: string;
  /**
   * Ride the surface road beside this route, not the route itself — e.g. Tai 61, whose expressway
   * (快速公路) sections ban scooters (research/02). Must stay visible wherever the number is shown.
   */
  frontage?: boolean;
}

// Suffix letters on Taiwanese route numbers are the Heavenly Stems: A=甲, B=乙, C=丙, D=丁…
const STEMS: Record<string, string> = { A: '甲', B: '乙', C: '丙', D: '丁', E: '戊' };

function zhNumber(num: string, suffix: string): string {
  return `${num}${suffix ? STEMS[suffix] ?? suffix : ''}`;
}

function cleanNote(rest: string): string | undefined {
  const note = rest.trim().replace(/^\((.*)\)$/, '$1').trim();
  return note || undefined;
}

function withFrontage(r: RoadRef): RoadRef {
  return r.note && /frontage/i.test(r.note) ? { ...r, frontage: true } : r;
}

export function parseRoad(segment: string): RoadRef {
  return withFrontage(parseRoadRef(segment));
}

/** Short name for summaries: "Tai 9", or "Tai 61 frontage" so the expressway is never implied. */
export function roadName(r: RoadRef): string {
  return r.frontage ? `${r.label} frontage` : r.label;
}

/** Hover/tap text for a badge; spells out the scooter ban for frontage roads. */
export function roadTitle(r: RoadRef): string {
  if (r.frontage) return `${r.label} frontage road — scooters are banned from the ${r.label} expressway itself`;
  return r.note ? `${r.label} (${r.note})` : r.label;
}

function parseRoadRef(segment: string): RoadRef {
  const s = segment.trim();
  const tai = s.match(/^Tai\s+(\d+)([A-E]?)\b(.*)$/i);
  if (tai) {
    const [, num, suf, rest] = tai;
    const sufU = suf.toUpperCase();
    return { kind: 'provincial', label: `Tai ${num}${sufU}`, zh: `台${zhNumber(num, sufU)}`, note: cleanNote(rest) };
  }
  // "County 106", or a bare number like "102" / "199A" (county roads in our data).
  const county = s.match(/^(?:County\s+)?(\d+)([A-E]?)\b(.*)$/i);
  if (county) {
    const [, num, suf, rest] = county;
    const sufU = suf.toUpperCase();
    return { kind: 'county', label: `County ${num}${sufU}`, zh: `縣道${zhNumber(num, sufU)}`, note: cleanNote(rest) };
  }
  return { kind: 'other', label: s, zh: '' };
}

/** Roads for one leg, in riding order. Data lists them clockwise, so pass `reversed` for anticlockwise legs. */
export function parseRoads(road: string, reversed = false): RoadRef[] {
  const refs = road.split('/').map((p) => p.trim()).filter(Boolean).map(parseRoad);
  return reversed ? refs.reverse() : refs;
}

/** Distinct roads across several legs, in order, merging consecutive repeats (for "Tai 2 → Tai 9" summaries). */
export function roadSequence(roads: RoadRef[][]): RoadRef[] {
  const out: RoadRef[] = [];
  for (const r of roads.flat()) {
    const last = out[out.length - 1];
    if (last?.label !== r.label || !!last.frontage !== !!r.frontage) out.push(r);
  }
  return out;
}
