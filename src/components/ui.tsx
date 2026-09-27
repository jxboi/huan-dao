import type { ReactNode } from 'react';
import type { RoadWarning } from '../data/types';

/** Small, dependency-free UI primitives. Styling lives in styles/app.css. */

export function Card({ children, className = '', title, action }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <header className="card-head">
          {title && <h2>{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stepper({ value, min, max, onChange, label, suffix }: { value: number; min: number; max: number; onChange: (n: number) => void; label: string; suffix?: string }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
      <output aria-live="polite">
        <strong>{value}</strong>
        {suffix && <span> {suffix}</span>}
      </output>
      <button type="button" aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}

export interface Option<T extends string> {
  value: T;
  label: ReactNode;
  detail?: ReactNode;
}

/** Segmented control for 2–4 short options. */
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: Option<T>[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Stacked option cards with a title + detail line. */
export function Choice<T extends string>({ value, options, onChange, label, columns = 1 }: { value: T; options: Option<T>[]; onChange: (v: T) => void; label: string; columns?: 1 | 2 }) {
  return (
    <div className={`choices cols-${columns}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} className={`choice ${o.value === value ? 'on' : ''}`} onClick={() => onChange(o.value)}>
          <span className="choice-label">{o.label}</span>
          {o.detail && <span className="choice-detail">{o.detail}</span>}
        </button>
      ))}
    </div>
  );
}

export function Chips<T extends string>({ value, options, onChange, label }: { value: T; options: Option<T>[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="chips" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} className={`chip ${o.value === value ? 'on' : ''}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="field">
      <div className="field-label">{label}</div>
      {children}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

const WARN_MARK = { info: 'i', caution: '!', danger: '!' } as const;

export function Warning({ w }: { w: RoadWarning }) {
  return (
    <div className={`warning ${w.level}`}>
      <span className="warn-mark" aria-hidden>
        {WARN_MARK[w.level]}
      </span>
      <div>
        {w.text}
        {(w.url || w.checked) && (
          <div className="warning-meta">
            {w.checked && <span>Checked {w.checked}. </span>}
            {w.url && (
              <a href={w.url} target="_blank" rel="noreferrer">
                Official status ↗
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function Note({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'tip' | 'warn' }) {
  return <div className={`note ${tone}`}>{children}</div>;
}

export function Dots({ n, of = 3, label }: { n: number; of?: number; label: string }) {
  return (
    <span className="dots" aria-label={`${label}: ${n} of ${of}`} title={`${label}: ${n}/${of}`}>
      {Array.from({ length: of }, (_, i) => (
        <i key={i} className={i < n ? 'on' : ''} />
      ))}
    </span>
  );
}
