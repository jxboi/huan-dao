# Huan Dao Planner 環島

A mobile-first web app for planning a **motorbike/scooter loop around Taiwan** (環島, *huándǎo*).
Set your days, start city, direction and pace, pick route variants (coast vs rift valley, Sun Moon Lake detour…),
and get a balanced day-by-day itinerary with where to sleep, what to see and eat, road warnings and a live budget.

## Features (foundation v0.1)

| Tab | What it does |
| --- | --- |
| **Plan** | Trip length, start date, start city, direction, pace, riders/bikes, vehicle, stay tier, food style. Instant summary (km, hours, riding days, cost/person). |
| **Route** | Map of the loop + route variants for all 10 sections with km, time, scenery & difficulty, road warnings, Google Maps links. |
| **Days** | Auto-balanced day-by-day plan: via stops, roads, warnings, highlights, food, overnight town with price estimate & booking search. Pin overnight stops ("Sleep here"), add rest days, navigate each day in Google Maps. |
| **Explore** | 60 sights/food spots filterable by region, category, "on my route", search (English & 中文). Save ☆ must-sees → they appear on the right day and are factored into day lengths. Food-by-town list. |
| **Budget** | Rental, fuel, lodging (per town & weekend), food, activities, extras, contingency. Per person/per day, 10 currencies, season pricing. |
| **Guide** | Licence/IDP, road rules & fines, Suhua/Taroko status, safety & emergency quick-dial, month-by-month weather, packing checklist. |

Everything persists in `localStorage`. No backend, no accounts.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # planner/budget/data-integrity tests (vitest)
npm run typecheck
npm run build      # static site in dist/ (relative paths — host anywhere)
```

## Project layout

```
research/          Research notes (sources, numbers, road status) — read before changing data
docs/              ARCHITECTURE.md, ROADMAP.md, CONTRIBUTING-DATA.md
src/data/          Typed content: stops, sections (route variants), attractions, costs, guide
src/lib/           Pure logic: route building, day planner (DP), budget, formatting
src/state/         Settings type + migration, React store (context + reducer + persistence)
src/components/    UI primitives, Leaflet map, attraction row
src/screens/       One component per tab
```

See **[CLAUDE.md](CLAUDE.md)** for the handoff guide for AI/dev contributors.

## Disclaimer

Road status (Suhua Highway, Taroko Gorge) and prices change. The app shows "last checked" dates and links to
official sources — always verify before riding. Distances are approximate; map lines are schematic.
