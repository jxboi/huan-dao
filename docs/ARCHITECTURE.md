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
- **Attraction** — a sight/food spot tied to a `stopId`, with hours, cost, category, optional status warning.

## Settings (`src/state/settings.ts`)
`TripSettings` holds everything user-adjustable: days, startDate, startHub, direction, pace, variants, pinned stops,
restDays, vehicle, riders, bikes, stay tier, food style, season mode, saved attractions, currency, checklist.
`migrate()` makes any stored/partial object valid.

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

## Road geometry (`src/data/geo/legs.ts`, `scripts/snap-legs.ts`)
- One Google-encoded polyline per leg, keyed `from>to` in **clockwise** order; counter-clockwise travel reverses it.
- Generated, not hand-written: `npm run snap-legs` routes every leg in `SECTIONS` through an OSRM-compatible server
  (`OSRM_URL`, default the public demo, `exclude=motorway`), simplifies to ~30 m and writes the file. It skips legs that
  already have geometry (`--force` to redo, `--only=a>b,…`, `--dry-run`) and lists legs whose routed km differs from the
  data by >20 % — use that to check `sections.ts` distances. Check new lines on the map: expressways tagged as trunk
  roads can still slip through; pin a road with `VIAS` in the script. A test checks keys are real legs and lines start
  and end within 3 km of their stops.

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
- `src/state/settings.test.ts`: `migrate()` never lets junk through — the planner and budget must run on its output.
