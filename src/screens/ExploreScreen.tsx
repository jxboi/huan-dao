import { useMemo, useState } from 'react';
import { AttractionRow, CATEGORY_ICON } from '../components/AttractionRow';
import { Card, Note } from '../components/ui';
import { ATTRACTIONS } from '../data/attractions';
import { STOP_BY_ID, STOPS } from '../data/stops';
import type { AttractionCategory, Region } from '../data/types';
import { useStore } from '../state/store';

const REGIONS: { id: Region | 'all'; label: string }[] = [
  { id: 'all', label: 'All Taiwan' },
  { id: 'north', label: 'North' },
  { id: 'northeast', label: 'Northeast' },
  { id: 'east', label: 'East' },
  { id: 'south', label: 'South' },
  { id: 'southwest', label: 'Southwest' },
  { id: 'central', label: 'Central' },
  { id: 'northwest', label: 'Northwest' },
];

const CATS = Object.keys(CATEGORY_ICON) as AttractionCategory[];

export function ExploreScreen() {
  const { settings, plan } = useStore();
  const [q, setQ] = useState('');
  const [region, setRegion] = useState<Region | 'all'>('all');
  const [cat, setCat] = useState<AttractionCategory | 'all'>('all');
  const [savedOnly, setSavedOnly] = useState(false);
  const [onRouteOnly, setOnRouteOnly] = useState(true);

  const onRoute = useMemo(() => new Set(plan.route.points), [plan]);
  // Order stops by where they appear on the current route.
  const routeOrder = useMemo(() => {
    const m = new Map<string, number>();
    plan.route.points.forEach((p, i) => !m.has(p) && m.set(p, i));
    return m;
  }, [plan]);

  const list = ATTRACTIONS.filter((a) => {
    const stop = STOP_BY_ID[a.stopId];
    if (region !== 'all' && stop.region !== region) return false;
    if (cat !== 'all' && a.category !== cat) return false;
    if (savedOnly && !settings.saved.includes(a.id)) return false;
    if (onRouteOnly && !onRoute.has(a.stopId)) return false;
    if (q) {
      const hay = `${a.name} ${a.zh ?? ''} ${a.description} ${stop.name} ${stop.zh}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  }).sort((a, b) => (routeOrder.get(a.stopId) ?? 999) - (routeOrder.get(b.stopId) ?? 999));

  const foodStops = STOPS.filter((s) => s.food.length && (!onRouteOnly || onRoute.has(s.id)) && (region === 'all' || s.region === region)).sort(
    (a, b) => (routeOrder.get(a.id) ?? 999) - (routeOrder.get(b.id) ?? 999),
  );

  return (
    <div className="screen">
      <Card>
        <input className="input" type="search" placeholder="Search sights, towns, 中文…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        <div className="chips scroll" role="group" aria-label="Region">
          {REGIONS.map((r) => (
            <button key={r.id} className={`chip ${region === r.id ? 'on' : ''}`} onClick={() => setRegion(r.id)}>{r.label}</button>
          ))}
        </div>
        <div className="chips scroll" role="group" aria-label="Category">
          <button className={`chip ${cat === 'all' ? 'on' : ''}`} onClick={() => setCat('all')}>All</button>
          {CATS.map((c) => (
            <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>
              {CATEGORY_ICON[c]} {c.replace('-', ' ').replace(/^./, (ch) => ch.toUpperCase())}
            </button>
          ))}
        </div>
        <div className="toggles">
          <label><input type="checkbox" checked={onRouteOnly} onChange={(e) => setOnRouteOnly(e.target.checked)} /> On my route</label>
          <label><input type="checkbox" checked={savedOnly} onChange={(e) => setSavedOnly(e.target.checked)} /> ★ Saved ({settings.saved.length})</label>
        </div>
      </Card>

      <Note tone="tip">Tap ☆ to save a must-see. Saved sights are added to the right day, and their visiting time is factored into how the days are split.</Note>

      <Card title={`${list.length} places`}>
        {list.length === 0 && <p className="muted">Nothing matches — try turning off "On my route" or choosing another route variant.</p>}
        {list.map((a) => (
          <AttractionRow key={a.id} a={a} offRoute={!onRoute.has(a.stopId)} />
        ))}
      </Card>

      {(cat === 'all' || cat === 'food') && !savedOnly && !q && (
        <Card title="🍜 What to eat where">
          <dl className="food-list">
            {foodStops.map((s) => (
              <div key={s.id}>
                <dt>{s.name} <small className="muted">{s.zh}</small></dt>
                <dd>{s.food.join(' · ')}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}
    </div>
  );
}
