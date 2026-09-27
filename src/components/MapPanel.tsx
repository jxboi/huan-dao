import { useEffect, useState, type ReactNode } from 'react';

export const DESKTOP = '(min-width: 1024px)';

export function useMedia(query: string) {
  const [on, setOn] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const change = () => setOn(mq.matches);
    mq.addEventListener('change', change);
    return () => mq.removeEventListener('change', change);
  }, [query]);
  return on;
}

/** Desktop layout: a full-height map with a collapsible detail panel on the right. */
export function MapPanel({ map, label, toggleLabel, children }: { map: ReactNode; label: string; toggleLabel: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`map-desk ${open ? 'panel-open' : ''}`}>
      <div className="map-desk-map">{map}</div>
      <button
        type="button"
        className="panel-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="side-panel"
        aria-label={open ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
      >
        <span aria-hidden>{open ? '›' : '‹'}</span>
        {!open && <span className="panel-toggle-label">{toggleLabel}</span>}
      </button>
      <aside id="side-panel" className="side-panel" aria-label={label} inert={!open}>
        {children}
      </aside>
    </div>
  );
}
