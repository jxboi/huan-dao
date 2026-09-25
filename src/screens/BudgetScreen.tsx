import { Card, Chips, Field, Note, Segmented, Stat } from '../components/ui';
import { CURRENCIES, FOOD_STYLES, STAYS, type FoodStyle, type SeasonMode, type StayTier } from '../data/costs';
import { CATEGORY_META, currencyFor } from '../lib/budget';
import { fmtMoney, fmtTwd } from '../lib/format';
import { useStore } from '../state/store';

export function BudgetScreen() {
  const { settings, budget, plan, update } = useStore();
  const cur = currencyFor(settings.currency);
  const max = Math.max(...budget.lines.map((l) => l.total));

  return (
    <div className="screen">
      <Card className="hero">
        <div className="hero-title">Estimated trip cost</div>
        <div className="big-number">{fmtMoney(budget.total, cur)}</div>
        {cur.code !== 'TWD' && <div className="muted">{fmtTwd(budget.total)}</div>}
        <div className="stats">
          <Stat value={fmtMoney(budget.perPerson, cur)} label="per person" />
          <Stat value={fmtMoney(budget.perPersonPerDay, cur)} label="per person / day" />
          <Stat value={`${plan.days.length}d / ${budget.nights}n`} label="days / nights" />
        </div>
        <div className="hero-sub">Excludes flights. Covers {settings.riders} rider{settings.riders > 1 ? 's' : ''} on {settings.bikes} bike{settings.bikes > 1 ? 's' : ''}.</div>
      </Card>

      <Card title="Breakdown">
        <ul className="bars">
          {budget.lines.map((l) => (
            <li key={l.id}>
              <div className="bar-head">
                <span>{CATEGORY_META[l.id].icon} {l.label}</span>
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
        <Field label="Season pricing" hint={settings.season === 'auto' ? (settings.startDate ? `Based on your start date (×${budget.seasonFactor} rental).` : 'Set a start date on the Plan tab to price by season.') : undefined}>
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

      <Card title="💡 Ways to save">
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
