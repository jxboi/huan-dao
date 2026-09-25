# Updating data safely

1. Find the fact in `research/` (or add a source there first).
2. Edit the typed file in `src/data/`. Types will guide required fields.
3. Time-sensitive facts (road closures, trial openings, prices) → set `checked: 'YYYY-MM'` on the `RoadWarning`
   and update the date in the research note.
4. `npm test` — integrity tests check every `stopId`/leg reference and the closed loop.
5. Check the UI at 390 px wide (`npm run dev`, browser device mode).

## Conventions
- Leg distances: approximate scooter-legal road km, rounded to 5 km where uncertain.
- Leg `speed`: average moving speed incl. traffic — city 30, plains 35–40, open coast 45–50, mountains 28–35.
- `overnight`: 3 major hub, 2 nice small town, 1 thin options, 0 pass-through only.
- `lodgingFactor`: 1.0 baseline; Taipei 1.25, Kenting/Alishan/Sun Moon Lake 1.3, small towns 0.85–0.95.
- Costs in TWD per person unless noted.
