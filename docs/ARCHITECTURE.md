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
- `components/RouteMap.tsx`: Leaflet, OSM tiles, schematic polylines per day, numbered overnight pins.
- Styling: single `styles/app.css`, CSS variables with automatic dark mode.

## Testing
`src/lib/planner.test.ts` covers data integrity (references, closed loop), route direction/rotation/variants,
planner invariants (exact day count, valid overnights, pins, rest/flex days, dates) and budget sanity.
