import { STAYS, VEHICLES } from '../data/costs';
import { GUIDE } from '../data/guide';
import { STOP_BY_ID } from '../data/stops';
import { currencyFor } from '../lib/budget';
import { dayTitle } from '../lib/export';
import { fmtDate, fmtHours, fmtKm, fmtMoney, stopName } from '../lib/format';
import { PACES } from '../state/settings';
import { useStore } from '../state/store';
import type { Tab } from '../App';

/**
 * The whole trip on one page for printing or "Save as PDF". No map or tab bar: plain text that
 * works on paper and on a phone with no signal.
 */
export function PrintScreen({ go }: { go: (t: Tab) => void }) {
  const { settings, plan, budget } = useStore();
  const cur = currencyFor(settings.currency);
  const vehicle = VEHICLES.find((v) => v.id === settings.vehicle)!;
  const stay = STAYS.find((s) => s.id === settings.stay)!;
  const emergency = GUIDE.flatMap((g) => g.items).find((i) => i.title === 'Emergency numbers');

  return (
    <div className="print-page">
      <div className="print-bar no-print">
        <button type="button" className="btn ghost small" onClick={() => go('plan')}>
          ← Back
        </button>
        <button type="button" className="btn primary small" onClick={() => window.print()}>
          Print / save as PDF
        </button>
      </div>

      <header className="print-head">
        <div className="eyebrow">環島 · Huan Dao</div>
        <h1>
          {settings.days} days around Taiwan from {stopName(settings.startHub)}
        </h1>
        <p>
          {settings.startDate ? `${fmtDate(settings.startDate)} – ${fmtDate(plan.days.at(-1)?.date)} · ` : ''}
          {fmtKm(plan.totalKm)} · {plan.ridingDays} riding days · {settings.direction === 'ccw' ? 'counter-clockwise' : 'clockwise'} · {PACES[settings.pace].label.toLowerCase()} pace
          <br />
          {settings.riders} rider{settings.riders > 1 ? 's' : ''} on {settings.bikes} × {vehicle.label} · {stay.label} · about {fmtMoney(budget.total, cur)} total ({fmtMoney(budget.perPerson, cur)}{' '}
          per person)
        </p>
      </header>

      {plan.notes.length > 0 && (
        <ul className="print-notes">
          {plan.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      <ol className="print-days">
        {plan.days.map((d) => (
          <li key={d.day} className="print-day">
            <div className="print-day-head">
              <strong>
                Day {d.day}
                {d.date && ` · ${fmtDate(d.date)}`}
              </strong>
              <span>
                {dayTitle(d)}
                {d.kind === 'ride' && (
                  <span className="print-zh">
                    {' '}
                    {STOP_BY_ID[d.from]?.zh} → {STOP_BY_ID[d.to]?.zh}
                  </span>
                )}
              </span>
              {d.kind === 'ride' && (
                <span className="print-meta">
                  {fmtKm(d.km)} · ~{fmtHours(d.hours)}
                </span>
              )}
            </div>
            {d.kind === 'ride' && (
              <p>
                {d.via.length > 1 && `Via ${d.via.slice(0, -1).map(stopName).join(', ')} · `}
                {[...new Set(d.legs.map((l) => l.road))].join(' → ')}
              </p>
            )}
            {d.warnings.map((w) => (
              <p key={w.text} className={`print-warn ${w.level}`}>
                {w.level === 'danger' ? '⚠ ' : ''}
                {w.text}
              </p>
            ))}
            {d.holiday && <p className="print-warn caution">Public holiday: {d.holiday.name} — book ahead, expect crowds.</p>}
            {d.attractions.length > 0 && <p>See: {d.attractions.map((a) => a.name).join(' · ')}</p>}
            {d.overnight && (
              <p>
                Sleep: {stopName(d.overnight)} {STOP_BY_ID[d.overnight]?.zh}
                {STOP_BY_ID[d.overnight]?.overnight === 1 && ' (few places — book ahead)'}
              </p>
            )}
          </li>
        ))}
      </ol>

      <section className="print-budget">
        <h2>Budget</h2>
        <table>
          <tbody>
            {budget.lines.map((l) => (
              <tr key={l.id}>
                <td>{l.label}</td>
                <td>{fmtMoney(l.total, cur)}</td>
              </tr>
            ))}
            <tr className="total">
              <td>Total</td>
              <td>{fmtMoney(budget.total, cur)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {emergency && (
        <section className="print-emergency">
          <h2>Emergency</h2>
          <p>{emergency.body}</p>
        </section>
      )}
    </div>
  );
}
