import { STAYS } from '../data/costs';
import { STOP_BY_ID } from '../data/stops';
import { currencyFor } from '../lib/budget';
import { fmtDate, fmtHours, fmtKm, fmtMoney, stopName } from '../lib/format';
import { useStore } from '../state/store';

/** Whole-trip itinerary, hidden on screen and shown only when printing (see `.print-only` in app.css). */
export function PrintItinerary() {
  const { settings, plan, budget } = useStore();
  const cur = currencyFor(settings.currency);
  const stay = STAYS.find((s) => s.id === settings.stay)!;

  return (
    <section className="print-only print-itinerary" aria-hidden>
      <h1>環島 Huan Dao — {settings.days} days from {stopName(settings.startHub)}</h1>
      <p>
        {fmtKm(plan.totalKm)} · {fmtHours(plan.totalRideHours)} riding · {plan.ridingDays} riding days
        {plan.restDays + plan.flexDays > 0 && ` · ${plan.restDays + plan.flexDays} rest/flex`} · {settings.direction === 'ccw' ? 'counter-clockwise' : 'clockwise'} ·{' '}
        {stay.label} · ≈{fmtMoney(budget.perPerson, cur)}/person
      </p>
      <table>
        <thead>
          <tr>
            <th>Day</th>
            <th>Route</th>
            <th>km / h</th>
            <th>Don't miss</th>
            <th>Sleep</th>
          </tr>
        </thead>
        <tbody>
          {plan.days.map((d) => (
            <tr key={d.day}>
              <td>
                <strong>{d.day}</strong>
                {d.date && <div>{fmtDate(d.date)}</div>}
              </td>
              <td>
                {d.kind === 'rest' ? (
                  `${d.flex ? 'Flex' : 'Rest'} day in ${stopName(d.to)}`
                ) : (
                  <>
                    <strong>{stopName(d.from)} → {stopName(d.to)}</strong>
                    {d.via.length > 1 && <div className="small">via {d.via.slice(0, -1).map(stopName).join(', ')}</div>}
                    <div className="small">{[...new Set(d.legs.map((l) => l.road))].join(' → ')}</div>
                    {d.warnings.map((w) => (
                      <div key={w.text} className="small">⚠ {w.text}</div>
                    ))}
                  </>
                )}
              </td>
              <td className="nowrap">{d.kind === 'ride' ? <>{fmtKm(d.km)}<br />{fmtHours(d.hours)}</> : '—'}</td>
              <td className="small">{d.attractions.slice(0, 4).map((a) => a.name).join(', ')}</td>
              <td>{d.overnight ? `${STOP_BY_ID[d.overnight]?.name} ${STOP_BY_ID[d.overnight]?.zh}` : 'Home'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
