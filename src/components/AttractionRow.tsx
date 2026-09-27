import type { Attraction, AttractionCategory } from '../data/types';
import { fmtHours, fmtTwd, googleMapsPlace, stopName } from '../lib/format';
import { useStore } from '../state/store';
import { IconClock, IconMapPin } from './icons';
import { Warning } from './ui';

export const CATEGORY_LABEL: Record<AttractionCategory, string> = {
  nature: 'Nature',
  viewpoint: 'Viewpoint',
  beach: 'Beach',
  culture: 'Culture',
  temple: 'Temple',
  'hot-spring': 'Hot spring',
  'night-market': 'Night market',
  food: 'Food',
  activity: 'Activity',
  island: 'Island',
};

export function AttractionRow({ a, compact = false, offRoute = false }: { a: Attraction; compact?: boolean; offRoute?: boolean }) {
  const { settings, dispatch } = useStore();
  const saved = settings.saved.includes(a.id);
  const saveBtn = (
    <button
      className={`save ${saved ? 'on' : ''}`}
      onClick={() => dispatch({ type: 'toggleSaved', id: a.id })}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${a.name} from must-sees` : `Save ${a.name} as a must-see`}
    >
      {saved ? '★' : '☆'}
    </button>
  );
  const mapUrl = googleMapsPlace(a.lat, a.lng, a.zh ?? a.name);

  if (compact) {
    // Day card: a scannable tile — name, then chips; map + save as icon buttons.
    return (
      <div className={`attraction tile ${saved ? 'saved' : ''}`}>
        <div className="a-body">
          <div className="a-title">
            <strong>{a.name}</strong> {a.zh && <small className="muted">{a.zh}</small>}
          </div>
          <div className="a-chips">
            <span className={`chip cat cat-${a.category}`}>{CATEGORY_LABEL[a.category]}</span>
            <span className="chip">
              <IconClock /> {a.hours >= 8 ? 'full day+' : fmtHours(a.hours)}
            </span>
            <span className="chip">{a.cost ? `~${fmtTwd(a.cost)}` : 'Free'}</span>
            {a.sideTrip && <span className="chip tag">side trip</span>}
          </div>
        </div>
        <a className="round-btn" href={mapUrl} target="_blank" rel="noreferrer" aria-label={`${a.name} on Google Maps`} title="Open in Google Maps">
          <IconMapPin />
        </a>
        {saveBtn}
      </div>
    );
  }

  return (
    <div className={`attraction ${offRoute ? 'off' : ''}`}>
      <div className="a-body">
        <div className="a-title">
          <strong>{a.name}</strong> {a.zh && <small className="muted">{a.zh}</small>}
        </div>
        <div className="a-meta">
          <span className={`cat cat-${a.category}`}>{CATEGORY_LABEL[a.category]}</span>
          <span>{stopName(a.stopId)}</span>
          <span>{a.hours >= 8 ? 'full day+' : fmtHours(a.hours)}</span>
          <span>{a.cost ? `~${fmtTwd(a.cost)}` : 'Free'}</span>
          {a.sideTrip && <span className="tag">side trip</span>}
          {offRoute && <span className="tag">not on your route</span>}
        </div>
        <p>{a.description}</p>
        {a.tip && <p className="tip">Tip: {a.tip}</p>}
        {a.status && <Warning w={a.status} />}
        <a className="link small" href={mapUrl} target="_blank" rel="noreferrer">
          Map ↗
        </a>
      </div>
      {saveBtn}
    </div>
  );
}
