import { RouteMap } from '../components/RouteMap';
import { Card, Dots, Note, Warning } from '../components/ui';
import { RIDE_OVERHEAD, VEHICLES } from '../data/costs';
import type { Variant } from '../data/types';
import { fmtHours, fmtKm, googleMapsDirections, stopName } from '../lib/format';
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

  return (
    <div className="screen">
      <Card className="flush">
        <RouteMap plan={plan} />
        <div className="map-caption">
          {fmtKm(plan.totalKm)} loop · {settings.direction === 'ccw' ? 'counter-clockwise' : 'clockwise'} from {stopName(settings.startHub)} · lines are schematic
        </div>
      </Card>

      <Note tone="tip">
        Pick a variant for each section. Your day-by-day plan and budget update instantly.
      </Note>

      {plan.route.sections.map(({ section, variant: chosen, reversed }) => {
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
      })}
    </div>
  );
}
