import { useState } from 'react';
import { LEG_GEOMETRY } from '../data/geo/legs';
import { exportFileName, toGpx, toIcs } from '../lib/export';
import { shareUrl } from '../lib/share';
import { useStore } from '../state/store';
import { downloadText } from './download';

/** Share link + exports (calendar, GPX, printable itinerary) for the current plan. */
export function ShareCard({ onPrint, onPickDate }: { onPrint: () => void; onPickDate: () => void }) {
  const { settings, plan } = useStore();
  const [status, setStatus] = useState('');
  const title = `Huan Dao · ${settings.days} days around Taiwan`;

  const share = async () => {
    const url = shareUrl(settings, window.location.href);
    try {
      if (navigator.share) {
        await navigator.share({ title, text: 'My plan to ride around Taiwan', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setStatus('Link copied — anyone who opens it gets this plan.');
    } catch (e) {
      if ((e as Error).name === 'AbortError') return; // share sheet dismissed
      window.prompt('Copy this link:', url);
    }
  };

  const ics = () => {
    const text = toIcs(plan, title, new Date());
    if (text) downloadText(exportFileName(plan, 'ics'), 'text/calendar;charset=utf-8', text);
  };

  return (
    <section className="share-card" aria-labelledby="share-h">
      <h2 id="share-h">Share &amp; take it with you</h2>
      <div className="share-grid">
        <button type="button" className="btn primary" onClick={share}>
          Share plan link
        </button>
        <button type="button" className="btn ghost" onClick={onPrint}>
          Printable itinerary
        </button>
        <button type="button" className="btn ghost" onClick={settings.startDate ? ics : onPickDate}>
          {settings.startDate ? 'Add to calendar (.ics)' : 'Calendar: set a date first'}
        </button>
        <button type="button" className="btn ghost" onClick={() => downloadText(exportFileName(plan, 'gpx'), 'application/gpx+xml', toGpx(plan, title, LEG_GEOMETRY))}>
          Stops for GPS apps (.gpx)
        </button>
      </div>
      <p className="muted small" role="status">
        {status || 'The link holds the whole plan — nothing is uploaded. GPX works in OsmAnd, Organic Maps and most GPS units.'}
      </p>
    </section>
  );
}
