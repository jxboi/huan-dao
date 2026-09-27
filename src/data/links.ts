import type { Link } from './types';

/**
 * Roads between stops that no preset variant uses. Together with every leg in SECTIONS they make the road network
 * custom routes are built from (lib/network.ts): add a link here to let riders reach a town, or cut across between
 * two towns, that the presets don't connect. Same rules as legs — distances from research/01, geometry from
 * `npm run snap-legs` (which also snaps these), and the scooter-rule tests apply.
 */
export const LINKS: Link[] = [
  // Sun Moon Lake → Taichung (Tai 21 / Tai 14 / Tai 3) split at Puli, so Puli can be a stop. Via the town centre it's
  // 84 km, vs 76 km on the through leg that skirts it (Valhalla motor_scooter, Sep 2026; research/01).
  { from: 'sunmoonlake', to: 'puli', km: 20, speed: 35, road: 'Tai 21', scenic: 2, difficulty: 2 },
  { from: 'puli', to: 'taichung', km: 64, speed: 40, road: 'Tai 14 / Tai 3', scenic: 2, difficulty: 1 },
  // Tai 14 starts in Changhua and runs via Nantou, Caotun and Guoxing to Puli, so a plains route can head inland
  // without going through Taichung (research/01).
  { from: 'changhua', to: 'puli', km: 61, speed: 40, road: 'Tai 14', scenic: 2, difficulty: 1 },
];
