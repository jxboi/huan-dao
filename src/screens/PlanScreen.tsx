import { useState, type ReactNode } from 'react';
import { FOOD_STYLES, STAYS, VEHICLES, type FoodStyle, type StayTier, type VehicleId } from '../data/costs';
import { HUBS } from '../data/sections';
import { STOP_BY_ID } from '../data/stops';
import { MonthPicker } from '../components/MonthPicker';
import { RouteMap } from '../components/RouteMap';
import { ShareCard } from '../components/ShareCard';
import { Sheet } from '../components/Sheet';
import { IconArrow } from '../components/icons';
import { Choice, Field, Note, Stepper } from '../components/ui';
import { currencyFor } from '../lib/budget';
import { fmtDate, fmtHours, fmtKm, fmtMoney, fmtTwd, stopName } from '../lib/format';
import type { PlanDay } from '../lib/planner';
import { PACES, type Direction, type Pace } from '../state/settings';
import { useStore } from '../state/store';
import type { Tab } from '../App';

type SheetId = 'days' | 'date' | 'hub' | 'direction' | 'pace' | 'ride' | 'stay' | 'food';

const SHEET_TITLES: Record<SheetId, string> = {
  days: 'How many days?',
  date: 'When do you leave?',
  hub: 'Start & finish in',
  direction: 'Which way round?',
  pace: 'How much riding a day?',
  ride: 'Bike & riders',
  stay: 'Where do you sleep?',
  food: 'How do you eat?',
};

const STAY_PHRASE: Record<StayTier, string> = {
  camping: 'campsites',
  dorm: 'hostel dorms',
  budget: 'budget minsu',
  mid: 'mid-range hotels',
  boutique: 'boutique stays',
};

const VEHICLE_PHRASE: Record<VehicleId, string> = {
  scooter125: 'a 125cc scooter',
  scooter150: 'a 150cc scooter',
  electric: 'an electric Gogoro',
  heavy: 'a heavy bike',
  own125: 'my own scooter',
};

const FOOD_PHRASE: Record<FoodStyle, string> = {
  street: 'street food & 7-Eleven',
  mixed: 'a bit of everything',
  foodie: 'like a foodie',
};

const DIRECTION_OPTIONS: { value: Direction; label: string; detail: string }[] = [
  { value: 'ccw', label: '↺ Counter-clockwise', detail: 'West coast first, east coast last — you ride in the sea-side lane on the east coast. Most popular.' },
  { value: 'cw', label: '↻ Clockwise', detail: 'East coast first (Suhua early in the trip), flat west coast to finish.' },
];

export function PlanScreen({ go }: { go: (t: Tab, sub?: string) => void }) {
  const { settings, plan, budget, dispatch } = useStore();
  const [sheet, setSheet] = useState<SheetId | null>(null);
  const cur = currencyFor(settings.currency);
  const start = STOP_BY_ID[settings.startHub];
  const offDays = plan.restDays + plan.flexDays;

  const riders = settings.riders === 1 ? 'Solo' : `${settings.riders} riders${settings.bikes < settings.riders ? ` on ${settings.bikes} bike${settings.bikes > 1 ? 's' : ''}` : ''}`;

  return (
    <div className="screen home">
      <div className="bleed-map">
        <RouteMap plan={plan} height={300} controls={false} />
      </div>

      <header className="home-head">
        <div className="eyebrow">
          環島 · from {start?.zh} {start?.name}
        </div>
        <h1 className="display">{settings.days} days around Taiwan</h1>
        <dl className="kpis">
          <div>
            <dt>distance</dt>
            <dd>{fmtKm(plan.totalKm)}</dd>
          </div>
          <div>
            <dt>per riding day</dt>
            <dd>{fmtHours(plan.totalRideHours / plan.ridingDays)}</dd>
          </div>
          <div>
            <dt>per person</dt>
            <dd>{fmtMoney(budget.perPerson, cur)}</dd>
          </div>
        </dl>
      </header>

      <section className="sentence" aria-label="Your trip — tap a highlighted word to change it">
        A <TokenButton onOpen={() => setSheet('days')}>{settings.days}-day</TokenButton> loop from <TokenButton onOpen={() => setSheet('hub')}>{stopName(settings.startHub)}</TokenButton>, riding{' '}
        <TokenButton onOpen={() => setSheet('direction')}>{settings.direction === 'ccw' ? 'counter-clockwise' : 'clockwise'}</TokenButton> at a{' '}
        <TokenButton onOpen={() => setSheet('pace')}>{PACES[settings.pace].label.toLowerCase()}</TokenButton> pace. <TokenButton onOpen={() => setSheet('ride')}>{riders} on {VEHICLE_PHRASE[settings.vehicle]}</TokenButton>, sleeping in{' '}
        <TokenButton onOpen={() => setSheet('stay')}>{STAY_PHRASE[settings.stay]}</TokenButton> and eating <TokenButton onOpen={() => setSheet('food')}>{FOOD_PHRASE[settings.food]}</TokenButton>. Leaving{' '}
        <TokenButton onOpen={() => setSheet('date')}>{settings.startDate ? fmtDate(settings.startDate) : 'any time'}</TokenButton>.
      </section>

      {plan.notes.map((n) => (
        <Note key={n} tone="warn">{n}</Note>
      ))}

      <section>
        <div className="section-head">
          <h2>
            {plan.ridingDays} riding days{offDays > 0 && <span className="muted"> · {offDays} to rest</span>}
          </h2>
          <button className="text-btn" onClick={() => go('days')}>
            All days <IconArrow />
          </button>
        </div>
        <ol className="day-strip">
          {plan.days.map((d) => (
            <li key={d.day}>
              <DayTile d={d} onOpen={() => go('days', String(d.day))} />
            </li>
          ))}
        </ol>
      </section>

      <nav className="quick-links" aria-label="More">
        <button onClick={() => go('route')}>
          <strong>Tune the route</strong>
          <span>Coast or mountains, section by section</span>
        </button>
        <button onClick={() => go('budget')}>
          <strong>Budget breakdown</strong>
          <span>{fmtMoney(budget.perPerson, cur)} per person, all in</span>
        </button>
        <button onClick={() => go('guide')}>
          <strong>Before you go</strong>
          <span>Licence, road status, typhoons, packing</span>
        </button>
      </nav>

      <ShareCard onPrint={() => go('print')} onPickDate={() => setSheet('date')} />

      <div className="center">
        <button
          className="text-btn muted"
          onClick={() => {
            if (confirm('Reset all trip settings to defaults?')) dispatch({ type: 'reset' });
          }}
        >
          Start over
        </button>
      </div>

      <Sheet open={sheet !== null} onClose={() => setSheet(null)} title={sheet ? SHEET_TITLES[sheet] : ''}>
        {sheet && <SheetContent id={sheet} close={() => setSheet(null)} />}
      </Sheet>
    </div>
  );
}

/** A tappable word in the trip sentence. Defined at module level so it keeps focus identity across renders. */
function TokenButton({ onOpen, children }: { onOpen: () => void; children: ReactNode }) {
  return (
    <button type="button" className="token" onClick={onOpen} aria-haspopup="dialog">
      {children}
    </button>
  );
}

function DayTile({ d, onOpen }: { d: PlanDay; onOpen: () => void }) {
  const from = STOP_BY_ID[d.from];
  const to = STOP_BY_ID[d.to];
  const rest = d.kind === 'rest';
  return (
    <button className={`day-tile ${rest ? 'rest' : ''}`} onClick={onOpen}>
      <span className="day-tile-top">
        <span className="day-tile-num">Day {d.day}</span>
        {d.date && <span>{fmtDate(d.date)}</span>}
      </span>
      {rest ? (
        <>
          <span className="day-tile-zh">{to?.zh}</span>
          <span className="day-tile-route">{d.flex ? 'Flex' : 'Rest'} day in {to?.name}</span>
        </>
      ) : (
        <>
          <span className="day-tile-zh">
            {from?.zh} → {to?.zh}
          </span>
          <span className="day-tile-route">
            {from?.name} → {to?.name}
          </span>
        </>
      )}
      <span className="day-tile-meta">
        {rest ? 'Explore or wait out weather' : `${fmtKm(d.km)} · ${fmtHours(d.hours)}`}
        {d.warnings.some((w) => w.level === 'danger') && <span className="flag"> · check road</span>}
        {d.holiday && <span className="holiday"> · holiday</span>}
      </span>
    </button>
  );
}

function SheetContent({ id, close }: { id: SheetId; close: () => void }) {
  const { settings, plan, update } = useStore();
  const vehicle = VEHICLES.find((v) => v.id === settings.vehicle)!;
  // Single-choice sheets close as soon as you pick, like a native picker.
  const pick = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    close();
  };

  switch (id) {
    case 'days':
      return (
        <Field
          label="Trip length"
          hint={`For a ${PACES[settings.pace].label.toLowerCase()} pace we'd suggest ${plan.recommended.ideal}–${plan.recommended.ideal + 3} days (minimum ${plan.recommended.min}). Extra days become rest or flex days.`}
        >
          <Stepper label="days" value={settings.days} min={3} max={30} suffix="days" onChange={(days) => update({ days })} />
        </Field>
      );
    case 'date':
      return <MonthPicker value={settings.startDate} onChange={(startDate) => update({ startDate })} />;
    case 'hub':
      return (
        <Choice<string>
          label="Start and finish"
          columns={2}
          value={settings.startHub}
          onChange={pick((startHub) => update({ startHub, pinned: [], restDays: {} }))}
          options={HUBS.map((h) => ({ value: h, label: stopName(h), detail: STOP_BY_ID[h]?.zh }))}
        />
      );
    case 'direction':
      return <Choice<Direction> label="Direction" value={settings.direction} onChange={pick((direction) => update({ direction }))} options={DIRECTION_OPTIONS} />;
    case 'pace':
      return (
        <Choice<Pace>
          label="Pace"
          value={settings.pace}
          onChange={pick((pace) => update({ pace }))}
          options={(Object.keys(PACES) as Pace[]).map((p) => ({ value: p, label: PACES[p].label, detail: PACES[p].detail }))}
        />
      );
    case 'ride':
      return (
        <>
          <div className="row-2">
            <Field label="Riders">
              <Stepper label="riders" value={settings.riders} min={1} max={8} onChange={(riders) => update({ riders, bikes: Math.max(Math.ceil(riders / 2), Math.min(settings.bikes, riders)) })} />
            </Field>
            <Field label="Bikes" hint={settings.bikes < settings.riders ? 'Sharing = 2-up riding' : undefined}>
              <Stepper label="bikes" value={settings.bikes} min={Math.ceil(settings.riders / 2)} max={settings.riders} onChange={(bikes) => update({ bikes })} />
            </Field>
          </div>
          <Field label="Vehicle">
            <Choice<VehicleId>
              label="Vehicle"
              columns={2}
              value={settings.vehicle}
              onChange={(vehicle) => update({ vehicle })}
              options={VEHICLES.map((v) => ({ value: v.id, label: v.label, detail: `${v.detail}${v.rentPerDay ? ` · ~${fmtTwd(v.rentPerDay)}/day` : ''}` }))}
            />
          </Field>
          {vehicle.note && <Note tone="warn">{vehicle.note}</Note>}
        </>
      );
    case 'stay':
      return <Choice<StayTier> label="Accommodation" value={settings.stay} onChange={pick((stay) => update({ stay }))} options={STAYS.map((s) => ({ value: s.id, label: s.label, detail: s.detail }))} />;
    case 'food':
      return <Choice<FoodStyle> label="Food style" value={settings.food} onChange={pick((food) => update({ food }))} options={FOOD_STYLES.map((f) => ({ value: f.id, label: f.label, detail: f.detail }))} />;
  }
}
