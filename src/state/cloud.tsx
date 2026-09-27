import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { canonical, reconcile, withChecklist } from '../lib/sync';
import type { TripSettings } from './settings';
import { useStore } from './store';

/**
 * Optional cloud sync: sign in with Facebook (Supabase Auth) and the trip is kept in the `plans`
 * table (see supabase/migrations). Without Supabase env vars the feature is simply absent and the
 * app stays local-only. The Supabase SDK is loaded lazily so it never delays first paint.
 */

// Vercel's Supabase integration provisions NEXT_PUBLIC_* names; VITE_* works for other hosts.
const env = import.meta.env;
const SUPABASE_URL: string | undefined = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY: string | undefined =
  env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Per-device record of what the cloud held when we last agreed with it (the merge base). */
const SYNC_KEY = 'huandao.sync.v1';
const SAVE_DELAY_MS = 1200;

export type SyncStatus = 'loading' | 'signedOut' | 'syncing' | 'synced' | 'offline';

export interface CloudUser {
  name: string;
  avatar?: string;
}

interface Cloud {
  /** False when no Supabase project is configured — hide all sign-in UI. */
  available: boolean;
  status: SyncStatus;
  user: CloudUser | null;
  error: string;
  /** Both this device and the cloud changed since the last sync. */
  conflict: TripSettings | null;
  signIn: () => void;
  signOut: () => void;
  resolveConflict: (keep: 'cloud' | 'device') => void;
}

const Ctx = createContext<Cloud | null>(null);

let clientPromise: Promise<SupabaseClient> | null = null;
function getClient(): Promise<SupabaseClient> {
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(SUPABASE_URL!, SUPABASE_KEY!, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true } }),
  );
  return clientPromise;
}

function readBase(userId: string): string | null {
  try {
    const v = JSON.parse(localStorage.getItem(SYNC_KEY) ?? 'null');
    return v?.userId === userId && typeof v.base === 'string' ? v.base : null;
  } catch {
    return null;
  }
}

function writeBase(userId: string | null, base: string | null) {
  try {
    if (userId && base) localStorage.setItem(SYNC_KEY, JSON.stringify({ userId, base }));
    else localStorage.removeItem(SYNC_KEY);
  } catch {
    /* storage unavailable — we'll just ask more often */
  }
}

function toUser(s: Session): CloudUser {
  const m = s.user.user_metadata ?? {};
  return { name: m.full_name || m.name || s.user.email || 'Signed in', avatar: m.avatar_url || m.picture };
}

/** OAuth errors come back as ?error=…&error_description=… on our URL. */
function takeUrlError(): string {
  const url = new URL(window.location.href);
  const msg = url.searchParams.get('error_description') || url.searchParams.get('error');
  if (!msg) return '';
  for (const k of ['error', 'error_code', 'error_description']) url.searchParams.delete(k);
  history.replaceState(history.state, '', url.toString());
  return msg;
}

export function CloudProvider({ children }: { children: ReactNode }) {
  const available = !!(SUPABASE_URL && SUPABASE_KEY);
  const { settings, dispatch } = useStore();
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<SyncStatus>(available ? 'loading' : 'signedOut');
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState<TripSettings | null>(null);

  // Refs so async callbacks always see the latest values.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const userId = session?.user.id ?? null;
  /** Set once this session has reconciled with the cloud; saves wait for it. */
  const ready = useRef(false);
  /** Canonical form of the save in flight, so the debounce doesn't queue the same write twice. */
  const saving = useRef<string | null>(null);

  const save = useCallback(async (s: TripSettings, uid: string) => {
    setStatus('syncing');
    saving.current = canonical(s);
    const supabase = await getClient();
    const { error: e } = await supabase.from('plans').upsert({ user_id: uid, settings: s, updated_at: new Date().toISOString() });
    saving.current = null;
    if (e) {
      setStatus('offline');
      return;
    }
    writeBase(uid, canonical(s));
    setStatus('synced');
  }, []);

  /** Pull the cloud copy and merge it with this device's. */
  const pull = useCallback(
    async (uid: string) => {
      setStatus('syncing');
      const supabase = await getClient();
      const { data, error: e } = await supabase.from('plans').select('settings').eq('user_id', uid).maybeSingle();
      if (e) {
        setStatus('offline');
        return;
      }
      const local = settingsRef.current;
      const r = reconcile(local, data?.settings ?? null, readBase(uid));
      if (r.kind === 'ask') {
        setConflict(r.remote);
        return;
      }
      if (r.settings !== local) dispatch({ type: 'replace', settings: r.settings });
      ready.current = true;
      if (r.upload) await save(r.settings, uid);
      else {
        writeBase(uid, canonical(r.settings));
        setStatus('synced');
      }
    },
    [dispatch, save],
  );

  // Session: restore on load (this also completes the OAuth redirect) and follow sign-in/out.
  useEffect(() => {
    if (!available) return;
    const urlError = takeUrlError();
    if (urlError) setError(urlError);
    let unsub = () => {};
    let cancelled = false;
    getClient()
      .then(async (supabase) => {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        setSession(data.session);
        if (!data.session) setStatus('signedOut');
        const sub = supabase.auth.onAuthStateChange((_event, s) => {
          setSession((prev) => (prev?.user.id === s?.user.id && prev?.access_token === s?.access_token ? prev : s));
          if (!s) setStatus('signedOut');
        });
        unsub = () => sub.data.subscription.unsubscribe();
      })
      .catch(() => !cancelled && setStatus('offline'));
    return () => {
      cancelled = true;
      unsub();
    };
  }, [available]);

  // Reconcile whenever a user signs in, and again when the tab comes back (another device may have edited).
  useEffect(() => {
    if (!userId) return;
    ready.current = false;
    pull(userId);
    const again = () => {
      if (document.visibilityState === 'visible' && ready.current) pull(userId);
    };
    document.addEventListener('visibilitychange', again);
    window.addEventListener('online', again);
    return () => {
      document.removeEventListener('visibilitychange', again);
      window.removeEventListener('online', again);
    };
  }, [userId, pull]);

  // Debounced save of local edits.
  useEffect(() => {
    if (!userId || !ready.current) return;
    const c = canonical(settings);
    if (c === readBase(userId) || c === saving.current) return;
    const t = setTimeout(() => save(settings, userId), SAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [settings, userId, save]);

  const signIn = useCallback(async () => {
    setError('');
    const supabase = await getClient();
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: { redirectTo: `${window.location.origin}${window.location.pathname}` },
    });
    if (e) setError(e.message);
  }, []);

  const signOut = useCallback(async () => {
    const supabase = await getClient();
    await supabase.auth.signOut();
    writeBase(null, null);
    ready.current = false;
    setConflict(null);
    setSession(null);
    setStatus('signedOut');
  }, []);

  const resolveConflict = useCallback(
    (keep: 'cloud' | 'device') => {
      if (!conflict || !userId) return;
      const local = settingsRef.current;
      const chosen = keep === 'cloud' ? withChecklist(conflict, local) : withChecklist(local, conflict);
      dispatch({ type: 'replace', settings: chosen });
      setConflict(null);
      ready.current = true;
      save(chosen, userId);
    },
    [conflict, userId, dispatch, save],
  );

  const user = useMemo(() => (session ? toUser(session) : null), [session]);
  const value = useMemo<Cloud>(
    () => ({ available, status, user, error, conflict, signIn, signOut, resolveConflict }),
    [available, status, user, error, conflict, signIn, signOut, resolveConflict],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCloud(): Cloud {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCloud must be used inside <CloudProvider>');
  return c;
}
