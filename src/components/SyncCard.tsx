import { useCloud, type SyncStatus } from '../state/cloud';
import { useStore } from '../state/store';
import { Sheet } from './Sheet';
import { TripSummary } from './SharedPlanPrompt';

const STATUS_TEXT: Record<SyncStatus, string> = {
  loading: 'Checking sign-in…',
  signedOut: '',
  syncing: 'Syncing…',
  synced: 'Your trip is saved to your account.',
  offline: "Couldn't reach the server. Changes are kept on this device and will sync when you're back online.",
};

/** Sign in with Facebook to keep the trip in sync across devices. Renders nothing when sync isn't configured. */
export function SyncCard() {
  const { available, status, user, error, signIn, signOut, deleteAccount } = useCloud();
  if (!available) return null;

  return (
    <section className="sync-card" aria-labelledby="sync-h">
      <h2 id="sync-h">Your trip on every device</h2>
      {user ? (
        <>
          <div className="sync-user">
            {user.avatar ? <img src={user.avatar} alt="" width={40} height={40} referrerPolicy="no-referrer" /> : <span className="sync-avatar" aria-hidden>{user.name[0]}</span>}
            <div className="sync-who">
              <strong>{user.name}</strong>
              <span className="muted small" role="status">
                {STATUS_TEXT[status]}
              </span>
            </div>
            <button type="button" className="btn ghost small" onClick={signOut}>
              Sign out
            </button>
          </div>
          <p className="small">
            <button
              type="button"
              className="text-btn muted"
              onClick={() => {
                if (confirm('Delete your account and the trip saved in it? Your plan stays on this device.')) deleteAccount();
              }}
            >
              Delete my account
            </button>{' '}
            · <a href="./privacy.html">Privacy</a>
          </p>
        </>
      ) : (
        <>
          <button type="button" className="btn fb" onClick={signIn} disabled={status === 'loading'}>
            <FacebookMark />
            Continue with Facebook
          </button>
          <p className="muted small">
            Sign in to open this plan on your phone and laptop. Without signing in, everything stays on this device. <a href="./privacy.html">Privacy</a>
          </p>
        </>
      )}
      {error && (
        <p className="sync-error small" role="alert">
          Something went wrong: {error}
        </p>
      )}
      <SyncConflictPrompt />
    </section>
  );
}

/** Both this device and the cloud copy changed since the last sync — ask which to keep. */
function SyncConflictPrompt() {
  const { conflict, resolveConflict } = useCloud();
  const { settings } = useStore();
  // Closing without choosing keeps this device's plan (and overwrites the cloud copy).
  return (
    <Sheet open={!!conflict} onClose={() => resolveConflict('device')} title="Which plan should we keep?">
      {conflict && (
        <div className="share-prompt">
          <p className="muted small">Your trip was changed on this device and on another one. Packing-list ticks from both are kept.</p>
          <h3 className="sync-option">Saved in your account</h3>
          <TripSummary s={conflict} />
          <h3 className="sync-option">On this device</h3>
          <TripSummary s={settings} />
          <div className="share-actions">
            <button type="button" className="btn primary" onClick={() => resolveConflict('cloud')}>
              Use account plan
            </button>
            <button type="button" className="btn ghost" onClick={() => resolveConflict('device')}>
              Keep this device's
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

/** Facebook "f" logo (brand asset, white on the brand-blue button). */
function FacebookMark() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"
      />
    </svg>
  );
}
