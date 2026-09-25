# 10 · User Needs & Product Thinking

## Personas
1. **"First-timer Fiona"** — foreign tourist, 10 days of holiday, has ridden scooters on holiday before. Wants: *Can I do it? How many km per day? Where to sleep? Is it safe? What paperwork?*
2. **"Budget backpacker Ben"** — solo, hostels, street food, wants to stretch money and meet people. Wants: *total cost, cheapest stays, free sights.*
3. **"Couple on one scooter"** — Carla & Ken, 2-up on a 150cc, minsu with views, foodies. Wants: *romantic stops, sunset spots, nice B&Bs, food list per day.*
4. **"Local student Wei"** — Taiwanese, 5–7 days, own scooter, classic rite of passage. Wants: *fastest reasonable loop, the must-photo spots, cheap.*
5. **"Rider Rick"** — experienced, heavy bike, wants twisty mountain detours (Alishan, Hehuan, South Link), cares about road status.

## Core jobs-to-be-done
1. **Decide feasibility**: "In N days, what does each day look like?" → instant day plan with km & hours.
2. **Customise**: direction, start city, route variants (coast vs valley), pace, where to sleep, rest days, detours.
3. **Know costs**: live budget that reacts to every setting; per-person, per-day, currency conversion.
4. **Know what to see & eat**: per day, along the way — not a generic list.
5. **Stay safe & legal**: licence, rules, road closures, weather season, emergency numbers.
6. **Use on the road**: mobile, offline-capable, one-hand friendly, quick "today" view, open-in-Google-Maps.
7. **Share**: send the plan to travel buddy.

## Pain points found in forums/blogs
* Confusion about whether scooters can ride the Suhua and Taroko status (outdated info online).
* Underestimating ride time on mountain roads and in cities (traffic lights).
* Not knowing IDP is required → can't rent on arrival.
* Weekend price spikes and sold-out small towns.
* Rain & typhoons wrecking plans → need flexible plan & buffer days.
* Long gaps without petrol on the east coast/South Link at night.

## Feature list & priority
| Priority | Feature | Status (foundation) |
| --- | --- | --- |
| P0 | Trip setup: days, start, direction, pace, vehicle, riders, stay tier, food style | ✅ |
| P0 | Route variants per section, route map | ✅ |
| P0 | Auto day-by-day itinerary balanced by riding hours | ✅ |
| P0 | Budget breakdown that updates live, per person & currency | ✅ |
| P0 | Guide: licence, rules, safety, emergency, weather, road status warnings | ✅ |
| P0 | Persist plan locally | ✅ |
| P1 | Pin overnight stops / add rest days / choose stay tier per night | ✅ (pin + rest days) |
| P1 | Explore attractions & food, save favourites → shown on days | ✅ |
| P1 | Packing checklist | ✅ |
| P1 | Open leg in Google Maps (scooter-friendly waypoints) | ✅ |
| P1 | Share plan via URL / export | ⬜ (roadmap) |
| P2 | Start date → season warnings, weekend/holiday pricing | ✅ basic (month-based) |
| P2 | Live road status / weather APIs (CWA open data) | ⬜ |
| P2 | Chinese (繁中) UI, other languages | ⬜ |
| P2 | Accommodation deep links (Booking/Agoda search by town) | ✅ basic search links |
| P2 | Trip mode: "today" view, check-in progress, fuel reminders | ⬜ |
| P3 | Community notes, photos, completion certificate | ⬜ |
| P3 | Offline PWA with cached tiles | ⬜ (manifest only) |

## Design principles
* **Mobile first, thumb reachable**: bottom tab bar, big tap targets, sticky summary.
* **Answer first**: the home screen shows "N days · X km · ~NT$Y" before any tinkering.
* **Sensible defaults, progressive disclosure**: works with zero input; advanced settings behind expanders.
* **Honest safety info**: clear, non-alarmist, sourced, with "last checked" dates.
* **Data-driven**: all content lives in typed data files so non-coders/AI can extend it.
