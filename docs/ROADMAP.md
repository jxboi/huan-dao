# Roadmap

Status legend: ✅ done · 🟡 partial · ⬜ todo. Priorities from `research/10-user-needs-and-product.md`.

## v0.1 — Foundation (this release)
- ✅ Trip setup (days, date, start hub, direction, pace, riders/bikes, vehicle, stay, food)
- ✅ 10-section loop with 20 route variants, warnings, Google Maps links
- ✅ DP day planner with pins, rest days, flex days, attraction-aware balancing
- ✅ Budget engine with currency, season & weekend pricing
- ✅ Explore (60 sights + food by town), save must-sees
- ✅ Guide (licence, rules, road status, safety, weather, checklist)
- ✅ localStorage persistence, dark mode, PWA manifest, unit tests, CI

## UX refresh (in progress)
- ✅ Trip tab is map-first: big title, KPIs, a tappable trip sentence whose words open bottom sheets, a swipeable day strip
- ✅ SVG icon set, warm paper/sea-blue/temple-red palette, Plus Jakarta Sans, fewer borders
- ✅ Deep link to a day (`#/days/3`)
- ✅ First-run flow: start hub → pace → days (slider with suggested range, live km/day) → month (`onboarded` setting)
- ✅ Month strip coloured by riding weather (`MonthPicker`), picks the first Saturday; exact-day input as fine-tune
- ✅ Days tab as a continuous journey timeline with zh names; larger map that follows the open day
- ✅ New look on Route / Explore / Budget / Guide: page headers instead of hero cards, no emoji in titles, text category labels
- ✅ Explore: List / Map switch — places as dots over the route, tap for details & save
- ✅ No emoji left in UI or data (guide/budget icon fields removed); ★/☆ kept as plain glyphs
- ✅ Plus Jakarta Sans bundled (`src/assets/fonts`, latin + latin-ext, OFL) — no Google Fonts request
- ✅ Days slider: thicker track, labelled suggested range

## Data & tests (Sep 2026)
- ✅ Tests for route, budget, settings migration, holidays, geometry, plus data sanity checks (96 tests)
- ✅ `migrate()` validates every enum/id/collection (bad saved state used to crash the planner, e.g. unknown `pace`)
- ✅ Taiwan holiday calendar 2026–2027: day labels, plan notes, holiday lodging & rental pricing, month-picker hints
- ✅ New variants: Pingxi Valley (Taipei → Yilan), Rift Valley + Hwy 23 (Hualien → Taitung); new stops Pingxi, Fuli, Donghe
- ✅ Fixed Hwy 11 Fengbin/Chenggong leg split (was shorter than the straight line)
- 🟡 Road-snapped geometry: plumbing, generator script and tests done; `src/data/geo/legs.ts` still empty — run
  `npm run snap-legs` from a machine that can reach an OSRM server, review on the map, commit

## v0.2 — Share & take it on the road
- ✅ Share plan via URL (`#/plan?s=…`, base64url JSON of settings that differ from defaults) + share/copy button;
  opening a link asks before replacing an existing trip, keeps the receiver's packing list
- ✅ Export: printable itinerary page (`#/print`, print CSS / save as PDF), `.ics` calendar (one all-day event per day),
  GPX (overnight waypoints + a route per riding day; tracks once road geometry exists)
- ⬜ Service worker for offline app shell (vite-plugin-pwa or hand-rolled)
- ⬜ "Today" mode: current day card, progress check-ins, next petrol reminder on remote legs
- ⬜ Per-night stay tier override (e.g., splurge in Hualien)

## v0.3 — Better data
- 🟡 Road-snapped leg geometry — see above
- 🟡 More variants: ✅ Hwy 23, ✅ Pingxi. ⬜ Tai 61/Tai 17 coast, Alishan-only. Southern Cross-Island (Tai 20) and
  Hehuanshan (Tai 14A) cross the island, so they can't be a variant of one section — they need a "cross-island
  shortcut" concept that skips sections (and live closure status)
- ⬜ Petrol & Gogoro swap station layer on remote legs
- ⬜ Accommodation suggestions per town (named hostels/minsu with price bands) — keep affiliate-neutral
- ✅ Holiday calendar (2026–2027) — add each new year when DGPA publishes it

## v0.4 — Live info & i18n
- ⬜ CWA open data: typhoon warnings / forecast per overnight town for trip dates
- ⬜ Highway Bureau closures feed for Suhua, Tai 8, Tai 11, South Link
- ⬜ 繁體中文 UI (extract strings to `src/i18n/`), then 日本語 / 한국어
- ⬜ Editable exchange rates / live FX

## Ideas backlog
- Huandao "passport": stamp collection check-ins + shareable completion certificate
- Group trips: split costs between riders
- Elevation profile per day (mountain variants)
- Community tips per stop
