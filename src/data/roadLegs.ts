import { BYPASSES } from './bypasses.ts';
import { LINKS } from './links.ts';
import { SECTIONS } from './sections.ts';
import type { Leg } from './types';

export interface RoadLeg extends Leg {
  from: string;
}

/**
 * Every road the app can draw — section legs, links and bypasses — once each, keyed "from>to" as the data writes it
 * (clockwise for section legs and bypasses). The first one written wins when two share a key.
 */
export function roadLegs(): Map<string, RoadLeg> {
  const out = new Map<string, RoadLeg>();
  const add = (from: string, l: Leg) => {
    const key = `${from}>${l.to}`;
    if (!out.has(key)) out.set(key, { ...l, from });
  };
  const chain = (from: string, legs: Leg[]) => legs.forEach((l, i) => add(i ? legs[i - 1].to : from, l));
  for (const s of SECTIONS) for (const v of s.variants) chain(s.from, v.legs);
  for (const l of LINKS) add(l.from, l);
  for (const b of BYPASSES) chain(b.from, b.legs);
  return out;
}
