import { useEffect, useState } from 'react';
import { RouteMap } from '../components/RouteMap';
import { AttractionRow } from '../components/AttractionRow';
import { Card, Note, Warning } from '../components/ui';
import { STAYS } from '../data/costs';
import { STOP_BY_ID } from '../data/stops';
import { currencyFor } from '../lib/budget';
import { bookingSearch, fmtDate, fmtHours, fmtKm, fmtMoney, googleMapsDirections, stopName } from '../lib/format';
import type { PlanDay } from '../lib/planner';
import { useStore } from '../state/store';

export function DaysScreen() {
  const { plan } = useStore();
  // #/days/3 (from the home screen's day strip) opens and scrolls to that day.
  const [linked] = useState(() => Number(window.location.hash.match(/^#\/days\/(\d+)/)?.[1]) || undefined);
  const [open, setOpen] = useState<number | undefined>(linked ?? 1);
  useEffect(() => {
    if (linked) document.getElementById(`day-${linked}`)?.scrollIntoView({ block: 'start' });
  }, [linked]);

  return (
    <div className="screen">
      <Card className="flush sticky-map">
        <RouteMap plan={plan} highlightDay={open} height={240} controls={false} />
      </Card>
      {plan.notes.map((n) => (
        <Note key={n} tone="warn">{n}</Note>
      ))}
      <ol className="timeline">
        {plan.days.map((d) => (
          <DayCard key={d.day} d={d} open={open === d.day} onToggle={() => setOpen(open === d.day ? undefined : d.day)} />
        ))}
      </ol>
    </div>
  );
}

function DayCard({ d, open, onToggle }: { d: PlanDay; open: boolean; onToggle: () => void }) {
  const { settings, dispatch } = useStore();
  const cur = currencyFor(settings.currency);
  const stay = STAYS.find((s) => s.id === settings.stay)!;
  const overnight = d.overnight ? STOP_BY_ID[d.overnight] : undefined;
  const isRest = d.kind === 'rest';
  const roads = [...new Set(d.legs.map((l) => l.road))];
  const scenic = d.legs.length ? d.legs.reduce((s, l) => s + l.scenic * l.km, 0) / Math.max(1, d.km) : 0;
  const foods = [...new Set([d.to, ...d.via].map((id) => STOP_BY_ID[id]).filter(Boolean).flatMap((s) => s.food.map((f) => `${f} · ${s.name}`)))].slice(0, 6);
  const nightPrice = overnight ? stay.price * overnight.lodgingFactor * (stay.perPerson ? settings.riders : Math.ceil(settings.riders / 2)) : 0;
  const restHere = d.overnight ? settings.restDays[d.overnight] ?? 0 : 0;

  return (
    <li id={`day-${d.day}`} className={`day ${d.kind} ${open ? 'open' : ''}`}>
      <button className="day-head" onClick={onToggle} aria-expanded={open}>
        <span className="day-num">{d.day}</span>
        <span className="day-title">
          <span className="day-date">
            Day {d.day}
            {d.date && ` · ${fmtDate(d.date)}`}
          </span>
          <strong>{isRest ? `${d.flex ? 'Flex' : 'Rest'} day in ${stopName(d.to)}` : `${stopName(d.from)} → ${stopName(d.to)}`}</strong>
          <span className="day-zh">{isRest ? STOP_BY_ID[d.to]?.zh : `${STOP_BY_ID[d.from]?.zh ?? ''} → ${STOP_BY_ID[d.to]?.zh ?? ''}`}</span>
          <span className="day-meta">
            {isRest ? (d.flex ? 'Explore, side trip or weather buffer' : 'Your rest day') : `${fmtKm(d.km)} · ~${fmtHours(d.hours)} riding${scenic >= 2.4 ? ' · very scenic' : ''}`}
            {d.warnings.some((w) => w.level === 'danger') && <span className="flag"> · check road</span>}
          </span>
        </span>
        <span className="chev" aria-hidden>{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="day-body">
          {!isRest && (
            <>
              <div className="via">
                {[d.from, ...d.via].map((id, i, arr) => {
                  const s = STOP_BY_ID[id];
                  const isEnd = i === arr.length - 1;
                  const pinned = settings.pinned.includes(id);
                  const canSleep = (s?.overnight ?? 0) > 0 && i > 0 && id !== settings.startHub;
                  return (
                    <span key={`${id}-${i}`} className={`via-stop ${isEnd ? 'end' : ''}`}>
                      <span className="via-name">
                        {s?.name} <small>{s?.zh}</small>
                      </span>
                      {canSleep && (
                        <button
                          className={`pin ${pinned ? 'on' : ''}`}
                          onClick={() => dispatch({ type: 'togglePin', stopId: id })}
                          title={pinned ? 'Unpin this overnight stop' : isEnd ? 'Keep this overnight stop fixed when you change other settings' : 'Make this an overnight stop'}
                        >
                          {pinned ? 'Pinned' : isEnd ? 'Pin' : 'Sleep here'}
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
              <div className="muted small">Roads: {roads.join(' → ')}</div>
              {d.warnings.map((w) => (
                <Warning key={w.text} w={w} />
              ))}
            </>
          )}

          {d.attractions.length > 0 && (
            <div className="block">
              <h3>{isRest ? 'Things to do' : 'Stops worth making'}</h3>
              {d.attractions.map((a) => (
                <AttractionRow key={a.id} a={a} compact />
              ))}
            </div>
          )}

          {foods.length > 0 && (
            <div className="block">
              <h3>Eat</h3>
              <ul className="food">
                {foods.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {overnight && (
            <div className="block sleep">
              <h3>Sleep in {overnight.name}</h3>
              <p className="muted small">{overnight.blurb}</p>
              <div className="sleep-row">
                <span>
                  {stay.label}: ~{fmtMoney(nightPrice, cur)} / night
                  {overnight.overnight === 1 && ' · limited options, book ahead'}
                </span>
                <a className="btn ghost small" href={bookingSearch(overnight.id, d.date)} target="_blank" rel="noreferrer">
                  Find a stay ↗
                </a>
              </div>
              {!isRest && (
                <div className="rest-ctl">
                  <span>Rest days here: {restHere}</span>
                  <button className="btn ghost small" disabled={restHere === 0} onClick={() => dispatch({ type: 'setRest', stopId: overnight.id, nights: restHere - 1 })}>−</button>
                  <button className="btn ghost small" onClick={() => dispatch({ type: 'setRest', stopId: overnight.id, nights: restHere + 1 })}>+</button>
                </div>
              )}
            </div>
          )}

          {!isRest && (
            <a className="btn primary block-btn" href={googleMapsDirections([d.from, ...d.via])} target="_blank" rel="noreferrer">
              Navigate in Google Maps ↗
            </a>
          )}
          {!isRest && <p className="muted tiny">Tip: in Google Maps choose "Avoid highways" — scooters can't use freeways.</p>}
        </div>
      )}
    </li>
  );
}
