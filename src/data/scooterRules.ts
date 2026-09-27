import type { RoadSeg, ScooterRule } from '../lib/roadCheck';

/**
 * Roads a white-plate scooter (≤250cc, the usual rental) may NOT ride, as rules over the OSM data the map
 * lines follow. Every map line is tested against these (src/data/scooterRules.test.ts) and `npm run snap-legs`
 * refuses to save a line that breaks one. Sources: research/02. Rules change (e.g. the Zhongren Tunnel trial):
 * update them here and in research/02, then run the tests to see which legs are affected.
 */

const has = (s: RoadSeg, re: RegExp) => s.names.some((n) => re.test(n));

// Provincial expressways (快速公路) are numbered 61–88; their mainlines are tagged trunk in OSM. Frontage and
// surface roads carrying the same number are tagged primary or lower, so the class tells them apart.
const EXPRESSWAY_REFS = /^(台|臺)?(6[1-8]|7[0-9]|8[0-8])(線)?$/;

export const SCOOTER_RULES: ScooterRule[] = [
  {
    id: 'freeway',
    label: 'National freeway (國道)',
    reason: 'Scooters of any size are banned from National Freeways and their ramps.',
    source: 'research/02',
    checked: '2026-09',
    bans: (s) => s.cls === 'motorway',
  },
  {
    id: 'expressway',
    label: 'Expressway (快速公路 / 快速道路 / 高架)',
    reason:
      'Provincial expressways (Tai 61–88 mainlines) and Taipei\'s expressways/elevated roads (堤頂大道, 環東大道, ' +
      '水源/環河/信義/洲美/建國 快速道路, 市民/基隆/新生 高架) ban white-plate scooters.',
    source: 'research/02',
    checked: '2026-09',
    bans: (s) =>
      (s.cls === 'trunk' || s.cls === 'motorway') &&
      (has(s, /快速|高架|環東大道|堤頂大道/) || has(s, EXPRESSWAY_REFS)),
    // 淡江大橋 (Tai 61, Tamsui–Bali) has a dedicated 2.5 m scooter lane, 40 km/h (Highway Bureau, 2026).
    allows: (s) => has(s, /^淡江大橋$/),
  },
  {
    id: 'suhua-new-road',
    label: 'Suhua Improved Highway tunnel (蘇花改)',
    reason:
      'White-plate scooters may not use the tunnels of the Suhua Improved Highway (Tai 9: Su\'ao–Dong\'ao, Nan\'ao–Heping, ' +
      'Hezhong–Daqingshui); they ride the old road, Tai 9D. Exceptions: Renshui Tunnel (open) and Zhongren Tunnel ' +
      '(trial). Daqingshui–Chongde (Qingshui Cliff: 大清水/錦文/匯德/崇德 tunnels) is the old road and not part of it.',
    source: 'research/02; zh.wikipedia 蘇花公路改善計畫; TVBS 2026 Suhua control guide (cars.tvbs.com.tw/life/214844)',
    checked: '2026-09',
    // By name, plus any other Tai 9 (not 9D) tunnel between Su'ao and Daqingshui in case OSM names differ.
    bans: (s) =>
      !!s.tunnel &&
      (has(s, /^(蘇澳|東澳|觀音|谷風|武塔)隧道$/) ||
        (s.lat > 24.225 && s.lat < 24.62 && has(s, /^(台)?9(線)?$/) && !has(s, /9丁/))),
    allows: (s) => has(s, /仁水隧道|中仁隧道/),
  },
];
