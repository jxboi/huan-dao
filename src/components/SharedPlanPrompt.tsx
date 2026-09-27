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

  const km = useMemo(() => (incoming && incoming !== 'invalid' ? makePlan(incoming).totalKm : 0), [incoming]);
  const close = () => setIncoming(null);

  return (
    <Sheet open={incoming !== null} onClose={close} title={incoming === 'invalid' ? "Couldn't open that link" : 'Open shared plan?'}>
      {incoming === 'invalid' ? (
        <p className="muted">The plan link looks incomplete — ask for it again, or copy the whole address.</p>
      ) : (
        incoming && (
          <div className="share-prompt">
            <p className="share-summary">
              <strong>{incoming.days} days</strong> from {stopName(incoming.startHub)}, {incoming.direction === 'ccw' ? 'counter-clockwise' : 'clockwise'} at a{' '}
              {PACES[incoming.pace].label.toLowerCase()} pace · {fmtKm(km)}
              {incoming.startDate ? ` · leaving ${fmtDate(incoming.startDate)}` : ''}
            </p>
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
