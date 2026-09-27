import { Fragment, useState } from 'react';
import { DESKTOP, MapPanel, useMedia } from '../components/MapPanel';
import { RouteMap } from '../components/RouteMap';
import { StopPicker } from '../components/StopPicker';
import { Card, Dots, Warning } from '../components/ui';
import { RIDE_OVERHEAD, VEHICLES } from '../data/costs';
import { BYPASS_BY_ID, BYPASSES } from '../data/bypasses';
import { STOP_BY_ID } from '../data/stops';
import type { Section, Variant } from '../data/types';
import { LEG_GEOMETRY } from '../data/geo/legs';
import { fmtHours, fmtKm, googleMapsDirections, stopName } from '../lib/format';
import { legKey } from '../lib/geo';
import { CUSTOM_VARIANT, NETWORK_STOPS, addedKm, customVariant, expandStops } from '../lib/network';
import { variantStops } from '../lib/route';
import { useStore } from '../state/store';

function variantStats(v: Variant, speedFactor: number) {
  const km = v.legs.reduce((s, l) => s + l.km, 0);
  const hours = v.legs.reduce((s, l) => s + (l.km / (l.speed * speedFactor)) * RIDE_OVERHEAD, 0);
  const scenic = Math.round(v.legs.reduce((s, l) => s + (l.scenic ?? 1) * l.km, 0) / km);
  return { km, hours, scenic };
}

export function RouteScreen() {
  const { settings, plan, dispatch } = useStore();
  const speedFactor = VEHICLES.find((v) => v.id === settings.vehicle)?.speedFactor ?? 1;

  const legCount = plan.route.legs.length;
  const straight = plan.route.legs.filter((l) => !LEG_GEOMETRY[legKey(l.from, l.to)] && !LEG_GEOMETRY[legKey(l.to, l.from)]).length;
  const mapNote =
    straight === 0 ? 'Map lines follow the roads.' : straight === legCount ? 'Map lines are schematic.' : `Map lines follow the roads, except ${straight} of ${legCount} legs drawn straight.`;

  const desktop = useMedia(DESKTOP);

  const head = (
    <header className="page-head">
      <div className="eyebrow">
        {fmtKm(plan.totalKm)} · {settings.direction === 'ccw' ? 'counter-clockwise' : 'clockwise'} from {stopName(settings.startHub)}
      </div>
      <h1 className="display small-display">Choose your roads</h1>
      <p className="muted small">
        Pick a way through each section — coast, mountains or the quick road — or build your own through the towns you want. Days and budget update
        instantly. {mapNote}
      </p>
    </header>
  );

  const sections = plan.route.sections.map(({ section, variant: chosen, reversed }) => {
    const from = reversed ? section.to : section.from;
    const to = reversed ? section.from : section.to;
    const warnings = [...new Map(chosen.legs.flatMap((l) => l.warnings ?? []).map((w) => [w.text, w])).values()];
    return (
      <Fragment key={section.id}>
        <Card title={`${stopName(from)} → ${stopName(to)}`}>
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
            <CustomOption section={section} chosen={chosen} reversed={reversed} speedFactor={speedFactor} />
          </div>
          {warnings.map((w) => (
            <Warning key={w.text} w={w} />
          ))}
          <a className="link" href={googleMapsDirections(variantStops(section, chosen, reversed))} target="_blank" rel="noreferrer">
            Open this section in Google Maps ↗
          </a>
        </Card>
        {BYPASSES.filter((b) => b.hub === to && to !== settings.startHub).map((b) => (
          <BypassCard key={b.id} id={b.id} speedFactor={speedFactor} />
        ))}
      </Fragment>
    );
  });

  if (desktop) {
    return (
      <MapPanel map={<RouteMap plan={plan} height="100%" />} label="Road choices" toggleLabel="Roads">
        {head}
        {sections}
      </MapPanel>
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

/** A way round a hub, between the two sections that meet there. */
function BypassCard({ id, speedFactor }: { id: string; speedFactor: number }) {
  const { settings, plan, dispatch } = useStore();
  const b = BYPASS_BY_ID[id];
  const on = settings.bypasses.includes(id);
  const riding = plan.route.bypasses.includes(id);
  const st = variantStats(b, speedFactor);
  const path = [b.from, ...b.legs.map((l) => l.to)];
  const shown = settings.direction === 'ccw' ? [...path].reverse() : path;
  return (
    <Card title={`Skip ${stopName(b.hub)}?`}>
      <button type="button" role="switch" aria-checked={on} className={`variant ${on ? 'on' : ''}`} onClick={() => dispatch({ type: 'setBypass', id, on: !on })}>
        <div className="variant-top">
          <span className="radio check" aria-hidden />
          <strong>{b.name}</strong>
        </div>
        <div className="variant-meta">
          <span>{fmtKm(st.km)}</span>
          <span>~{fmtHours(st.hours)}</span>
          <span>Scenery <Dots n={st.scenic} label="Scenery" /></span>
          <span>Difficulty <Dots n={b.difficulty} label="Difficulty" /></span>
        </div>
        <p>{b.summary}</p>
        <div className="variant-via">{shown.map(stopName).join(' → ')}</div>
      </button>
      {on && !riding && (
        <div className="bypass-off">
          <p className="muted small">
            Your routes either side of {stopName(b.hub)} don't reach it, so you still ride through {stopName(b.hub)}. It needs a route through{' '}
            {path.map(stopName).join(' or ')} on both sides.
          </p>
          <button type="button" className="btn ghost small" onClick={() => dispatch({ type: 'setBypass', id, on: true })}>
            Switch those routes for me
          </button>
        </div>
      )}
      {riding && <p className="muted small">Your route rides round {stopName(b.hub)} on this road; the sections above and below meet here.</p>}
    </Card>
  );
}

/** "Your route" for a section: your own stops, joined over the road network. Shown under the presets. */
function CustomOption({ section, chosen, reversed, speedFactor }: { section: Section; chosen: Variant; reversed: boolean; speedFactor: number }) {
  const { settings, dispatch } = useStore();
  const [picking, setPicking] = useState(false);
  const stops = settings.customRoutes[section.id];
  const on = chosen.id === CUSTOM_VARIANT;

  if (!stops) {
    return (
      <button type="button" className="variant build" onClick={() => dispatch({ type: 'customise', sectionId: section.id })}>
        + Build your own route through this section
      </button>
    );
  }

  const v = on ? chosen : customVariant(section, stops);
  const st = variantStats(v, speedFactor);
  const path = expandStops(section, stops);
  const passes = (reversed ? [...path].reverse() : path).slice(1, -1).filter((id) => !stops.includes(id));
  const shownStops = reversed ? [...stops].reverse() : stops;
  const onPath = new Set(path);
  // Routing to every town is a few hundred shortest-path runs, so only when the picker is open.
  const options = !picking
    ? []
    : NETWORK_STOPS.filter((id) => !onPath.has(id))
        .map((id) => ({ id, km: addedKm(section, stops, id) }))
        .filter((o) => o.km < Infinity)
        .sort((a, b) => a.km - b.km)
        .map(({ id, km }) => ({ id, detail: `+${fmtKm(km)}${STOP_BY_ID[id].overnight ? '' : ' · pass-through only'}` }));

  return (
    <div className={`variant ${on ? 'on' : ''}`}>
      <button
        type="button"
        role="radio"
        aria-checked={on}
        className="variant-pick"
        onClick={() => dispatch({ type: 'customise', sectionId: section.id })}
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
      </button>
      {on && (
        <div className="custom-editor">
          {shownStops.map((id) => (
            <span key={id} className="stop-chip">
              {stopName(id)}
              <button type="button" aria-label={`Remove ${stopName(id)}`} onClick={() => dispatch({ type: 'removeStop', sectionId: section.id, stopId: id })}>
                ×
              </button>
            </span>
          ))}
          <button type="button" className="btn ghost small" onClick={() => setPicking(true)}>
            + Add a stop
          </button>
        </div>
      )}
      {passes.length > 0 && <div className="variant-via">also passes {passes.map(stopName).join(' · ')}</div>}
      <StopPicker
        open={picking}
        onClose={() => setPicking(false)}
        title="Add a stop"
        hint="It goes in wherever it adds the fewest km. The extra distance is shown for each town."
        options={options}
        onPick={(id) => dispatch({ type: 'addStop', sectionId: section.id, stopId: id })}
      />
    </div>
  );
}
