import { defaultSettings, migrate, type TripSettings } from '../state/settings';

/**
 * Share a plan as a URL: `#/plan?s=<base64url JSON>`.
 *
 * Only fields that differ from the defaults are encoded, which keeps links
 * short. The packing checklist is personal and never shared. Decoding runs
 * through `migrate()`, so an old or hand-edited link can't corrupt state.
 */

const PARAM = 's';
const PRIVATE: (keyof TripSettings)[] = ['checklist', 'version'];

export function encodeSettings(settings: TripSettings): string {
  const base = defaultSettings();
  const diff: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(settings) as [keyof TripSettings, unknown][]) {
    if (PRIVATE.includes(k)) continue;
    if (JSON.stringify(v) !== JSON.stringify(base[k])) diff[k] = v;
  }
  if (diff.variants) {
    // Only the sections that differ from their default variant.
    diff.variants = Object.fromEntries(Object.entries(settings.variants).filter(([id, v]) => base.variants[id] !== v));
  }
  return toBase64Url(JSON.stringify(diff));
}

/** Returns the shared settings, or undefined when the string isn't a valid share code. */
export function decodeSettings(code: string): TripSettings | undefined {
  try {
    const raw: unknown = JSON.parse(fromBase64Url(code));
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
    return migrate({ ...(raw as object), checklist: {} });
  } catch {
    return undefined;
  }
}

/** Full share URL for the page at `href` (current location in the app). */
export function shareUrl(href: string, settings: TripSettings): string {
  const url = new URL(href);
  url.hash = `/plan?${PARAM}=${encodeSettings(settings)}`;
  return url.toString();
}

/** Extracts the share code from a location hash like `#/plan?s=…`. */
export function shareCodeFromHash(hash: string): string | undefined {
  const q = hash.indexOf('?');
  if (q < 0) return undefined;
  return new URLSearchParams(hash.slice(q + 1)).get(PARAM) ?? undefined;
}

function toBase64Url(text: string): string {
  let bin = '';
  for (const b of new TextEncoder().encode(text)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code: string): string {
  const bin = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}
