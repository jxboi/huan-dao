import { migrate, type TripSettings } from '../state/settings';

/**
 * Cloud sync is a three-way merge between this device's settings, the copy in the cloud and
 * `base` — the canonical form of the settings both sides last agreed on (stored per device).
 * Whichever side still equals `base` hasn't changed, so the other side wins without asking.
 */
export type Reconcile =
  /** Use `settings` locally; push them to the cloud when `upload` is set. */
  | { kind: 'use'; settings: TripSettings; upload: boolean }
  /** Both sides changed since the last sync — let the rider pick. */
  | { kind: 'ask'; remote: TripSettings };

export function reconcile(local: TripSettings, remoteRaw: unknown, base: string | null): Reconcile {
  if (remoteRaw == null) return { kind: 'use', settings: local, upload: true };
  const remote = migrate(remoteRaw);
  const l = canonical(local);
  const r = canonical(remote);
  if (l === r) return { kind: 'use', settings: local, upload: false };
  // A fresh device (still on the first-run questions) takes the cloud plan; an empty cloud takes ours.
  if (!local.onboarded) return { kind: 'use', settings: withChecklist(remote, local), upload: false };
  if (!remote.onboarded) return { kind: 'use', settings: local, upload: true };
  if (base === l) return { kind: 'use', settings: remote, upload: false };
  if (base === r) return { kind: 'use', settings: local, upload: true };
  return { kind: 'ask', remote };
}

/** The chosen plan, with packing-list ticks from both versions kept. */
export function withChecklist(chosen: TripSettings, other: TripSettings): TripSettings {
  const checklist = { ...chosen.checklist };
  for (const [k, v] of Object.entries(other.checklist)) if (v) checklist[k] = true;
  return { ...chosen, checklist };
}

/** JSON with sorted object keys, so key order (Postgres jsonb reorders them) never looks like an edit. */
export function canonical(v: unknown): string {
  return JSON.stringify(sortKeys(v));
}

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, sortKeys((v as Record<string, unknown>)[k])]),
    );
  }
  return v;
}
