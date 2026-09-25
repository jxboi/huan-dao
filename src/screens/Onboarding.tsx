import { useState } from 'react';
import { MonthPicker } from '../components/MonthPicker';
import { Choice } from '../components/ui';
import { HUBS } from '../data/sections';
import { STOP_BY_ID } from '../data/stops';
import { fmtHours, fmtKm, stopName } from '../lib/format';
import { PACES, type Pace } from '../state/settings';
import { useStore } from '../state/store';

const STEPS = ['start', 'pace', 'days', 'when'] as const;

/**
 * First-run flow: one question per screen, answers write straight into settings so the numbers
 * shown (km/day, recommended days) are the real planner output. Skipping keeps the defaults.
 */
export function Onboarding() {
  const { settings, plan, update } = useStore();
  const [step, setStep] = useState(0);
  const id = STEPS[step];
  const last = step === STEPS.length - 1;
  const finish = () => update({ onboarded: true });
  const next = () => (last ? finish() : setStep(step + 1));
  const { min, ideal } = plan.recommended;

  return (
    <div className="onboarding">
      <header className="ob-top">
        {step > 0 ? (
          <button className="text-btn" onClick={() => setStep(step - 1)}>
            ‹ Back
          </button>
        ) : (
          <span className="logo">環島</span>
        )}
        <div className="ob-progress" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} aria-label="Setup progress">
          {STEPS.map((s, i) => (
            <i key={s} className={i <= step ? 'on' : ''} />
          ))}
        </div>
        <button className="text-btn muted" onClick={finish}>
          Skip
        </button>
      </header>

      <main className="ob-body" key={id}>
        {id === 'start' && (
          <>
            <div className="eyebrow">Huan Dao planner · 環島</div>
            <h1 className="display">Ride all the way around Taiwan.</h1>
            <p className="ob-lead">Four quick questions and you'll have a day-by-day plan, stays and a budget. First: where do you pick up the bike?</p>
            <Choice<string>
              label="Start and finish"
              columns={2}
              value={settings.startHub}
              onChange={(startHub) => update({ startHub, pinned: [], restDays: {} })}
              options={HUBS.map((h) => ({ value: h, label: stopName(h), detail: STOP_BY_ID[h]?.zh }))}
            />
          </>
        )}

        {id === 'pace' && (
          <>
            <h1 className="display">How much riding a day?</h1>
            <p className="ob-lead">Riding time only — stops for sights and food come on top.</p>
            <Choice<Pace>
              label="Pace"
              value={settings.pace}
              onChange={(pace) => update({ pace })}
              options={(Object.keys(PACES) as Pace[]).map((p) => ({ value: p, label: PACES[p].label, detail: PACES[p].detail }))}
            />
          </>
        )}

        {id === 'days' && (
          <>
            <h1 className="display">How many days do you have?</h1>
            <p className="ob-lead">
              At a {PACES[settings.pace].label.toLowerCase()} pace, {ideal}–{ideal + 3} days works well. Extra days become rest or weather days.
            </p>
            <div className="big-days">
              <output>{settings.days}</output>
              <span>days</span>
            </div>
            <input
              type="range"
              className="range"
              min={3}
              max={30}
              value={settings.days}
              onChange={(e) => update({ days: Number(e.target.value) })}
              aria-label="Trip length in days"
              style={{
                // Shade the recommended range on the track.
                ['--lo' as string]: `${((ideal - 3) / 27) * 100}%`,
                ['--hi' as string]: `${((Math.min(30, ideal + 3) - 3) / 27) * 100}%`,
              }}
            />
            <div className="range-scale">
              <span>3</span>
              <span className="range-hint">green = suggested</span>
              <span>30</span>
            </div>
            <p className={`ob-feedback ${settings.days < min ? 'warn' : ''}`}>
              {settings.days < min
                ? `That's tight — ${min} days is the minimum at this pace, so days will run long.`
                : `≈ ${fmtKm(plan.totalKm / plan.ridingDays)} and ${fmtHours(plan.totalRideHours / plan.ridingDays)} on the bike per riding day${plan.restDays + plan.flexDays > 0 ? `, plus ${plan.restDays + plan.flexDays} day${plan.restDays + plan.flexDays > 1 ? 's' : ''} off` : ''}.`}
            </p>
          </>
        )}

        {id === 'when' && (
          <>
            <h1 className="display">When are you going?</h1>
            <p className="ob-lead">Colours show riding weather. Dates add weekend prices and a weather heads-up.</p>
            <MonthPicker value={settings.startDate} onChange={(startDate) => update({ startDate })} />
          </>
        )}
      </main>

      <footer className="ob-foot">
        <button className="btn primary ob-next" onClick={next}>
          {last ? 'Show my trip' : 'Next'}
        </button>
      </footer>
    </div>
  );
}
