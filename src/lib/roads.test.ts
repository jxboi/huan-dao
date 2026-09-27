import { describe, expect, it } from 'vitest';
import { SECTIONS } from '../data/sections';
import { parseRoad, parseRoads, roadName, roadSequence, roadTitle } from './roads';

describe('parseRoad', () => {
  it('reads provincial highways with stem suffixes', () => {
    expect(parseRoad('Tai 9')).toEqual({ kind: 'provincial', label: 'Tai 9', zh: '台9', note: undefined });
    expect(parseRoad('Tai 9D')).toMatchObject({ label: 'Tai 9D', zh: '台9丁' });
    expect(parseRoad('Tai 2B')).toMatchObject({ zh: '台2乙' });
    expect(parseRoad('Tai 2G')).toMatchObject({ zh: '台2庚' });
  });

  it('keeps trailing detail as a note', () => {
    expect(parseRoad('Tai 9 (South Link)')).toMatchObject({ zh: '台9', note: 'South Link' });
    expect(parseRoad('Tai 61 frontage')).toMatchObject({ zh: '台61', note: 'frontage' });
    expect(parseRoad('County 102 via Shuangxi')).toMatchObject({ kind: 'county', zh: '縣道102', note: 'via Shuangxi' });
  });

  it('flags frontage roads so the scooter ban stays visible', () => {
    const r = parseRoad('Tai 61 frontage');
    expect(r.frontage).toBe(true);
    expect(roadTitle(r)).toMatch(/banned/);
    expect(roadName(r)).toBe('Tai 61 frontage');
    expect(roadSequence([parseRoads('Tai 61'), parseRoads('Tai 61 frontage')])).toHaveLength(2);
    expect(parseRoad('Tai 9 (South Link)').frontage).toBeUndefined();
  });

  it('treats bare numbers as county roads', () => {
    expect(parseRoad('199A')).toMatchObject({ kind: 'county', label: 'County 199A', zh: '縣道199甲' });
  });
});

describe('parseRoads', () => {
  it('splits and reverses for anticlockwise legs', () => {
    expect(parseRoads('Tai 5 / Tai 2').map((r) => r.label)).toEqual(['Tai 5', 'Tai 2']);
    expect(parseRoads('Tai 5 / Tai 2', true).map((r) => r.label)).toEqual(['Tai 2', 'Tai 5']);
  });

  it('recognises every road in the route data', () => {
    for (const s of SECTIONS)
      for (const v of s.variants)
        for (const l of v.legs)
          for (const r of parseRoads(l.road)) expect(r.kind, `${v.id} → ${l.to}: "${l.road}"`).not.toBe('other');
  });
});

describe('roadSequence', () => {
  it('merges consecutive repeats', () => {
    const seq = roadSequence([parseRoads('Tai 2'), parseRoads('Tai 2 / 102'), parseRoads('Tai 2'), parseRoads('Tai 9')]);
    expect(seq.map((r) => r.label)).toEqual(['Tai 2', 'County 102', 'Tai 2', 'Tai 9']);
  });
});
