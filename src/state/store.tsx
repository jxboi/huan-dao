import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { makeBudget, type Budget } from '../lib/budget';
import { makePlan, type Plan } from '../lib/planner';
import { defaultSettings, migrate, type TripSettings } from './settings';

const STORAGE_KEY = 'huandao.settings.v1';

type Action =
  | { type: 'update'; patch: Partial<TripSettings> }
  | { type: 'setVariant'; sectionId: string; variantId: string }
  | { type: 'toggleSaved'; id: string }
  | { type: 'togglePin'; stopId: string }
  | { type: 'setRest'; stopId: string; nights: number }
  | { type: 'toggleCheck'; item: string }
  | { type: 'reset' };

function reducer(s: TripSettings, a: Action): TripSettings {
  switch (a.type) {
    case 'update':
      return migrate({ ...s, ...a.patch });
    case 'setVariant':
      return { ...s, variants: { ...s.variants, [a.sectionId]: a.variantId } };
    case 'toggleSaved':
      return { ...s, saved: s.saved.includes(a.id) ? s.saved.filter((x) => x !== a.id) : [...s.saved, a.id] };
    case 'togglePin': {
      const pinned = s.pinned.includes(a.stopId) ? s.pinned.filter((x) => x !== a.stopId) : [...s.pinned, a.stopId];
      const restDays = { ...s.restDays };
      if (!pinned.includes(a.stopId)) delete restDays[a.stopId];
      return { ...s, pinned, restDays };
    }
    case 'setRest': {
      const restDays = { ...s.restDays };
      if (a.nights > 0) restDays[a.stopId] = a.nights;
      else delete restDays[a.stopId];
      // A rest day adds a day to the trip so the rest of the plan isn't squeezed.
      const delta = (restDays[a.stopId] ?? 0) - (s.restDays[a.stopId] ?? 0);
      const pinned = s.pinned.includes(a.stopId) || a.nights <= 0 ? s.pinned : [...s.pinned, a.stopId];
      return migrate({ ...s, restDays, pinned, days: s.days + delta });
    }
    case 'toggleCheck':
      return { ...s, checklist: { ...s.checklist, [a.item]: !s.checklist[a.item] } };
    case 'reset':
      return defaultSettings();
  }
}

function load(): TripSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? migrate(JSON.parse(raw)) : defaultSettings();
  } catch {
    return defaultSettings();
  }
}

interface Store {
  settings: TripSettings;
  plan: Plan;
  budget: Budget;
  dispatch: (a: Action) => void;
  update: (patch: Partial<TripSettings>) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [settings, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* storage unavailable (private mode) — app still works in-memory */
    }
  }, [settings]);

  const plan = useMemo(() => makePlan(settings), [settings]);
  const budget = useMemo(() => makeBudget(settings, plan), [settings, plan]);
  const update = useCallback((patch: Partial<TripSettings>) => dispatch({ type: 'update', patch }), []);

  const value = useMemo(() => ({ settings, plan, budget, dispatch, update }), [settings, plan, budget, update]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside <StoreProvider>');
  return s;
}
