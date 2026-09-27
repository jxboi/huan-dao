# Architecture

```
          ┌──────────── src/data (typed content) ────────────┐
          │ stops.ts  sections.ts  attractions.ts            │
          │ costs.ts  guide.ts     types.ts                  │
          └───────────────┬──────────────────────────────────┘
                          │ pure functions
TripSettings ──► lib/route.ts ──► lib/planner.ts ──► Plan ──► lib/budget.ts ──► Budget
     ▲                                                  │                         │
     │ dispatch(action)                                 ▼                         ▼
state/store.tsx (useReducer + localStorage) ───► React context ───► screens/*  (read plan/budget)
```

## Data model (`src/data/types.ts`)
- **Stop** — a town. `overnight` 0–3 controls whether/how much the planner likes sleeping there. `lodgingFactor`
  scales accommodation prices.
- **Section** — part of the loop between two hubs (Taipei, Yilan, Hualien, Taitung, Kenting, Kaohsiung, Tainan,
  Chiayi, Taichung, Hsinchu). Listed clockwise; each has ≥1 **Variant**.
- **Variant** — a named way to ride a section: ordered **Legs** (`to`, `km`, `speed`, `road`, `scenic`, `warnings`).
- **Link** (`links.ts`) — a road between two stops that no preset uses; with every preset leg it forms the road
  network custom routes are built from.
- **Attraction** — a sight/food spot tied to a `stopId`, with hours, cost, category, optional status warning.

## Settings (`src/state/settings.ts`)
`TripSettings` holds everything user-adjustable: days, startDate, startHub, direction, pace, variants, customRoutes, pinned stops,
restDays, vehicle, riders, bikes, stay tier, food style, season mode, saved attractions, currency, checklist.
`migrate()` makes any stored/partial object valid.

## Custom routes (`src/lib/network.ts`, `src/lib/editRoute.ts`)
- `network.ts` builds an undirected graph from every leg of every variant plus `LINKS` (a road stored both ways round,
  like taipei>tamsui / tamsui>taipei, keeps both). `shortestPath` is Dijkstra by km, cached.
- A section with `variants[id] === 'custom'` rides `customRoutes[id]` (your stops, clockwise): `customVariant` chains
  section.from → stops → section.to with shortest paths and returns an ordinary `Variant`, so `route.ts`, the planner,
  maps and exports need no special cases. A preset's own stops rebuild that preset exactly (tested).
- A route is "bad" if it doubles back through a stop or passes another section's hub (the shortest way to a far-off
  town is often most of the way round the island). Inserting picks the slot that adds the fewest km, avoiding bad routes.
- `changeDayEnd` ("Change destination" on a day card): moves the pin and rest days from the old end to the new one, pins
  the day's start; if the town isn't on the route, drops the old end and places the new one in today's sections or
  the next, dropping stops you'd pass today that became detours (unless pinned, resting there or with saved sights).
  `dayEndOptions` lists only towns that fit that way.

## Planner details (`src/lib/planner.ts`)
1. **Load**: for each point, cumulative ride hours + hours for saved (non side-trip) attractions at that stop.
2. **Riding days R** = min(available days, ⌈load / pace.min⌉ (never fewer than ⌈load/pace.max⌉), # possible
   overnight points), and ≥ pinned + 1.
3. **DP** `splitDays`: `dp[d][j]` = min cost of ending day *d* at point *j*; cost = (dayLoad − even)² +
   4·(overflow past pace.max)² + overnight penalty (score 3→0, 2→0.6, 1→2.5, 0→∞). Pinned points can't be skipped.
4. **Rest days**: user rest days after arriving at that stop; surplus days → flex days at highest-scoring towns.
5. Each `PlanDay` gets legs, via stops, de-duplicated warnings and attractions (saved first, then highlights;
   rest days show everything incl. side trips).

## UI
- `App.tsx`: hash routing (`#/plan`, `#/route`, `#/days`, `#/explore`, `#/budget`, `#/guide`), sticky top bar with
  running summary, bottom tab bar.
- `components/ui.tsx`: Card, Stepper, Segmented, Choice, Chips, Field, Stat, Warning, Note, Dots.
- `components/Sheet.tsx`: bottom sheet on native `<dialog>` (used by the Trip tab's tappable sentence).
- `components/MonthPicker.tsx`: weather-coloured month strip + exact-day input (Trip date sheet, onboarding); date maths in `lib/dates.ts`.
- `screens/Onboarding.tsx`: first-run questions, shown while `settings.onboarded` is false (reset shows it again).
- `components/icons.tsx`: inline SVG line icons (tab bar, top bar) — no emoji in chrome.
- `components/leaflet.ts`: shared base map (OSM tiles) + route colours; `components/ExploreMap.tsx`: attraction dots for Explore's map view.
- `components/RouteMap.tsx`: Leaflet, OSM tiles, a polyline per day, numbered overnight pins. Lines come from
  `lib/geo.ts#pathThrough`: road-snapped geometry from `data/geo/legs.ts` where it exists, straight stop-to-stop otherwise.

## Share & export (`src/lib/share.ts`, `src/lib/export.ts`)
- Share link: `#/plan?s=<base64url JSON>` with only the trip fields that differ from `defaultSettings()` (not the
  checklist or onboarding). Decoding always goes through `migrate()`. `components/SharedPlanPrompt.tsx` applies it
  directly for first-time visitors and asks anyone with an existing trip, then strips the code from the URL.
  If you add a trip field to `TripSettings`, add it to `SHARED_KEYS` too.
- `toIcs` (RFC 5545: CRLF, 75-octet folding, escaping; stable UIDs so re-importing updates events) and `toGpx` are pure;
  `components/download.ts` saves the text. `screens/PrintScreen.tsx` (`#/print`, outside the tab bar) is the whole
  plan as text for printing or saving as PDF.

## Cloud sync (`src/state/cloud.tsx`, `src/lib/sync.ts`)
- Optional. Enabled only when `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set (or the `NEXT_PUBLIC_SUPABASE_*`
  names Vercel's Supabase integration provisions — `vite.config.ts` exposes the `NEXT_PUBLIC_` prefix). Otherwise the
  sign-in card doesn't render and the SDK is never downloaded (it's a lazy `import()` chunk).
- Sign-in: Supabase Auth, Facebook provider, PKCE redirect back to the app's own URL (hash routing is untouched; the
  SDK strips `?code=`; `?error_description=` is shown on the card).
- Storage: table `plans (user_id pk, settings jsonb, updated_at)` with owner-only RLS —
  `supabase/migrations/20260927000000_plans.sql`. Cloud settings always go through `migrate()` on the way in.
- Merge (`reconcile`, pure + tested): each device keeps `huandao.sync.v1` = the canonical JSON both sides last agreed
  on. If only one side differs from it, that side wins silently; if both changed, `SyncConflictPrompt` asks which to keep
  (packing ticks from both are kept). Pulls on sign-in, tab refocus and `online`; local edits upsert after 1.2 s.
- Setup: create a Facebook app (Facebook Login → valid OAuth redirect URI =
  `https://<project>.supabase.co/auth/v1/callback`); in Supabase enable the Facebook provider with its App ID/secret,
  add the app's URLs (incl. `http://localhost:5173/`) to Auth → URL Configuration → Redirect URLs, run the migrations.
- UI (`components/Account.tsx`): `AccountButton` in the top bar on every tab ("Sign in", or your photo with a sync
  status dot) opens the account sheet; `SyncNudge` is a dismissible prompt on the Trip screen for signed-out riders
  (dismissal kept in `huandao.syncNudge.dismissed`).
- Account deletion: "Delete my account" calls the `delete_my_account()` RPC (security definer, deletes the caller's
  `auth.users` row; `plans` cascades). Facebook's required pages are static files in `public/`: `privacy.html`,
  `data-deletion.html` (+ `icon-1024.png` for the app icon). Keep them accurate if what's collected changes.

## Road geometry (`src/data/geo/legs.ts`, `scripts/snap-legs.ts`)
- One Google-encoded polyline per leg, keyed `from>to` in **clockwise** order; counter-clockwise travel reverses it.
- Generated, not hand-written: `npm run snap-legs` routes every leg in `SECTIONS` through an OSRM-compatible server
  (`OSRM_URL`, default the public demo, `exclude=motorway`) or, with `VALHALLA_URL` set, Valhalla's `motor_scooter`
  costing (no motorways, honours scooter access tags — preferred), simplifies to ~30 m and writes the file. It skips legs that
  already have geometry (`--force` to redo, `--only=a>b,…`, `--dry-run`) and lists legs whose routed km differs from the
  data by >20 % — use that to check `sections.ts` distances. Pin a road with `VIAS` in the script. A test checks keys are
  real legs and lines start and end within 3 km of their stops.
- **Scooter-rule guard.** Every line is map-matched with Valhalla `trace_attributes` into the roads it follows (names/refs,
  OSM road class, tunnel, km), written to `src/data/geo/legRoads.ts` with a fingerprint of the line (test-only, not
  bundled). `src/data/scooterRules.ts` holds the rules white-plate scooters ride by (freeways; trunk-class expressways
  and Taipei elevated roads; Suhua Improved Highway tunnels except Renshui/Zhongren), with sources in research/02; logic
  is in `src/lib/roadCheck.ts`. `snap-legs` won't save a newly routed line that breaks a rule (`--allow-banned` to
  override), and `src/data/scooterRules.test.ts` fails on: a banned road, stale road data (`--roads-only` re-checks lines
  without re-routing), or a line under 50 % on the roads its `road` string names (known exceptions in `OFF_NAMED_ROADS`,
  which may only improve). OSM often doesn't tag Taiwan's scooter bans, which is why the rules exist.

## Holidays (`src/data/holidays.ts`, `src/lib/holidays.ts`)
- Breaks as inclusive date ranges (weekends included) per year in `HOLIDAY_YEARS`; `derived: true` marks ranges worked
  out from the Saturday/Sunday make-up rule rather than read from the calendar.
- Planner: `PlanDay.holiday` + plan notes for overlapping breaks, and a note when the trip's year isn't covered.
- Budget: `nightFactor(date)` = max(weekend uplift, holiday uplift for the night before a day off); rental days inside a
  Lunar New Year / long-weekend break use the peak rate in auto season mode.
- Styling: single `styles/app.css`, CSS variables with automatic dark mode.

## Testing
- `src/lib/planner.test.ts`: references, closed loop, planner invariants (exact day count, valid overnights, pins,
  rest/flex days, dates) and budget/migration smoke tests.
- `src/data/data.test.ts`: coordinates on Taiwan, legs no shorter than the straight line, plausible speeds, attractions
  near their stop.
- `src/lib/route.test.ts`: every hub × direction, ccw is exactly cw reversed for every variant, time formula.
- `src/lib/budget.test.ts`: each line's arithmetic, discounts, season, weekend/holiday pricing.
- `src/lib/holidays.test.ts`, `src/lib/geo.test.ts`: calendar data + lookups; polyline codec, simplification, leg paths.
- `src/lib/share.test.ts`, `src/lib/export.test.ts`: link round-trip/sanitising; iCalendar and GPX format.
- `src/state/settings.test.ts`: `migrate()` never lets junk through — the planner and budget must run on its output.
