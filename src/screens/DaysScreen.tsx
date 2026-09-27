import { Fragment, useEffect, useRef, useState } from 'react';
import { IconBed, IconLock } from '../components/icons';
import { RouteMap } from '../components/RouteMap';
import { AttractionRow } from '../components/AttractionRow';
import { Card, Note, Warning } from '../components/ui';
import { STAYS } from '../data/costs';
import { STOP_BY_ID } from '../data/stops';
import { currencyFor, nightFactor } from '../lib/budget';
import { bookingSearch, fmtDate, fmtHours, fmtKm, fmtMoney, googleMapsDirections, stopName } from '../lib/format';
import type { PlanDay } from '../lib/planner';
import { parseRoads, roadName, roadSequence, roadTitle, type RoadRef } from '../lib/roads';
import { useStore } from '../state/store';
import type { TripSettings } from '../state/settings';

/** What the user just did to an overnight stop, so the toast can say where it landed and undo it. */
interface StopChange {
  stopId: string;
  kind: 'sleep' | 'lock' | 'unlock';
  prev: Pick<TripSettings, 'pinned' | 'restDays' | 'days'>;
}

export function DaysScreen() {
  const { plan, settings, dispatch, update } = useStore();
  // #/days/3 (from the home screen's day strip) opens and scrolls to that day.
  const [linked] = useState(() => Number(window.location.hash.match(/^#\/days\/(\d+)/)?.[1]) || undefined);
  const [open, setOpen] = useState<number | undefined>(linked ?? 1);
  useEffect(() => {
    if (linked) document.getElementById(`day-${linked}`)?.scrollIntoView({ block: 'start' });
  }, [linked]);

  // Changing an overnight re-splits the whole trip, so tell the user where things landed (with undo).
  const [change, setChange] = useState<StopChange>();
  const [toast, setToast] = useState<{ text: string; undo: StopChange['prev'] }>();
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!change) return;
    const name = stopName(change.stopId);
    const day = plan.days.find((d) => d.kind === 'ride' && d.overnight === change.stopId);
    const text =
      change.kind === 'unlock'
        ? `${name} unlocked — the planner may move this night.`
        : !day
          ? `Couldn't fit a night in ${name} with ${settings.days} days — try adding a day.`
          : change.kind === 'sleep'
            ? `Day ${day.day} now ends in ${name}. Later days re-balanced.`
            : `${name} locked for Day ${day.day} — it stays when you change days or pace.`;
    if (change.kind === 'sleep' && day) setOpen(day.day);
    setToast({ text, undo: change.prev });
    setChange(undefined);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(undefined), 6000);
  }, [change, plan, settings.days]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const toggleStop = (stopId: string, kind: StopChange['kind']) => {
    setChange({ stopId, kind, prev: { pinned: settings.pinned, restDays: settings.restDays, days: settings.days } });
    dispatch({ type: 'togglePin', stopId });
  };

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
          <DayCard key={d.day} d={d} open={open === d.day} onToggle={() => setOpen(open === d.day ? undefined : d.day)} onStop={toggleStop} />
        ))}
      </ol>
      <div className="toast-slot" aria-live="polite">
        {toast && (
          <div className="toast" role="status">
            <span>{toast.text}</span>
            <button
              className="toast-undo"
              onClick={() => {
                update(toast.undo);
                setToast(undefined);
              }}
            >
              Undo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DayCard({ d, open, onToggle, onStop }: { d: PlanDay; open: boolean; onToggle: () => void; onStop: (stopId: string, kind: StopChange['kind']) => void }) {
  const { settings, dispatch } = useStore();
  const cur = currencyFor(settings.currency);
  const stay = STAYS.find((s) => s.id === settings.stay)!;
  const overnight = d.overnight ? STOP_BY_ID[d.overnight] : undefined;
  const isRest = d.kind === 'rest';
  const legRoads = d.legs.map((l) => parseRoads(l.road));
  const mainRoads = [...new Set(roadSequence(legRoads).map(roadName))];
  const scenic = d.legs.length ? d.legs.reduce((s, l) => s + l.scenic * l.km, 0) / Math.max(1, d.km) : 0;
  const foods = [...new Set([d.to, ...d.via].map((id) => STOP_BY_ID[id]).filter(Boolean).flatMap((s) => s.food.map((f) => `${f} · ${s.name}`)))].slice(0, 6);
  const nightPrice = overnight
    ? stay.price * overnight.lodgingFactor * nightFactor(d.date) * (stay.perPerson ? settings.riders : Math.ceil(settings.riders / 2))
    : 0;
  const restHere = d.overnight ? settings.restDays[d.overnight] ?? 0 : 0;

  return (
    <li id={`day-${d.day}`} className={`day ${d.kind} ${open ? 'open' : ''}`}>
      <button className="day-head" onClick={onToggle} aria-expanded={open}>
        <span className="day-num">{d.day}</span>
        <span className="day-title">
          <span className="day-date">
            Day {d.day}
            {d.date && ` · ${fmtDate(d.date)}`}
            {d.holiday && <span className="holiday"> · {d.holiday.name}</span>}
          </span>
          <strong>{isRest ? `${d.flex ? 'Flex' : 'Rest'} day in ${stopName(d.to)}` : `${stopName(d.from)} → ${stopName(d.to)}`}</strong>
          <span className="day-zh">{isRest ? STOP_BY_ID[d.to]?.zh : `${STOP_BY_ID[d.from]?.zh ?? ''} → ${STOP_BY_ID[d.to]?.zh ?? ''}`}</span>
          <span className="day-meta">
            {isRest ? (d.flex ? 'Explore, side trip or weather buffer' : 'Your rest day') : `${fmtKm(d.km)} · ~${fmtHours(d.hours)} riding${scenic >= 2.4 ? ' · very scenic' : ''}`}
            {d.warnings.some((w) => w.level === 'danger') && <span className="flag"> · check road</span>}
          </span>
          {!isRest && mainRoads.length > 0 && <span className="day-roads">via {mainRoads.join(' · ')}</span>}
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
                  const leg = d.legs[i];
                  return (
                    <Fragment key={`${id}-${i}`}>
                      <span className={`via-stop ${isEnd ? 'end' : ''}`}>
                        <span className="via-name">
                          {s?.name} <small>{s?.zh}</small>
                        </span>
                        {canSleep && isEnd && (
                          // Already tonight's stop: the only choice left is whether to lock it in.
                          <button
                            className={`pin tonight ${pinned ? 'on' : ''}`}
                            aria-pressed={pinned}
                            onClick={() => onStop(id, pinned ? 'unlock' : 'lock')}
                            title={pinned ? 'Locked: stays an overnight when you change days, pace or route. Tap to unlock.' : 'Chosen by the planner and may move if you change days, pace or route. Tap to lock it in.'}
                          >
                            <IconBed /> Tonight
                            <span className="pin-lock">
                              <IconLock open={!pinned} /> {pinned ? 'Locked' : 'Lock'}
                            </span>
                          </button>
                        )}
                        {canSleep && !isEnd && (
                          <button
                            className={`pin ${pinned ? 'on' : ''}`}
                            aria-pressed={pinned}
                            onClick={() => onStop(id, pinned ? 'unlock' : 'sleep')}
                            title={pinned ? "You asked to sleep here but it didn't fit. Tap to remove." : `End Day ${d.day} here and re-balance the days after`}
                          >
                            <IconBed /> Sleep here
                          </button>
                        )}
                      </span>
                      {leg && (
                        <span className="via-leg">
                          <RoadBadges roads={legRoads[i]} />
                          <span className="muted">{fmtKm(leg.km)} · {fmtHours(leg.hours)}</span>
                        </span>
                      )}
                    </Fragment>
                  );
                })}
              </div>
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
                  {d.date && nightFactor(d.date) > 1 && ' · weekend/holiday rate'}
                </span>
                <a className="btn ghost small" href={bookingSearch(overnight.id, d.date)} target="_blank" rel="noreferrer">
                  Find a stay ↗
                </a>
              </div>
              {!isRest && (
                <div className="rest-ctl">
                  <span>Extra nights here: {restHere}{restHere > 0 && ` (${restHere} rest day${restHere > 1 ? 's' : ''})`}</span>
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

function RoadBadges({ roads }: { roads: RoadRef[] }) {
  return (
    <span className="road-badges">
      {roads.map((r, i) => (
        <span key={`${r.label}-${i}`} className={`road ${r.kind}${r.frontage ? ' frontage' : ''}`} title={roadTitle(r)}>
          <span className="road-num">{r.zh || r.label}</span>
          {r.zh && <span className="road-en">{r.label}</span>}
          {r.note && <span className="road-note">{r.note}</span>}
        </span>
      ))}
    </span>
  );
}
