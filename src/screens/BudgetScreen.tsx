import { Card, Chips, Field, Note, Segmented } from '../components/ui';
import { CURRENCIES, FOOD_STYLES, STAYS, type FoodStyle, type SeasonMode, type StayTier } from '../data/costs';
import { currencyFor } from '../lib/budget';
import { fmtMoney, fmtTwd } from '../lib/format';
import { useStore } from '../state/store';

export function BudgetScreen() {
  const { settings, budget, plan, update } = useStore();
  const cur = currencyFor(settings.currency);
  const max = Math.max(...budget.lines.map((l) => l.total));

  return (
    <div className="screen">
      <header className="page-head">
        <div className="eyebrow">Estimated trip cost</div>
        <h1 className="display">
          {fmtMoney(budget.total, cur)}
          {cur.code !== 'TWD' && <span className="display-sub"> {fmtTwd(budget.total)}</span>}
        </h1>
        <dl className="kpis">
          <div>
            <dt>per person</dt>
            <dd>{fmtMoney(budget.perPerson, cur)}</dd>
          </div>
          <div>
            <dt>per person / day</dt>
            <dd>{fmtMoney(budget.perPersonPerDay, cur)}</dd>
          </div>
          <div>
            <dt>days / nights</dt>
            <dd>
              {plan.days.length} / {budget.nights}
            </dd>
          </div>
        </dl>
        <p className="muted small">
          Excludes flights. Covers {settings.riders} rider{settings.riders > 1 ? 's' : ''} on {settings.bikes} bike{settings.bikes > 1 ? 's' : ''}.
        </p>
      </header>

      <Card title="Breakdown">
        <ul className="bars">
          {budget.lines.map((l) => (
            <li key={l.id}>
              <div className="bar-head">
                <span>{l.label}</span>
                <strong>{fmtMoney(l.total, cur)}</strong>
              </div>
              <div className="bar"><span style={{ width: `${(l.total / max) * 100}%` }} /></div>
              <div className="muted tiny">{l.detail}</div>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Adjust">
        <Field label="Currency">
          <select className="input" value={settings.currency} onChange={(e) => update({ currency: e.target.value })}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.code} ({c.symbol}){c.code !== 'TWD' ? ` · 1 = NT$${c.twdPer}` : ''}</option>
            ))}
          </select>
        </Field>
        <Field label="Accommodation">
          <Chips<StayTier> label="Accommodation" value={settings.stay} onChange={(stay) => update({ stay })} options={STAYS.map((s) => ({ value: s.id, label: s.label }))} />
        </Field>
        <Field label="Food">
          <Chips<FoodStyle> label="Food" value={settings.food} onChange={(food) => update({ food })} options={FOOD_STYLES.map((f) => ({ value: f.id, label: f.label }))} />
        </Field>
        <Field label="Season pricing" hint={settings.season === 'auto' ? (settings.startDate ? `Based on your start date (×${budget.seasonFactor} rental).` : 'Set a start date on the Trip tab to price by season.') : undefined}>
          <Segmented<SeasonMode>
            label="Season"
            value={settings.season}
            onChange={(season) => update({ season })}
            options={[
              { value: 'auto', label: 'Auto' },
              { value: 'low', label: 'Low' },
              { value: 'peak', label: 'Peak' },
            ]}
          />
        </Field>
      </Card>

      <Card title="Ways to save">
        <ul className="bullets">
          <li>Two riders on one 150cc scooter halves rental and fuel — and a double room costs the same as a single.</li>
          <li>Ask shops for a weekly "環島" rate — 10–30% off is common.</li>
          <li>Ride weekdays: minsu and hotels often jump 20–50% on Fri/Sat and holidays.</li>
          <li>Breakfast shops and lunch boxes (便當) are NT$60–120. Night markets beat restaurants on value.</li>
          <li>Hot-spring foot baths in Jiaoxi and many parks are free.</li>
        </ul>
        <Note>Prices are 2025–26 estimates from research (fuel NT$32.7/L). Exchange rates are approximate.</Note>
      </Card>
    </div>
  );
}
