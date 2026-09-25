import { FOOD_STYLES, STAYS, VEHICLES, type FoodStyle, type StayTier, type VehicleId } from '../data/costs';
import { WEATHER } from '../data/guide';
import { HUBS } from '../data/sections';
import { Card, Chips, Choice, Field, Note, Segmented, Stat, Stepper } from '../components/ui';
import { currencyFor } from '../lib/budget';
import { fmtHours, fmtKm, fmtMoney, fmtTwd, stopName } from '../lib/format';
import { PACES, type Direction, type Pace } from '../state/settings';
import { useStore } from '../state/store';
import type { Tab } from '../App';

export function PlanScreen({ go }: { go: (t: Tab) => void }) {
  const { settings, plan, budget, update, dispatch } = useStore();
  const cur = currencyFor(settings.currency);
  const month = settings.startDate ? Number(settings.startDate.slice(5, 7)) : 0;
  const weather = WEATHER.find((w) => w.month === month);
  const vehicle = VEHICLES.find((v) => v.id === settings.vehicle)!;

  return (
    <div className="screen">
      <Card className="hero">
        <div className="hero-title">
          Your {settings.days}-day loop from {stopName(settings.startHub)}
        </div>
        <div className="stats">
          <Stat value={fmtKm(plan.totalKm)} label="total" />
          <Stat value={fmtHours(plan.totalRideHours)} label="riding" />
          <Stat value={plan.ridingDays} label="riding days" />
          <Stat value={fmtMoney(budget.perPerson, cur)} label="per person" />
        </div>
        <div className="hero-sub">
          ≈ {fmtKm(plan.totalKm / plan.ridingDays)} &amp; {fmtHours(plan.totalRideHours / plan.ridingDays)} on the bike per riding day
          {plan.restDays + plan.flexDays > 0 && ` · ${plan.restDays + plan.flexDays} rest/flex day${plan.restDays + plan.flexDays > 1 ? 's' : ''}`}
        </div>
        <div className="hero-actions">
          <button className="btn primary" onClick={() => go('days')}>See day by day →</button>
          <button className="btn ghost" onClick={() => go('route')}>Change route</button>
        </div>
      </Card>

      {plan.notes.map((n) => (
        <Note key={n} tone="warn">{n}</Note>
      ))}

      <Card title="📅 When & how long">
        <Field
          label="Trip length"
          hint={`Recommended for a ${PACES[settings.pace].label.toLowerCase()} pace: ${plan.recommended.ideal}–${plan.recommended.ideal + 3} days (minimum ${plan.recommended.min}).`}
        >
          <Stepper label="days" value={settings.days} min={3} max={30} suffix="days" onChange={(days) => update({ days })} />
        </Field>
        <Field label="Start date (optional)" hint={weather ? `${weather.rating === 'best' ? '🌤️' : weather.rating === 'poor' ? '🌀' : '⛅'} ${weather.note}` : 'Adds dates, weekend prices and a weather heads-up.'}>
          <input type="date" className="input" value={settings.startDate} onChange={(e) => update({ startDate: e.target.value })} />
        </Field>
      </Card>

      <Card title="🧭 Start & direction">
        <Field label="Start & finish in">
          <select className="input" value={settings.startHub} onChange={(e) => update({ startHub: e.target.value, pinned: [], restDays: {} })}>
            {HUBS.map((h) => (
              <option key={h} value={h}>{stopName(h)}</option>
            ))}
          </select>
        </Field>
        <Field
          label="Direction"
          hint={
            settings.direction === 'ccw'
              ? 'Counter-clockwise: west coast first, east coast last — you ride in the sea-side lane on the east coast. Most popular.'
              : 'Clockwise: east coast first (Suhua early in the trip), flat west coast to finish.'
          }
        >
          <Segmented<Direction>
            label="Direction"
            value={settings.direction}
            onChange={(direction) => update({ direction })}
            options={[
              { value: 'ccw', label: '↺ Counter-clockwise' },
              { value: 'cw', label: '↻ Clockwise' },
            ]}
          />
        </Field>
      </Card>

      <Card title="⏱️ Pace">
        <Choice<Pace>
          label="Pace"
          value={settings.pace}
          onChange={(pace) => update({ pace })}
          options={(Object.keys(PACES) as Pace[]).map((p) => ({ value: p, label: PACES[p].label, detail: PACES[p].detail }))}
        />
      </Card>

      <Card title="🛵 Bike & riders">
        <div className="row-2">
          <Field label="Riders">
            <Stepper label="riders" value={settings.riders} min={1} max={8} onChange={(riders) => update({ riders, bikes: Math.max(Math.ceil(riders / 2), Math.min(settings.bikes, riders)) })} />
          </Field>
          <Field label="Bikes" hint={settings.bikes < settings.riders ? 'Sharing = 2-up riding' : undefined}>
            <Stepper label="bikes" value={settings.bikes} min={Math.ceil(settings.riders / 2)} max={settings.riders} onChange={(bikes) => update({ bikes })} />
          </Field>
        </div>
        <Choice<VehicleId>
          label="Vehicle"
          columns={2}
          value={settings.vehicle}
          onChange={(vehicle) => update({ vehicle })}
          options={VEHICLES.map((v) => ({
            value: v.id,
            label: v.label,
            detail: `${v.detail}${v.rentPerDay ? ` · ~${fmtTwd(v.rentPerDay)}/day` : ''}`,
          }))}
        />
        {vehicle.note && <Note tone="warn">{vehicle.note}</Note>}
      </Card>

      <Card title="🛏️ Stay & food style">
        <Field label="Where you sleep" hint={STAYS.find((s) => s.id === settings.stay)?.detail}>
          <Chips<StayTier> label="Accommodation" value={settings.stay} onChange={(stay) => update({ stay })} options={STAYS.map((s) => ({ value: s.id, label: s.label }))} />
        </Field>
        <Field label="How you eat" hint={FOOD_STYLES.find((f) => f.id === settings.food)?.detail}>
          <Chips<FoodStyle> label="Food style" value={settings.food} onChange={(food) => update({ food })} options={FOOD_STYLES.map((f) => ({ value: f.id, label: f.label }))} />
        </Field>
        <button className="btn ghost small" onClick={() => go('budget')}>Budget breakdown →</button>
      </Card>

      <Card title="📖 Before you go" action={<button className="btn ghost small" onClick={() => go('guide')}>Guide →</button>}>
        <ul className="bullets">
          <li><strong>Licence:</strong> you need an International Driving Permit that covers motorcycles.</li>
          <li><strong>No freeways:</strong> scooters use provincial highways only — this planner does too.</li>
          <li><strong>Suhua Highway</strong> (Yilan ↔ Hualien) is the toughest stretch; ride it in daylight and check the road status.</li>
          <li><strong>Typhoon season</strong> is May–Oct (peak Jul–Sep): keep a flex day on the east coast.</li>
        </ul>
      </Card>

      <div className="center">
        <button
          className="btn ghost small"
          onClick={() => {
            if (confirm('Reset all trip settings to defaults?')) dispatch({ type: 'reset' });
          }}
        >
          Reset trip
        </button>
      </div>
    </div>
  );
}
