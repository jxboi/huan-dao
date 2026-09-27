import { useEffect, useState } from 'react';
import { useCloud, type CloudUser, type SyncStatus } from '../state/cloud';
import { useStore } from '../state/store';
import { IconUser } from './icons';
import { Sheet } from './Sheet';
import { TripSummary } from './SharedPlanPrompt';

/**
 * Sign in with Facebook to sync the trip across devices. The entry point is the account button in
 * the top bar (every tab); the Trip screen adds a one-time nudge. Everything renders nothing when
 * sync isn't configured.
 */

const STATUS_TEXT: Record<SyncStatus, string> = {
  loading: 'Checking sign-in…',
  signedOut: '',
  syncing: 'Syncing…',
  synced: 'Your trip is saved to your account.',
  offline: "Couldn't reach the server. Changes are kept on this device and will sync when you're back online.",
};

const STATUS_LABEL: Record<SyncStatus, string> = {
  loading: 'Account',
  signedOut: 'Sign in',
  syncing: 'Syncing',
  synced: 'Synced',
  offline: 'Offline',
};

const NUDGE_KEY = 'huandao.syncNudge.dismissed';

/** Top-bar button: "Sign in" when signed out, your photo with a sync-status dot when signed in. */
export function AccountButton() {
  const { available, status, user, error } = useCloud();
  const [open, setOpen] = useState(false);
  // A failed OAuth redirect comes back with an error — show it where the rider can act on it.
  useEffect(() => {
    if (error) setOpen(true);
  }, [error]);
  if (!available) return null;

  return (
    <>
      <button
        type="button"
        className={`icon-btn account-btn ${user ? 'signed-in' : ''}`}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={user ? `Account: ${user.name}, ${STATUS_LABEL[status].toLowerCase()}` : 'Sign in to sync your trip'}
      >
        {user ? (
          <span className="account-face">
            <Avatar user={user} size={24} />
            <span className={`status-dot ${status}`} aria-hidden />
          </span>
        ) : (
          <IconUser />
        )}
        <span>{STATUS_LABEL[status]}</span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={user ? 'Your account' : 'Save your trip'}>
        <AccountPanel />
      </Sheet>
    </>
  );
}

/** Trip-screen prompt for signed-out riders. Dismissed for good on this device with ✕. */
export function SyncNudge() {
  const { available, status, signIn } = useCloud();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(NUDGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  if (!available || status !== 'signedOut' || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(NUDGE_KEY, '1');
    } catch {
      /* private mode — hides for this visit only */
    }
  };

  return (
    <aside className="sync-nudge" aria-label="Sync your trip">
      <div className="sync-nudge-text">
        <strong>Plan on your laptop, ride with your phone</strong>
        <span>Sign in to keep this trip on all your devices.</span>
      </div>
      <button type="button" className="btn fb small" onClick={signIn}>
        <FacebookMark size={16} />
        Sign in
      </button>
      <button type="button" className="sync-nudge-close" onClick={dismiss} aria-label="Dismiss">
        ×
      </button>
    </aside>
  );
}

function AccountPanel() {
  const { status, user, error, signIn, signOut, deleteAccount } = useCloud();

  if (!user) {
    return (
      <div className="account-panel">
        <ul className="account-perks">
          <li>Open the same trip on your phone and laptop</li>
          <li>Changes save automatically as you plan</li>
          <li>Keep your packing list ticks everywhere</li>
        </ul>
        <button type="button" className="btn fb" onClick={signIn} disabled={status === 'loading'}>
          <FacebookMark />
          Continue with Facebook
        </button>
        <p className="muted small">
          We get your name, photo and email — nothing is ever posted to Facebook. Without signing in, everything stays on this device.{' '}
          <a href="./privacy.html">Privacy</a>
        </p>
        {error && <ErrorNote error={error} />}
      </div>
    );
  }

  return (
    <div className="account-panel">
      <div className="sync-user">
        <Avatar user={user} size={48} />
        <div className="sync-who">
          <strong>{user.name}</strong>
          <span className="muted small" role="status">
            {STATUS_TEXT[status]}
          </span>
        </div>
      </div>
      {error && <ErrorNote error={error} />}
      <button type="button" className="btn ghost" onClick={signOut}>
        Sign out
      </button>
      <p className="small center">
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
    </div>
  );
}

function ErrorNote({ error }: { error: string }) {
  return (
    <p className="sync-error small" role="alert">
      Something went wrong: {error}
    </p>
  );
}

function Avatar({ user, size }: { user: CloudUser; size: number }) {
  return user.avatar ? (
    <img className="avatar" src={user.avatar} alt="" width={size} height={size} referrerPolicy="no-referrer" />
  ) : (
    <span className="avatar avatar-letter" style={{ width: size, height: size, fontSize: size * 0.45 }} aria-hidden>
      {user.name[0]}
    </span>
  );
}

/** Both this device and the cloud copy changed since the last sync — ask which to keep. */
export function SyncConflictPrompt() {
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
function FacebookMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"
      />
    </svg>
  );
}
