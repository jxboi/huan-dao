# CLAUDE.md — handoff guide for AI contributors

You are continuing work on **Huan Dao Planner**, a mobile-first React + TypeScript + Vite app that plans a
motorbike loop around Taiwan. Read this file, then `docs/ARCHITECTURE.md` and `docs/ROADMAP.md`.

## Ground rules
1. **Data lives in `src/data/`, logic in `src/lib/`, UI in `src/screens/` + `src/components/`.** Keep lib functions pure
   (no React, no DOM) so they stay testable.
2. **Every fact/number should trace to `research/`.** If you add or change data (prices, road status, distances),
   update the matching research note and its "last checked" date. Road status is time-sensitive — mark with `checked`.
3. **Mobile first.** Design at 390 px wide; tap targets ≥ 40 px; bottom tab bar is the primary nav.
4. **Don't break saved state.** User settings persist in localStorage (`huandao.settings.v1`). If you change
   `TripSettings`, extend `migrate()` in `src/state/settings.ts` (and bump `SETTINGS_VERSION` if the shape changes
   incompatibly).
5. **Stay dependency-light.** Current runtime deps: react, react-dom, leaflet. Justify new ones.
6. Before committing: `npm run typecheck && npm test && npm run build`.

## How the planner works (short)
- `lib/route.ts` rotates/reverses `SECTIONS` for the chosen start hub & direction and flattens chosen variants into
  an ordered list of stops + legs with km and hours (`km / speed × 1.15`).
- `lib/planner.ts` decides the number of riding days from trip days, rest days and pace (`PACES` min/target/max),
  then splits the route with dynamic programming minimising squared deviation from an even daily load
  (ride hours + hours at saved attractions), only ending days at stops with `overnight > 0`, honouring pins.
  Surplus days become "flex days" at the best towns.
- `lib/budget.ts` prices the plan (rental × season × weekly discount, fuel from km/L, lodging per overnight town
  with `lodgingFactor` and weekend uplift, food/day, saved attraction tickets, extras, 10 % contingency).

## Adding content
- **New town**: add to `STOPS` (id, zh name, lat/lng, region, overnight score 0–3, lodgingFactor, blurb, food).
- **New route variant**: add a `Variant` to the right `Section` in `sections.ts`; legs are listed **clockwise**,
  last leg must end at the section's `to` hub. Tests enforce this.
- **New holiday year**: append breaks to `HOLIDAYS` and the year to `HOLIDAY_YEARS` in `src/data/holidays.ts`; update the
  table in `research/08`.
- **Road geometry**: `npm run snap-legs` (see `docs/ARCHITECTURE.md`). After adding/changing legs, re-run it for those legs.
- **New attraction**: add to `ATTRACTIONS` with `stopId` of the nearest stop. `highlight: true` shows it by default on
  the day; `sideTrip: true` for things needing extra time (islands, gorges).
- Run `npm test` — data-integrity tests catch broken references.

## Known limitations / good next tasks
See `docs/ROADMAP.md`. Highest value next steps:
1. ~~Share/export~~ done (share link, print, .ics, .gpx). When adding a `TripSettings` field, add it to `SHARED_KEYS`
   in `lib/share.ts`.
2. Road-snapped route lines: plumbing exists, generate `src/data/geo/legs.ts` with `npm run snap-legs` (needs network).
3. Traditional Chinese (繁中) UI — extract strings; data already has `zh` names.
4. Offline PWA (service worker, cached app shell; optional tile caching).
5. "On the road" mode: today's card, next fuel stop, check-in progress.
6. Live data: CWA weather/typhoon warnings, Highway Bureau closures (open data APIs).
