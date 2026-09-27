import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { IconBed, IconExternal, IconFood, IconInfo, IconLock, IconNavigate, IconStarLine } from '../components/icons';
import { DESKTOP, MapPanel, useMedia } from '../components/MapPanel';
import { RouteMap } from '../components/RouteMap';
import { AttractionRow } from '../components/AttractionRow';
import { StopPicker } from '../components/StopPicker';
import { Card, Note, Warning } from '../components/ui';
import { STAYS } from '../data/costs';
import { STOP_BY_ID } from '../data/stops';
import { currencyFor, nightFactor } from '../lib/budget';
import { bookingSearch, fmtDate, fmtHours, fmtKm, fmtMoney, googleMapsDirections, stopName } from '../lib/format';
import { dayEndOptions, dayRouteOptions, type DayRef, type DayRouteOption } from '../lib/editRoute';
import type { PlanDay } from '../lib/planner';
import { parseRoads, roadName, roadSequence, roadTitle, type RoadRef } from '../lib/roads';
import { useStore } from '../state/store';
import type { TripSettings } from '../state/settings';

/** What the user just did to an overnight stop, so the toast can say where it landed and undo it. */
interface StopChange {
  stopId: string;
  kind: 'sleep' | 'lock' | 'unlock' | 'move' | 'route';
  /** For 'route': the day's start and the name of the route picked. */
  /** For 'route': the day's start and how to name the route picked ("the scenic route"). */
  route?: { from: string; label: string };
  prev: Pick<TripSettings, 'pinned' | 'restDays' | 'days' | 'variants' | 'customRoutes' | 'bypasses'>;
}

export function DaysScreen() {
  const { plan, settings, dispatch, update } = useStore();
  // #/days/3 (from the home screen's day strip) opens and scrolls to that day.
  const [linked] = useState(() => Number(window.location.hash.match(/^#\/days\/(\d+)/)?.[1]) || undefined);
  const [open, setOpen] = useState<number | undefined>(linked ?? 1);
  // A stop tapped in the open day's list: the map flies to it. Cleared when another day opens.
  const [focus, setFocus] = useState<{ stopId: string; at: number }>();
  useEffect(() => setFocus(undefined), [open]);
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
    const rode = change.route && plan.days.find((d) => d.kind === 'ride' && d.from === change.route!.from);
    const text =
      change.kind === 'route' && rode
        ? rode.to === change.stopId
          ? `Day ${rode.day} now takes ${change.route!.label}. Later days re-balanced.`
          : `Route changed — the longer ride was split: Day ${rode.day} now ends in ${stopName(rode.to)}.`
        : change.kind === 'unlock'
        ? `${name} unlocked — the planner may move this night.`
        : !day
          ? `Couldn't fit a night in ${name} with ${settings.days} days — try adding a day.`
          : change.kind === 'sleep' || change.kind === 'move'
            ? `Day ${day.day} now ends in ${name}. Later days re-balanced.`
            : `${name} locked for Day ${day.day} — it stays when you change days or pace.`;
    if ((change.kind === 'sleep' || change.kind === 'move') && day) setOpen(day.day);
    if (rode) setOpen(rode.day);
    setToast({ text, undo: change.prev });
    setChange(undefined);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(undefined), 6000);
  }, [change, plan, settings.days]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const prev = (): StopChange['prev'] => ({
    pinned: settings.pinned,
    restDays: settings.restDays,
    days: settings.days,
    variants: settings.variants,
    customRoutes: settings.customRoutes,
    bypasses: settings.bypasses,
  });
  const toggleStop = (stopId: string, kind: StopChange['kind']) => {
    setChange({ stopId, kind, prev: prev() });
    dispatch({ type: 'togglePin', stopId });
  };
  const changeEnd = (day: DayRef, stopId: string) => {
    setChange({ stopId, kind: 'move', prev: prev() });
    dispatch({ type: 'changeDayEnd', day, stopId });
  };
  const chooseRoute = (day: DayRef, o: DayRouteOption) => {
    const label = o.kind === 'other' ? (o.name ? `the ${o.name} route` : 'the route you picked') : `the ${o.kind} route`;
    setChange({ stopId: day.to, kind: 'route', route: { from: day.from, label }, prev: prev() });
    dispatch({ type: 'chooseDayRoute', day, variants: o.variants, bypasses: o.bypasses });
  };

  const desktop = useMedia(DESKTOP);
  // In the side panel, collapsing the day above can push the opened day's header out of view.
  useEffect(() => {
    if (!desktop || open === undefined) return;
    const el = document.getElementById(`day-${open}`);
    const panel = el?.closest('.side-panel');
    if (el && panel && el.getBoundingClientRect().top < panel.getBoundingClientRect().top) el.scrollIntoView({ block: 'start' });
  }, [desktop, open]);

  const days = (
    <>
      {plan.notes.map((n) => (
        <Note key={n} tone="warn">{n}</Note>
      ))}
      <ol className="timeline">
        {plan.days.map((d) => (
          <DayCard key={d.day} d={d} open={open === d.day} onToggle={() => setOpen(open === d.day ? undefined : d.day)} onStop={toggleStop} onChangeEnd={changeEnd} onChooseRoute={chooseRoute} onFocusStop={(stopId) => setFocus({ stopId, at: Date.now() })} focused={open === d.day ? focus?.stopId : undefined} />
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
    </>
  );

  if (desktop) {
    return (
      <MapPanel map={<RouteMap plan={plan} highlightDay={open} focus={focus} height="100%" />} label="Day details" toggleLabel="Days">
        {days}
      </MapPanel>
    );
  }

  return (
    <div className="screen">
      <Card className="flush sticky-map">
        <RouteMap plan={plan} highlightDay={open} focus={focus} height={240} controls={false} />
      </Card>
      {days}
    </div>
  );
}

function DayCard({
  d,
  open,
  onToggle,
  onStop,
  onChangeEnd,
  onChooseRoute,
  onFocusStop,
  focused,
}: {
  d: PlanDay;
  open: boolean;
  onToggle: () => void;
  onStop: (stopId: string, kind: StopChange['kind']) => void;
  onChangeEnd: (day: DayRef, stopId: string) => void;
  onChooseRoute: (day: DayRef, o: DayRouteOption) => void;
  onFocusStop: (stopId: string) => void;
  focused?: string;
}) {
  const { settings, plan, dispatch } = useStore();
  const [picking, setPicking] = useState(false);
  const cur = currencyFor(settings.currency);
  const stay = STAYS.find((s) => s.id === settings.stay)!;
  const overnight = d.overnight ? STOP_BY_ID[d.overnight] : undefined;
  const isRest = d.kind === 'rest';
  const legRoads = d.legs.map((l) => parseRoads(l.road));
  const mainRoads = [...new Set(roadSequence(legRoads).map(roadName))];
  const scenic = d.legs.length ? d.legs.reduce((s, l) => s + l.scenic * l.km, 0) / Math.max(1, d.km) : 0;
  // Local dishes grouped by town (tonight's first), capped so the card stays short.
  const foodTowns = [...new Set([d.to, ...d.via])]
    .map((id) => STOP_BY_ID[id])
    .filter((s) => s && s.food.length > 0)
    .slice(0, 3)
    .map((s) => ({ id: s.id, name: s.name, food: s.food.slice(0, 4) }));
  const nightPrice = overnight
    ? stay.price * overnight.lodgingFactor * nightFactor(d.date) * (stay.perPerson ? settings.riders : Math.ceil(settings.riders / 2))
    : 0;
  const restHere = d.overnight ? settings.restDays[d.overnight] ?? 0 : 0;
  // Only worked out for the open day: it builds the route once per combination of today's section variants.
  const routeOpts = useMemo(() => (open && !isRest ? dayRouteOptions(settings, dayRef(d)) : []), [open, isRest, settings, d]);

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
              {routeOpts.length > 0 && <RouteChoice opts={routeOpts} onPick={(o) => onChooseRoute(dayRef(d), o)} />}
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
                        <button
                          type="button"
                          className={`via-name ${focused === id ? 'focused' : ''}`}
                          onClick={() => onFocusStop(id)}
                          aria-pressed={focused === id}
                          title={`Show ${s?.name} on the map`}
                        >
                          {s?.name} <small>{s?.zh}</small>
                        </button>
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
              {d.overnight && (
                <div className="day-actions">
                  <button type="button" className="btn ghost small" onClick={() => setPicking(true)}>
                    Change destination
                  </button>
                </div>
              )}
              {d.warnings.map((w) => (
                <Warning key={w.text} w={w} />
              ))}
              {d.overnight && (
                <StopPicker
                  open={picking}
                  onClose={() => setPicking(false)}
                  title={`Day ${d.day}: ${stopName(d.from)} → …`}
                  hint={`Pick where to sleep instead of ${stopName(d.to)}. The route is re-drawn through it on the app's roads, and both ends of today are pinned.`}
                  options={
                    picking
                      ? dayEndOptions(settings, plan.route, dayRef(d)).map((o) => ({
                          id: o.id,
                          detail: `${fmtKm(o.km)} from ${stopName(d.from)} by road`,
                          tag: o.onRoute ? 'on your route' : undefined,
                        }))
                      : []
                  }
                  onPick={(stopId) => onChangeEnd(dayRef(d), stopId)}
                />
              )}
            </>
          )}

          {d.attractions.length > 0 && (
            <div className="block">
              <h3 className="block-h">
                <IconStarLine /> {isRest ? 'Things to do' : 'Stops worth making'}
              </h3>
              <div className="tiles">
                {d.attractions.map((a) => (
                  <AttractionRow key={a.id} a={a} compact />
                ))}
              </div>
            </div>
          )}

          {foodTowns.length > 0 && (
            <div className="block">
              <h3 className="block-h">
                <IconFood /> Eat
              </h3>
              {foodTowns.map((t) => (
                <div key={t.id} className="food-town">
                  {foodTowns.length > 1 && <span className="food-where">{t.name}</span>}
                  <ul className="food-chips">
                    {t.food.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {overnight && (
            <div className="block sleep-card">
              <div className="sleep-top">
                <span className="sleep-icon">
                  <IconBed />
                </span>
                <div className="sleep-title">
                  <span className="sleep-kicker">Tonight</span>
                  <strong>
                    {overnight.name} <small className="muted">{overnight.zh}</small>
                  </strong>
                </div>
                <div className="sleep-price">
                  <strong>~{fmtMoney(nightPrice, cur)}</strong>
                  <span>{stay.label} / night</span>
                </div>
              </div>
              <p className="sleep-blurb">{overnight.blurb}</p>
              {(overnight.overnight === 1 || (d.date && nightFactor(d.date) > 1)) && (
                <div className="a-chips">
                  {overnight.overnight === 1 && <span className="chip warn">Few beds · book ahead</span>}
                  {d.date && nightFactor(d.date) > 1 && <span className="chip">Weekend / holiday rate</span>}
                </div>
              )}
              <div className="sleep-actions">
                {!isRest && (
                  <div className="nights">
                    <span className="nights-label">
                      Extra nights
                      {restHere > 0 && <small>{restHere} rest day{restHere > 1 ? 's' : ''}</small>}
                    </span>
                    <div className="stepper small">
                      <button
                        disabled={restHere === 0}
                        aria-label="One fewer night here"
                        onClick={() => dispatch({ type: 'setRest', stopId: overnight.id, nights: restHere - 1 })}
                      >
                        −
                      </button>
                      <output aria-live="polite">{restHere}</output>
                      <button aria-label="One more night here" onClick={() => dispatch({ type: 'setRest', stopId: overnight.id, nights: restHere + 1 })}>
                        +
                      </button>
                    </div>
                  </div>
                )}
                <a className="btn ghost small" href={bookingSearch(overnight.id, d.date)} target="_blank" rel="noreferrer">
                  Find a stay <IconExternal />
                </a>
              </div>
            </div>
          )}

          {!isRest && (
            <>
              <a className="btn primary block-btn nav-btn" href={googleMapsDirections([d.from, ...d.via])} target="_blank" rel="noreferrer">
                <IconNavigate /> Navigate in Google Maps
              </a>
              <p className="nav-tip">
                <IconInfo /> Pick <b>Avoid highways</b> — scooters can't ride freeways.
              </p>
            </>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * Fast / Scenic (plus the one you ride now, if it's neither) for today, what the other headline route costs next to
 * yours, and every other way to ride the day under "More routes".
 */
function RouteChoice({ opts, onPick }: { opts: DayRouteOption[]; onPick: (o: DayRouteOption) => void }) {
  const [more, setMore] = useState(false);
  const cur = opts.find((o) => o.current) ?? opts[0];
  const headline = opts.filter((o) => o.kind !== 'other' || o.current);
  const others = opts.filter((o) => !headline.includes(o));
  const alt = headline.find((o) => !o.current);
  return (
    <div className="route-choice">
      {headline.length > 1 ? (
        <div className="segmented" role="radiogroup" aria-label="Route for today">
          {headline.map((o) => (
            <button key={o.kind} role="radio" aria-checked={o.current} className={o.current ? 'on' : ''} onClick={() => !o.current && onPick(o)}>
              <span className="rc-label">{kindLabel(o)}</span>
              <span className="rc-meta">{fmtKm(o.km)} · {fmtHours(o.hours)}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="rc-note">You're on the fastest way, and nothing slower is more scenic.</p>
      )}
      {alt && (
        <p className="muted tiny">
          <strong>{kindLabel(alt)}</strong>
          {alt.name && ` · ${alt.name}`}
          <br />
          {diffText(alt, cur)}
          {newTowns(alt, cur)}
        </p>
      )}
      {others.length > 0 && (
        <>
          <button type="button" className="rc-more" aria-expanded={more} onClick={() => setMore(!more)}>
            {more ? 'Fewer routes' : `More routes (${others.length})`}
          </button>
          {more && (
            <ul className="rc-list">
              {others.map((o) => (
                <li key={o.path.join('>')}>
                  <button type="button" onClick={() => onPick(o)}>
                    <strong>{o.name || `Via ${o.path.slice(1, -1).map(stopName).join(', ') || 'the direct road'}`}</strong>
                    <span className="muted small">
                      {fmtKm(o.km)} · {fmtHours(o.hours)} ({diffText(o, cur)}){o.scenic >= 2.4 && ' · very scenic'}
                    </span>
                    {o.long && <span className="rc-flag">Longer than a day at your pace</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function kindLabel(o: DayRouteOption): string {
  return o.kind === 'fast' ? 'Fast' : o.kind === 'scenic' ? 'Scenic' : 'Your route';
}

/** " · via X, Y" for towns `o` passes that `from` doesn't. */
function newTowns(o: DayRouteOption, from: DayRouteOption): string {
  const towns = o.path.filter((x) => !from.path.includes(x));
  return towns.length ? ` · via ${towns.map(stopName).join(', ')}` : '';
}

function diffText(o: DayRouteOption, from: DayRouteOption): string {
  const km = Math.round(o.km - from.km);
  const h = o.hours - from.hours;
  const sign = (n: number) => (n >= 0 ? '+' : '−');
  const dist = km === 0 ? 'same distance' : `${sign(km)}${fmtKm(Math.abs(km))}`;
  // Under ~5 minutes either way reads as the same.
  const time = Math.abs(h) < 1 / 12 ? 'same riding time' : `${sign(h)}${fmtHours(Math.abs(h))}`;
  return `${dist}, ${time}`;
}

function dayRef(d: PlanDay): DayRef {
  return {
    from: d.from,
    to: d.to,
    via: d.via,
    sectionIds: [...new Set(d.legs.map((l) => l.sectionId))],
    bypasses: [...new Set(d.legs.flatMap((l) => (l.bypass ? [l.bypass] : [])))],
  };
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
