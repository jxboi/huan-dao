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

## v0.2 — Share & take it on the road
- ⬜ Share plan via URL (compress settings into `#/plan?s=…`) + "copy link" button
- ⬜ Export: printable itinerary page, `.ics` calendar, GPX of overnight stops
- ⬜ Service worker for offline app shell (vite-plugin-pwa or hand-rolled)
- ⬜ "Today" mode: current day card, progress check-ins, next petrol reminder on remote legs
- ⬜ Per-night stay tier override (e.g., splurge in Hualien)

## v0.3 — Better data
- ⬜ Road-snapped leg geometry (pre-compute with OSRM/GraphHopper *scooter/moped profile*, avoid motorways; store
  simplified GeoJSON in `src/data/geo/`)
- ⬜ More variants: Tai 61/Tai 17 coast, Hwy 23 (Fuli–Donghe), Southern Cross-Island (Tai 20), Hehuanshan (Tai 14A),
  Pingxi detour, Alishan-only
- ⬜ Petrol & Gogoro swap station layer on remote legs
- ⬜ Accommodation suggestions per town (named hostels/minsu with price bands) — keep affiliate-neutral
- ⬜ Holiday calendar (Taiwan public holidays per year) for pricing & crowd warnings

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
