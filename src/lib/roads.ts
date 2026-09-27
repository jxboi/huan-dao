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

export function parseRoad(segment: string): RoadRef {
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
    if (out[out.length - 1]?.label !== r.label) out.push(r);
  }
  return out;
}
