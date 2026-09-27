import { useState } from 'react';
import { STOP_BY_ID } from '../data/stops';
import { Sheet } from './Sheet';

export interface StopOption {
  id: string;
  /** e.g. "+34 km" or "112 km from Hsinchu". */
  detail?: string;
  /** Short badge, e.g. "on your route". */
  tag?: string;
}

/** Bottom sheet listing towns to pick from, with a name search (English or 中文). Picking closes it. */
export function StopPicker({
  open,
  onClose,
  title,
  hint,
  options,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  hint?: string;
  options: StopOption[];
  onPick: (id: string) => void;
}) {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const shown = options.filter((o) => {
    const s = STOP_BY_ID[o.id];
    return !needle || s.name.toLowerCase().includes(needle) || s.zh.includes(q.trim());
  });
  const close = () => {
    setQ('');
    onClose();
  };

  return (
    <Sheet open={open} onClose={close} title={title}>
      {hint && <p className="muted small">{hint}</p>}
      <input className="input" type="search" placeholder="Search towns" aria-label="Search towns" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="choices stop-picker">
        {shown.map((o) => {
          const s = STOP_BY_ID[o.id];
          return (
            <button
              key={o.id}
              type="button"
              className="choice"
              onClick={() => {
                onPick(o.id);
                close();
              }}
            >
              <span className="choice-label">
                {s.name} <small className="muted">{s.zh}</small>
                {o.tag && <span className="stop-tag">{o.tag}</span>}
              </span>
              {o.detail && <span className="choice-detail">{o.detail}</span>}
            </button>
          );
        })}
        {shown.length === 0 && <p className="muted small">No town matches "{q}". The app only knows the towns on its map.</p>}
      </div>
    </Sheet>
  );
}
