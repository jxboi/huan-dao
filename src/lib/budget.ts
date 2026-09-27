import { ATTRACTIONS } from '../data/attractions';
import {
  CONTINGENCY,
  CURRENCIES,
  EXTRAS_PER_PERSON,
  FOOD_STYLES,
  FUEL_PRICE_PER_L,
  LONG_RENTAL_DAYS,
  LONG_RENTAL_DISCOUNT,
  STAYS,
  VEHICLES,
  WEEKEND_LODGING_FACTOR,
  seasonFactorForMonth,
  type Currency,
} from '../data/costs';
import { HOLIDAY_RENTAL_FACTOR } from '../data/holidays';
import { STOP_BY_ID } from '../data/stops';
import type { TripSettings } from '../state/settings';
import { holidayNightFactor, holidayRentalFactor } from './holidays';
import type { Plan } from './planner';

export type BudgetCategory = 'rental' | 'fuel' | 'lodging' | 'food' | 'activities' | 'extras' | 'contingency';

export interface BudgetLine {
  id: BudgetCategory;
  label: string;
  total: number;
  /** How the number was worked out, shown to the user. */
  detail: string;
}

export interface Budget {
  lines: BudgetLine[];
  total: number;
  perPerson: number;
  perPersonPerDay: number;
  nights: number;
  seasonFactor: number;
}

export const CATEGORY_META: Record<BudgetCategory, { label: string }> = {
  rental: { label: 'Scooter rental' },
  fuel: { label: 'Fuel / charging' },
  lodging: { label: 'Accommodation' },
  food: { label: 'Food & drink' },
  activities: { label: 'Sights & activities' },
  extras: { label: 'SIM, rain gear & extras' },
  contingency: { label: 'Contingency (10%)' },
};

export function seasonFactor(settings: TripSettings): number {
  if (settings.season === 'peak') return 1.3;
  if (settings.season === 'low') return 1;
  if (!settings.startDate) return 1;
  const m = Number(settings.startDate.slice(5, 7));
  return m ? seasonFactorForMonth(m) : 1;
}

export function makeBudget(settings: TripSettings, plan: Plan): Budget {
  const riders = settings.riders;
  const bikes = settings.bikes;
  const days = plan.days.length;
  const nights = Math.max(0, days - 1);
  const vehicle = VEHICLES.find((v) => v.id === settings.vehicle) ?? VEHICLES[0];
  const stay = STAYS.find((s) => s.id === settings.stay) ?? STAYS[2];
  const food = FOOD_STYLES.find((f) => f.id === settings.food) ?? FOOD_STYLES[1];
  const sf = seasonFactor(settings);

  // Rental: in auto season mode each dated day is priced by its own month, and days inside a
  // Lunar New Year / long-weekend break at the peak rate.
  const discount = days >= LONG_RENTAL_DAYS ? 1 - LONG_RENTAL_DISCOUNT : 1;
  const dayFactors = plan.days.map((d) => rentalDayFactor(settings, sf, d.date));
  const holidayRentalDays = plan.days.filter((d) => d.date && settings.season === 'auto' && holidayRentalFactor(d.date) > 1).length;
  const rental = vehicle.rentPerDay * bikes * dayFactors.reduce((a, b) => a + b, 0) * discount;
  const rentalDetail = vehicle.rentPerDay
    ? `${bikes} × ${days} days × NT$${vehicle.rentPerDay}${sf !== 1 ? ` × ${sf} season` : ''}` +
      `${holidayRentalDays ? ` (${holidayRentalDays} holiday day${holidayRentalDays > 1 ? 's' : ''} × ${HOLIDAY_RENTAL_FACTOR})` : ''}` +
      `${discount !== 1 ? ' − 15% weekly discount' : ''}`
    : 'Own bike';

  // Fuel (ridden km include rest-day local riding estimate of 30 km)
  const restKm = plan.days.filter((d) => d.kind === 'rest').length * 30;
  const km = plan.totalKm + restKm;
  const fuel = vehicle.kmPerL
    ? (km / vehicle.kmPerL) * FUEL_PRICE_PER_L * bikes
    : km * (vehicle.costPerKm ?? 0) * bikes;
  const fuelDetail = vehicle.kmPerL
    ? `${Math.round(km)} km ÷ ${vehicle.kmPerL} km/L × NT$${FUEL_PRICE_PER_L}/L × ${bikes} bike${bikes > 1 ? 's' : ''}`
    : `${Math.round(km)} km × NT$${vehicle.costPerKm}/km (battery swap)`;

  // Lodging: price per night depends on the town and the weekday.
  const units = stay.perPerson ? riders : Math.ceil(riders / 2);
  let lodging = 0;
  for (const d of plan.days) {
    if (!d.overnight) continue;
    const factor = STOP_BY_ID[d.overnight]?.lodgingFactor ?? 1;
    lodging += stay.price * units * factor * nightFactor(d.date) * (sf > 1 ? 1.1 : 1);
  }
  const lodgingDetail = `${nights} nights × ${units} ${stay.perPerson ? 'bed' : 'room'}${units > 1 ? 's' : ''} × ~NT$${stay.price} (adjusted per town${settings.startDate ? ', weekends & holidays' : ''})`;

  // Food
  const foodTotal = food.perDay * riders * days;

  // Activities: saved attractions + a small allowance per day for small tickets.
  const savedCost = ATTRACTIONS.filter((a) => settings.saved.includes(a.id)).reduce((s, a) => s + a.cost, 0);
  const activities = (savedCost + 50 * days) * riders;

  const extras = EXTRAS_PER_PERSON * riders;

  const subtotal = rental + fuel + lodging + foodTotal + activities + extras;
  const contingency = subtotal * CONTINGENCY;
  const total = subtotal + contingency;

  const lines: BudgetLine[] = [
    { id: 'rental', label: CATEGORY_META.rental.label, total: rental, detail: rentalDetail },
    { id: 'fuel', label: CATEGORY_META.fuel.label, total: fuel, detail: fuelDetail },
    { id: 'lodging', label: CATEGORY_META.lodging.label, total: lodging, detail: lodgingDetail },
    { id: 'food', label: CATEGORY_META.food.label, total: foodTotal, detail: `${riders} × ${days} days × NT$${food.perDay} (${food.label})` },
    { id: 'activities', label: CATEGORY_META.activities.label, total: activities, detail: `Saved sights NT$${savedCost} + NT$50/day small tickets, × ${riders}` },
    { id: 'extras', label: CATEGORY_META.extras.label, total: extras, detail: `NT$${EXTRAS_PER_PERSON} per person (SIM/eSIM, raincoat, phone mount)` },
    { id: 'contingency', label: CATEGORY_META.contingency.label, total: contingency, detail: 'Repairs, parking, laundry, surprises' },
  ];

  return {
    lines,
    total,
    perPerson: total / riders,
    perPersonPerDay: total / riders / Math.max(1, days),
    nights,
    seasonFactor: sf,
  };
}

/** Friday/Saturday nights and nights before a public holiday cost more; the larger uplift wins. */
export function nightFactor(date?: string): number {
  if (!date) return 1;
  const dow = new Date(`${date}T00:00:00`).getDay();
  return Math.max(dow === 5 || dow === 6 ? WEEKEND_LODGING_FACTOR : 1, holidayNightFactor(date));
}

function rentalDayFactor(settings: TripSettings, sf: number, date?: string): number {
  if (settings.season !== 'auto' || !date) return sf;
  const m = Number(date.slice(5, 7));
  return Math.max(seasonFactorForMonth(m), holidayRentalFactor(date));
}

export function currencyFor(code: string): Currency {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}
