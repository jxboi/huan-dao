import { describe, expect, it } from 'vitest';
import { describeSeg, lineFingerprint, namedShare, violations, type RoadSeg } from '../lib/roadCheck';
import { LEG_ROADS } from './geo/legRoads';
import { LEG_GEOMETRY } from './geo/legs';
import { SCOOTER_RULES } from './scooterRules';
import { SECTIONS } from './sections';

/**
 * Legs whose map line spends less than half its distance on the roads the data names, with the share today.
 * Each is a data job: fix the `road` string, or steer the line with VIAS in scripts/snap-legs.ts. Shares may
 * only go up; remove a leg once it reaches 50 %.
 */
const OFF_NAMED_ROADS: Record<string, number> = {
  'toucheng>yilan': 0, // "Tai 9"
  'yilan>luodong': 0.41, // "Tai 9"
  'luodong>suao': 0, // "Tai 9"
  'hualien>guangfu': 0.4, // "Tai 9"
  'guanshan>taitung': 0.45, // "Tai 9"
  'taitung>taimali': 0.37, // "Tai 9"
  'dawu>shouka': 0.3, // "Tai 9 (South Link)"
  'xuhai>manzhou': 0.29, // "Tai 26"
  'donggang>kaohsiung': 0.12, // "Tai 17"
  'lukang>changhua': 0.17, // "Tai 19"
  'changhua>taichung': 0.08, // "Tai 1"
  'chiayi>sunmoonlake': 0.31, // "Tai 3 / Tai 21"
  'hsinchu>taipei': 0.12, // "Tai 1"
};
const MIN_SHARE = 0.5;

/** Every leg once, keyed "from>to" clockwise, with the road string the data gives it. */
const LEGS = new Map<string, string>();
for (const s of SECTIONS) {
  for (const v of s.variants) {
    let from = s.from;
    for (const l of v.legs) {
      if (!LEGS.has(`${from}>${l.to}`)) LEGS.set(`${from}>${l.to}`, l.road);
      from = l.to;
    }
  }
}
const SNAPPED = [...LEGS.keys()].filter((k) => LEG_GEOMETRY[k]);

describe('map lines vs scooter rules', () => {
  it('has road data for every snapped line, read from the current line', () => {
    const stale = SNAPPED.filter((k) => LEG_ROADS[k]?.line !== lineFingerprint(LEG_GEOMETRY[k]));
    expect(stale, 'run `npm run snap-legs -- --roads-only --only=<legs>`').toEqual([]);
  });

  it.each(SNAPPED)('%s uses no road white-plate scooters may not ride', (key) => {
    const bad = violations(LEG_ROADS[key]?.roads ?? [], SCOOTER_RULES).map((v) => `${v.rule.label}: ${describeSeg(v.seg)}`);
    expect(bad, 'steer the line with VIAS in scripts/snap-legs.ts, or fix the rule in scooterRules.ts').toEqual([]);
  });

  it.each(SNAPPED)('%s mostly follows the roads the data names', (key) => {
    const share = namedShare(LEGS.get(key)!, LEG_ROADS[key]?.roads ?? []);
    const floor = OFF_NAMED_ROADS[key] ?? MIN_SHARE;
    expect(share, `share of the line on "${LEGS.get(key)}"`).toBeGreaterThanOrEqual(floor);
  });

  it('has no stale entries in the off-named-roads list', () => {
    const fixed = Object.keys(OFF_NAMED_ROADS).filter(
      (k) => !LEGS.has(k) || namedShare(LEGS.get(k)!, LEG_ROADS[k]?.roads ?? []) >= MIN_SHARE,
    );
    expect(fixed, 'remove these from OFF_NAMED_ROADS').toEqual([]);
  });
});

const seg = (names: string[], cls: string, extra: Partial<RoadSeg> = {}): RoadSeg => ({
  names,
  cls,
  km: 1,
  lat: 25,
  lng: 121.5,
  ...extra,
});
const banned = (s: RoadSeg) => violations([s], SCOOTER_RULES).map((v) => v.rule.id);

describe('scooter rules', () => {
  it('bans freeways, expressways and Taipei elevated roads', () => {
    expect(banned(seg(['國道1號'], 'motorway'))).toEqual(['freeway']);
    expect(banned(seg(['市民大道高架道路'], 'trunk'))).toEqual(['expressway']);
    expect(banned(seg(['環東大道'], 'trunk'))).toEqual(['expressway']);
    expect(banned(seg(['61', '台61線', '西部濱海快速公路'], 'trunk'))).toEqual(['expressway']);
  });

  it('allows frontage roads, surface roads under the same number, and 淡江大橋', () => {
    expect(banned(seg(['西部濱海公路', '61', '台61線'], 'primary'))).toEqual([]);
    expect(banned(seg(['市民大道一段'], 'primary'))).toEqual([]);
    expect(banned(seg(['61', '台61線', '淡江大橋'], 'trunk'))).toEqual([]);
  });

  it('bans the Suhua new-road tunnels but not the old road, Renshui/Zhongren or the Qingshui Cliff', () => {
    expect(banned(seg(['觀音隧道', '9', '台9線'], 'trunk', { tunnel: true, lat: 24.37 }))).toEqual(['suhua-new-road']);
    expect(banned(seg(['某隧道', '9', '台9線'], 'primary', { tunnel: true, lat: 24.4 }))).toEqual(['suhua-new-road']);
    expect(banned(seg(['澳花隧道', '9丁', '台9丁線'], 'primary', { tunnel: true, lat: 24.32 }))).toEqual([]);
    expect(banned(seg(['中仁隧道', '9', '台9線'], 'primary', { tunnel: true, lat: 24.25 }))).toEqual([]);
    expect(banned(seg(['匯德隧道', '9', '台9線'], 'primary', { tunnel: true, lat: 24.206 }))).toEqual([]);
  });
});

describe('namedShare', () => {
  it('matches OSM refs in their various spellings', () => {
    const segs = [seg(['蘇花路', '9丁', '台9丁線'], 'primary'), seg(['瑞港公路', '花64'], 'tertiary'), seg(['中正路'], 'tertiary')];
    expect(namedShare('Tai 9D', segs)).toBeCloseTo(1 / 3);
    expect(namedShare('County 64 (Rui-Gang)', segs)).toBeCloseTo(1 / 3);
    expect(namedShare('Tai 9D / County 64', segs)).toBeCloseTo(2 / 3);
  });
});
