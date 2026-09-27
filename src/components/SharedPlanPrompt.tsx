import { useEffect, useMemo, useState } from 'react';
import { fmtDate, fmtKm, stopName } from '../lib/format';
import { makePlan } from '../lib/planner';
import { decodeShare, sameTrip, shareCodeFromHash } from '../lib/share';
import { PACES, type TripSettings } from '../state/settings';
import { useStore } from '../state/store';
import { Sheet } from './Sheet';

/**
 * Handles `#/plan?s=…` links. A first-time visitor gets the shared plan straight away; someone
 * who already has a trip is asked before it's replaced (their packing list is kept either way).
 */
export function SharedPlanPrompt() {
  const { settings, dispatch } = useStore();
  const [incoming, setIncoming] = useState<TripSettings | 'invalid' | null>(null);

  useEffect(() => {
    const check = () => {
      const code = shareCodeFromHash(window.location.hash);
      if (!code) return;
      history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/plan`);
      const shared = decodeShare(code, settings);
      if (!shared) setIncoming('invalid');
      else if (!settings.onboarded) dispatch({ type: 'replace', settings: shared });
      else if (!sameTrip(shared, settings)) setIncoming(shared);
    };
    check();
    window.addEventListener('hashchange', check);
    return () => window.removeEventListener('hashchange', check);
  }, [settings, dispatch]);

  const close = () => setIncoming(null);

  return (
    <Sheet open={incoming !== null} onClose={close} title={incoming === 'invalid' ? "Couldn't open that link" : 'Open shared plan?'}>
      {incoming === 'invalid' ? (
        <p className="muted">The plan link looks incomplete — ask for it again, or copy the whole address.</p>
      ) : (
        incoming && (
          <div className="share-prompt">
            <TripSummary s={incoming} />
            <p className="muted small">This replaces your current trip. Your packing list stays as it is.</p>
            <div className="share-actions">
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  dispatch({ type: 'replace', settings: incoming });
                  close();
                }}
              >
                Use this plan
              </button>
              <button type="button" className="btn ghost" onClick={close}>
                Keep my plan
              </button>
            </div>
          </div>
        )
      )}
    </Sheet>
  );
}

/** One-line description of a trip, for "which plan?" prompts. */
export function TripSummary({ s }: { s: TripSettings }) {
  const km = useMemo(() => makePlan(s).totalKm, [s]);
  return (
    <p className="share-summary">
      <strong>{s.days} days</strong> from {stopName(s.startHub)}, {s.direction === 'ccw' ? 'counter-clockwise' : 'clockwise'} at a {PACES[s.pace].label.toLowerCase()} pace ·{' '}
      {fmtKm(km)}
      {s.startDate ? ` · leaving ${fmtDate(s.startDate)}` : ''}
    </p>
  );
}
