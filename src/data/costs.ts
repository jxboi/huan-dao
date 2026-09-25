/**
 * Cost assumptions used by the budget engine (research/04).
 * All amounts in TWD. Keep in sync with research/04-costs-and-budget.md.
 */

export const FUEL_PRICE_PER_L = 32.7; // 95 unleaded, CPC, Sep 2026
export const RIDE_OVERHEAD = 1.15; // breaks, photo stops, fuel stops on top of moving time

export type VehicleId = 'scooter125' | 'scooter150' | 'electric' | 'heavy' | 'own125';

export interface VehicleOption {
  id: VehicleId;
  label: string;
  detail: string;
  rentPerDay: number;
  /** km per litre; null for electric. */
  kmPerL: number | null;
  /** Energy cost per km when not included (electric). */
  costPerKm?: number;
  maxRiders: 1 | 2;
  /** Multiplier on moving speed (heavier bikes climb faster). */
  speedFactor: number;
  note?: string;
}

export const VEHICLES: VehicleOption[] = [
  { id: 'scooter125', label: '125cc scooter', detail: 'The classic huandao ride', rentPerDay: 600, kmPerL: 40, maxRiders: 2, speedFactor: 1 },
  { id: 'scooter150', label: '150cc scooter', detail: 'More power for mountains & 2-up', rentPerDay: 850, kmPerL: 35, maxRiders: 2, speedFactor: 1.05 },
  {
    id: 'electric', label: 'Electric (Gogoro)', detail: 'Battery swap stations; sparse on east coast', rentPerDay: 700, kmPerL: null, costPerKm: 0.6, maxRiders: 2, speedFactor: 1,
    note: 'Swap stations are rare on Suhua, South Link and Hwy 11 — plan swaps carefully.',
  },
  {
    id: 'heavy', label: 'Heavy bike (250cc+)', detail: 'Needs heavy-bike licence', rentPerDay: 2800, kmPerL: 25, maxRiders: 2, speedFactor: 1.15,
    note: 'Requires a licence endorsement for heavy motorcycles. Allowed on the Suhua Improved Highway.',
  },
  { id: 'own125', label: 'My own scooter', detail: 'No rental cost', rentPerDay: 0, kmPerL: 40, maxRiders: 2, speedFactor: 1 },
];

export type StayTier = 'camping' | 'dorm' | 'budget' | 'mid' | 'boutique';

export interface StayOption {
  id: StayTier;
  label: string;
  detail: string;
  price: number;
  /** true = price is per person (beds/tent pitches); false = per room (sleeps 2). */
  perPerson: boolean;
}

export const STAYS: StayOption[] = [
  { id: 'camping', label: 'Camping', detail: 'Campsites, bring gear', price: 300, perPerson: true },
  { id: 'dorm', label: 'Hostel dorm', detail: 'Meet other riders', price: 600, perPerson: true },
  { id: 'budget', label: 'Budget / minsu', detail: 'Private double room', price: 1600, perPerson: false },
  { id: 'mid', label: 'Mid-range hotel', detail: 'Comfort & breakfast', price: 2800, perPerson: false },
  { id: 'boutique', label: 'Boutique / resort', detail: 'Hot-spring & sea-view treats', price: 5000, perPerson: false },
];

export type FoodStyle = 'street' | 'mixed' | 'foodie';

export const FOOD_STYLES: { id: FoodStyle; label: string; detail: string; perDay: number }[] = [
  { id: 'street', label: 'Street & 7-Eleven', detail: 'Night markets, lunch boxes', perDay: 450 },
  { id: 'mixed', label: 'Mixed', detail: 'Some sit-down meals, bubble tea', perDay: 800 },
  { id: 'foodie', label: 'Foodie', detail: 'Restaurants, seafood feasts', perDay: 1500 },
];

/** One-off per person: SIM/eSIM, rain gear, phone mount etc. */
export const EXTRAS_PER_PERSON = 1000;
export const CONTINGENCY = 0.1;
export const LONG_RENTAL_DAYS = 7;
export const LONG_RENTAL_DISCOUNT = 0.15;
export const WEEKEND_LODGING_FACTOR = 1.25;

export type SeasonMode = 'auto' | 'low' | 'peak';

/** Rental price multiplier by month (1-12). Peak: summer holidays & CNY. */
export function seasonFactorForMonth(month: number): number {
  if (month === 7 || month === 8) return 1.3;
  if (month === 1 || month === 2) return 1.15;
  return 1;
}

export interface Currency {
  code: string;
  symbol: string;
  /** TWD per 1 unit of this currency (approx. 2026, user-editable later). */
  twdPer: number;
}

export const CURRENCIES: Currency[] = [
  { code: 'TWD', symbol: 'NT$', twdPer: 1 },
  { code: 'USD', symbol: 'US$', twdPer: 30 },
  { code: 'EUR', symbol: '€', twdPer: 34 },
  { code: 'GBP', symbol: '£', twdPer: 40 },
  { code: 'SGD', symbol: 'S$', twdPer: 23 },
  { code: 'MYR', symbol: 'RM', twdPer: 7 },
  { code: 'AUD', symbol: 'A$', twdPer: 20 },
  { code: 'HKD', symbol: 'HK$', twdPer: 3.9 },
  { code: 'JPY', symbol: '¥', twdPer: 0.2 },
  { code: 'CNY', symbol: 'CN¥', twdPer: 4.2 },
];
