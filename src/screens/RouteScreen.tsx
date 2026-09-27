import { useEffect, useState } from 'react';
import { RouteMap } from '../components/RouteMap';
import { Card, Dots, Warning } from '../components/ui';
import { RIDE_OVERHEAD, VEHICLES } from '../data/costs';
import type { Variant } from '../data/types';
import { LEG_GEOMETRY } from '../data/geo/legs';
import { fmtHours, fmtKm, googleMapsDirections, stopName } from '../lib/format';
import { legKey } from '../lib/geo';
import { variantStops } from '../lib/route';
import { useStore } from '../state/store';

function variantStats(v: Variant, speedFactor: number) {
  const km = v.legs.reduce((s, l) => s + l.km, 0);
  const hours = v.legs.reduce((s, l) => s + (l.km / (l.speed * speedFactor)) * RIDE_OVERHEAD, 0);
  const scenic = Math.round(v.legs.reduce((s, l) => s + (l.scenic ?? 1) * l.km, 0) / km);
  return { km, hours, scenic };
}

const DESKTOP = '(min-width: 1024px)';

function useMedia(query: string) {
  const [on, setOn] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const change = () => setOn(mq.matches);
    mq.addEventListener('change', change);
    return () => mq.removeEventListener('change', change);
  }, [query]);
  return on;
}

export function RouteScreen() {
  const { settings, plan, dispatch } = useStore();
  const speedFactor = VEHICLES.find((v) => v.id === settings.vehicle)?.speedFactor ?? 1;

  const legCount = plan.route.legs.length;
  const straight = plan.route.legs.filter((l) => !LEG_GEOMETRY[legKey(l.from, l.to)] && !LEG_GEOMETRY[legKey(l.to, l.from)]).length;
  const mapNote =
    straight === 0 ? 'Map lines follow the roads.' : straight === legCount ? 'Map lines are schematic.' : `Map lines follow the roads, except ${straight} of ${legCount} legs drawn straight.`;

  const desktop = useMedia(DESKTOP);
  const [panelOpen, setPanelOpen] = useState(true);

  const head = (
    <header className="page-head">
      <div className="eyebrow">
        {fmtKm(plan.totalKm)} · {settings.direction === 'ccw' ? 'counter-clockwise' : 'clockwise'} from {stopName(settings.startHub)}
      </div>
      <h1 className="display small-display">Choose your roads</h1>
      <p className="muted small">Pick a way through each section — coast, mountains or the quick road. Days and budget update instantly. {mapNote}</p>
    </header>
  );

  const sections = plan.route.sections.map(({ section, variant: chosen, reversed }) => {
    const from = reversed ? section.to : section.from;
    const to = reversed ? section.from : section.to;
    const warnings = [...new Map(chosen.legs.flatMap((l) => l.warnings ?? []).map((w) => [w.text, w])).values()];
    return (
      <Card key={section.id} title={`${stopName(from)} → ${stopName(to)}`}>
        <div className="variants" role="radiogroup" aria-label={`${stopName(from)} to ${stopName(to)} route`}>
          {section.variants.map((v) => {
            const st = variantStats(v, speedFactor);
            const on = v.id === chosen.id;
            const via = variantStops(section, v, reversed).slice(1, -1);
            return (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={on}
                className={`variant ${on ? 'on' : ''}`}
                onClick={() => dispatch({ type: 'setVariant', sectionId: section.id, variantId: v.id })}
              >
                <div className="variant-top">
                  <span className="radio" aria-hidden />
                  <strong>{v.name}</strong>
                </div>
                <div className="variant-meta">
                  <span>{fmtKm(st.km)}</span>
                  <span>~{fmtHours(st.hours)}</span>
                  <span>Scenery <Dots n={st.scenic} label="Scenery" /></span>
                  <span>Difficulty <Dots n={v.difficulty} label="Difficulty" /></span>
                </div>
                <p>{v.summary}</p>
                {via.length > 0 && <div className="variant-via">via {via.map(stopName).join(' · ')}</div>}
              </button>
            );
          })}
        </div>
        {warnings.map((w) => (
          <Warning key={w.text} w={w} />
        ))}
        <a className="link" href={googleMapsDirections(variantStops(section, chosen, reversed))} target="_blank" rel="noreferrer">
          Open this section in Google Maps ↗
        </a>
      </Card>
    );
  });

  if (desktop) {
    return (
      <div className={`route-desk ${panelOpen ? 'panel-open' : ''}`}>
        <div className="route-desk-map">
          <RouteMap plan={plan} height="100%" />
        </div>
        <button
          type="button"
          className="panel-toggle"
          onClick={() => setPanelOpen((o) => !o)}
          aria-expanded={panelOpen}
          aria-controls="route-panel"
          aria-label={panelOpen ? 'Hide road choices' : 'Show road choices'}
        >
          <span aria-hidden>{panelOpen ? '›' : '‹'}</span>
          {!panelOpen && <span className="panel-toggle-label">Roads</span>}
        </button>
        <aside id="route-panel" className="route-panel" aria-label="Road choices" inert={!panelOpen}>
          {head}
          {sections}
        </aside>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="bleed-map">
        <RouteMap plan={plan} height={320} controls={false} />
      </div>
      {head}
      {sections}
    </div>
  );
}
