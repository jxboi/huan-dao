import type { Bypass } from './types';

/**
 * Roads round a hub town. Sections run hub to hub, so without these every route passes through each hub; a bypass
 * lets a day ride past one when the stops either side of it are on the bypass (lib/route.ts). Same rules as legs:
 * `legs` run clockwise from `from`, distances from research/01, geometry from `npm run snap-legs`.
 */
export const BYPASSES: Bypass[] = [
  {
    // Clockwise: Sun Moon Lake (or Puli) → Dongshi, i.e. from the Chiayi–Taichung side to the Taichung–Hsinchu side.
    id: 'tai21-guoxing',
    name: 'Tai 21 via Guoxing (skip Taichung)',
    summary: 'Up the Tai 21 valley between Puli and Dongshi instead of dropping into Taichung city. Joins Tai 3 at Dongshi.',
    hub: 'taichung',
    from: 'sunmoonlake',
    legs: [
      { to: 'puli', km: 20, speed: 35, road: 'Tai 21', scenic: 2 },
      { to: 'dongshi', km: 61, speed: 35, road: 'Tai 14 / Tai 21', scenic: 3 },
    ],
    difficulty: 2,
  },
];

export const BYPASS_BY_ID: Record<string, Bypass> = Object.fromEntries(BYPASSES.map((b) => [b.id, b]));
