import { SETTINGS_VERSION, defaultSettings, migrate, type TripSettings } from '../state/settings';

/**
 * Share a plan as a link: the settings that differ from the defaults, as JSON, base64url-encoded
 * into the hash (`#/plan?s=…`). Personal state (packing checklist, onboarding) stays out. Opening
 * a link runs the payload through `migrate()`, so an old or hand-edited link can't break the app.
 */

/** Settings that describe the trip. Everything else in TripSettings is personal. */
const SHARED_KEYS = [
  'days',
  'startDate',
  'startHub',
  'direction',
  'pace',
  'variants',
  'pinned',
  'restDays',
  'vehicle',
  'riders',
  'bikes',
  'stay',
  'food',
  'season',
  'saved',
  'currency',
] as const satisfies readonly (keyof TripSettings)[];

export function encodeShare(s: TripSettings): string {
  const base = defaultSettings();
  const out: Record<string, unknown> = { v: SETTINGS_VERSION };
  for (const k of SHARED_KEYS) {
    if (k === 'variants') {
      const changed = Object.fromEntries(Object.entries(s.variants).filter(([sec, v]) => base.variants[sec] !== v));
      if (Object.keys(changed).length) out.variants = changed;
    } else if (JSON.stringify(s[k]) !== JSON.stringify(base[k])) {
      out[k] = s[k];
    }
  }
  return toBase64Url(JSON.stringify(out));
}

/** Settings from a share code, or null if it isn't one. Personal fields come from `mine`. */
export function decodeShare(code: string, mine: TripSettings = defaultSettings()): TripSettings | null {
  let raw: unknown;
  try {
    raw = JSON.parse(fromBase64Url(code));
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const picked = Object.fromEntries(SHARED_KEYS.filter((k) => k in raw).map((k) => [k, (raw as Record<string, unknown>)[k]]));
  return migrate({ ...defaultSettings(), ...picked, checklist: mine.checklist, onboarded: true });
}

/** The share code in a hash like `#/plan?s=…`, if any. */
export function shareCodeFromHash(hash: string): string | undefined {
  const q = hash.split('?')[1];
  return q ? new URLSearchParams(q).get('s') ?? undefined : undefined;
}

/** Full link to the plan, based on the page's own address (works on any host/path). */
export function shareUrl(s: TripSettings, pageUrl: string): string {
  return `${pageUrl.split('#')[0]}#/plan?s=${encodeShare(s)}`;
}

/** Whether two settings describe the same trip (ignores personal fields). */
export function sameTrip(a: TripSettings, b: TripSettings): boolean {
  return encodeShare(a) === encodeShare(b);
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code: string): string {
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}
