import type { Attraction, AttractionCategory } from '../data/types';
import { fmtHours, fmtTwd, googleMapsPlace, stopName } from '../lib/format';
import { useStore } from '../state/store';
import { Warning } from './ui';

export const CATEGORY_ICON: Record<AttractionCategory, string> = {
  nature: '🌿',
  viewpoint: '🔭',
  beach: '🏖️',
  culture: '🏛️',
  temple: '⛩️',
  'hot-spring': '♨️',
  'night-market': '🏮',
  food: '🍜',
  activity: '🪂',
  island: '🏝️',
};

export function AttractionRow({ a, compact = false, offRoute = false }: { a: Attraction; compact?: boolean; offRoute?: boolean }) {
  const { settings, dispatch } = useStore();
  const saved = settings.saved.includes(a.id);
  return (
    <div className={`attraction ${compact ? 'compact' : ''} ${offRoute ? 'off' : ''}`}>
      <span className="a-icon" aria-hidden>{CATEGORY_ICON[a.category]}</span>
      <div className="a-body">
        <div className="a-title">
          <strong>{a.name}</strong> {a.zh && <small className="muted">{a.zh}</small>}
        </div>
        <div className="a-meta">
          {!compact && <span>{stopName(a.stopId)}</span>}
          <span>{a.hours >= 8 ? 'full day+' : fmtHours(a.hours)}</span>
          <span>{a.cost ? `~${fmtTwd(a.cost)}` : 'Free'}</span>
          {a.sideTrip && <span className="tag">side trip</span>}
          {offRoute && <span className="tag">not on your route</span>}
        </div>
        {!compact && <p>{a.description}</p>}
        {a.tip && !compact && <p className="tip">💡 {a.tip}</p>}
        {a.status && !compact && <Warning w={a.status} />}
        <a className="link small" href={googleMapsPlace(a.lat, a.lng, a.zh ?? a.name)} target="_blank" rel="noreferrer">
          Map ↗
        </a>
      </div>
      <button
        className={`save ${saved ? 'on' : ''}`}
        onClick={() => dispatch({ type: 'toggleSaved', id: a.id })}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${a.name} from must-sees` : `Save ${a.name} as a must-see`}
      >
        {saved ? '★' : '☆'}
      </button>
    </div>
  );
}
