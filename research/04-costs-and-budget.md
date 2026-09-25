# 04 · Costs & Budget Model

These numbers are the defaults in `src/data/costs.ts`. All in TWD (NT$).

## Fuel
* 95 unleaded: **NT$32.7/L** (CPC, late Sep 2026). 92 is ~NT$1.5 cheaper.
* Consumption (real-world, loaded, mixed roads):
  * 125cc scooter ≈ 40 km/L
  * 150cc scooter ≈ 35 km/L
  * 250–400cc bike ≈ 25 km/L
  * Electric (Gogoro): battery swap subscription usually included in rental; model it as ≈ NT$0.6/km when not.
* A full ~1,100 km loop on a 125cc ≈ 27 L ≈ **NT$900**. Fuel is a small part of the budget.

## Scooter rental (per scooter per day)
| Type | Default in app | Range |
| --- | --- | --- |
| 125cc | 600 | 400–900 (peak up to 1,500) |
| 150cc | 850 | 700–1,200 |
| Electric | 700 | 500–900 |
| Heavy bike | 2,800 | 2,000–4,000 |
| Own bike | 0 | — |

Apply **seasonal multiplier** 1.3 in peak (Jul–Aug, Chinese New Year, long weekends)
and **long-rental discount** 15 % for ≥7 days.

## Accommodation (per room per night; dorm is per bed)
| Tier | Default | Notes |
| --- | --- | --- |
| Hostel dorm | 600 / person | NT$350–900 |
| Budget hotel / minsu | 1,600 / room | NT$1,000–2,200, double room |
| Mid-range hotel | 2,800 / room | NT$2,200–3,800 |
| Boutique / resort | 5,000 / room | NT$4,000–9,000+ |
| Camping | 300 / person | Campsites NT$200–600 per tent; bring gear |

Regional multiplier: Taipei 1.25, Kenting 1.3 (summer/weekend spike), Sun Moon Lake/Alishan 1.3, Hualien/Taitung 1.0, west-coast mid cities 0.9, small towns 0.85.
Weekend (Fri/Sat) + holiday uplift: ×1.2–1.5.

## Food (per person per day)
| Style | Default | What it looks like |
| --- | --- | --- |
| Street food & convenience stores | 450 | 7-Eleven breakfast, lunch box (便當) NT$100, night-market dinner NT$200 |
| Mixed | 800 | Some sit-down meals, bubble tea, snacks |
| Foodie / sit-down | 1,500 | Restaurants, seafood in Kenting, hot pot |

## Attractions & activities
Most scenery is free. Paid items the app models per attraction:
* Taroko: free entry (some shuttle/tour costs).
* Hot springs: NT$100–400 public; private rooms NT$500–1,200.
* Green Island ferry ~NT$1,000 return + island scooter NT$400/day.
* Xiaoliuqiu ferry ~NT$410 return + scooter NT$300.
* Kenting National Park — free; Kenting Forest Rec Area NT$150.
* Sun Moon Lake ropeway NT$300; boat pass NT$300.
* Alishan Forest Rec Area NT$300 (+ parking).
* Museums NT$0–200.

## Other
* SIM card / eSIM with unlimited data: NT$500–1,000 for 10–15 days.
* Rain gear, phone mount, dry bag: NT$300–800 one-off.
* Parking: mostly free; some city bays NT$20–30.
* Insurance upgrades: shop-dependent.
* Contingency: 10 %.

## Sample totals (1 rider, 10 days, 125cc, budget hotel shared by 2, mixed food)
* Rental 10 × 600 × 0.85 = 5,100
* Fuel ~1,150 km / 40 × 32.7 ≈ 940
* Lodging 9 nights × 1,600 / 2 = 7,200
* Food 10 × 800 = 8,000
* Activities ≈ 1,500, misc ≈ 1,300
* Subtotal ≈ 24,000 → + 10 % contingency ≈ **NT$26,400 (≈ US$880)** per person, excluding flights.

## Currency (approx., user-editable in app)
1 USD ≈ 30 TWD · 1 EUR ≈ 34 · 1 GBP ≈ 40 · 1 SGD ≈ 23 · 1 MYR ≈ 7 · 1 AUD ≈ 20 · 1 HKD ≈ 3.9 · 1 JPY ≈ 0.2 · 1 CNY ≈ 4.2
