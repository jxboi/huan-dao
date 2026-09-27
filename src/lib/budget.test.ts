import { describe, expect, it } from 'vitest';
import { ATTRACTIONS } from '../data/attractions';
import { CONTINGENCY, FOOD_STYLES, LONG_RENTAL_DISCOUNT, STAYS, VEHICLES, WEEKEND_LODGING_FACTOR } from '../data/costs';
import { HOLIDAY_LODGING_FACTOR, HOLIDAY_RENTAL_FACTOR } from '../data/holidays';
import { defaultSettings, type TripSettings } from '../state/settings';
import { currencyFor, makeBudget, nightFactor, seasonFactor } from './budget';
import { makePlan } from './planner';

const settings = (over: Partial<TripSettings> = {}): TripSettings => ({ ...defaultSettings(), ...over });
const budget = (over: Partial<TripSettings> = {}) => {
  const s = settings(over);
  return makeBudget(s, makePlan(s));
};
const line = (b: ReturnType<typeof budget>, id: string) => b.lines.find((l) => l.id === id)!.total;

describe('budget totals', () => {
  it('adds up: lines sum to the total, contingency is 10 % of the rest', () => {
    const b = budget({ days: 9, riders: 3, bikes: 2, startDate: '2026-11-02' });
    const sub = b.lines.filter((l) => l.id !== 'contingency').reduce((s, l) => s + l.total, 0);
    expect(line(b, 'contingency')).toBeCloseTo(sub * CONTINGENCY);
    expect(b.total).toBeCloseTo(b.lines.reduce((s, l) => s + l.total, 0));
    expect(b.perPerson).toBeCloseTo(b.total / 3);
    expect(b.perPersonPerDay).toBeCloseTo(b.total / 3 / 9);
    expect(b.nights).toBe(8);
  });

  it('food is riders × days × daily rate', () => {
    const food = FOOD_STYLES.find((f) => f.id === 'foodie')!;
    expect(line(budget({ days: 8, riders: 2, bikes: 1, food: 'foodie' }), 'food')).toBe(food.perDay * 2 * 8);
  });

  it('counts saved attraction tickets per rider', () => {
    const paid = ATTRACTIONS.find((a) => a.cost > 0)!;
    const without = line(budget({ riders: 2, bikes: 1 }), 'activities');
    const withIt = line(budget({ riders: 2, bikes: 1, saved: [paid.id] }), 'activities');
    expect(withIt - without).toBe(paid.cost * 2);
  });
});

describe('rental', () => {
  const rate = VEHICLES.find((v) => v.id === 'scooter125')!.rentPerDay;

  it('applies the weekly discount from 7 days', () => {
    expect(line(budget({ days: 6, season: 'low' }), 'rental')).toBe(rate * 6);
    expect(line(budget({ days: 7, season: 'low' }), 'rental')).toBeCloseTo(rate * 7 * (1 - LONG_RENTAL_DISCOUNT));
  });

  it('multiplies by bikes, not riders', () => {
    const one = line(budget({ days: 6, season: 'low', riders: 2, bikes: 1 }), 'rental');
    const two = line(budget({ days: 6, season: 'low', riders: 2, bikes: 2 }), 'rental');
    expect(two).toBe(one * 2);
  });

  it('uses the season: peak override, and summer months in auto mode', () => {
    expect(line(budget({ days: 6, season: 'peak' }), 'rental')).toBeCloseTo(rate * 6 * 1.3);
    expect(line(budget({ days: 6, season: 'auto', startDate: '2026-07-06' }), 'rental')).toBeCloseTo(rate * 6 * 1.3);
    expect(line(budget({ days: 6, season: 'auto', startDate: '2026-11-02' }), 'rental')).toBe(rate * 6);
  });

  it('charges the peak rate on long-weekend days in auto mode only', () => {
    // 2026-10-07 (Wed) + 6 days → Oct 7–12, National Day break is Oct 9–11 (3 days).
    const auto = budget({ days: 6, season: 'auto', startDate: '2026-10-07' });
    expect(line(auto, 'rental')).toBeCloseTo(rate * (3 + 3 * HOLIDAY_RENTAL_FACTOR));
    expect(auto.lines.find((l) => l.id === 'rental')!.detail).toMatch(/3 holiday days/);
    expect(line(budget({ days: 6, season: 'low', startDate: '2026-10-07' }), 'rental')).toBe(rate * 6);
  });

  it('own bike costs nothing to rent but still burns fuel', () => {
    const b = budget({ vehicle: 'own125' });
    expect(line(b, 'rental')).toBe(0);
    expect(line(b, 'fuel')).toBeGreaterThan(0);
  });
});

describe('fuel', () => {
  it('electric uses cost per km, and rest days add local riding', () => {
    const ev = VEHICLES.find((v) => v.id === 'electric')!;
    const s = settings({ vehicle: 'electric', days: 10, restDays: { hualien: 1 } });
    const plan = makePlan(s);
    const rest = plan.days.filter((d) => d.kind === 'rest').length;
    expect(line(makeBudget(s, plan), 'fuel')).toBeCloseTo((plan.totalKm + rest * 30) * ev.costPerKm!);
  });
});

describe('lodging', () => {
  const room = STAYS.find((s) => s.id === 'budget')!;

  it('rooms sleep two, dorm beds are per person', () => {
    const rooms = line(budget({ riders: 3, bikes: 2, stay: 'budget', season: 'low' }), 'lodging');
    const rooms4 = line(budget({ riders: 4, bikes: 2, stay: 'budget', season: 'low' }), 'lodging');
    expect(rooms4).toBeCloseTo(rooms); // 3 or 4 riders → 2 rooms either way
    const beds2 = line(budget({ riders: 2, bikes: 1, stay: 'dorm', season: 'low' }), 'lodging');
    const beds1 = line(budget({ riders: 1, bikes: 1, stay: 'dorm', season: 'low' }), 'lodging');
    expect(beds2).toBeCloseTo(beds1 * 2);
  });

  it('prices weekend and pre-holiday nights higher', () => {
    // Same trip, one starting Monday in a quiet week, one straddling the Lunar New Year break.
    const quiet = line(budget({ days: 5, startDate: '2026-03-09', season: 'low' }), 'lodging');
    const lny = line(budget({ days: 5, startDate: '2026-02-16', season: 'low' }), 'lodging');
    expect(lny).toBeCloseTo(quiet * HOLIDAY_LODGING_FACTOR['lunar-new-year']);
    expect(room.price).toBeGreaterThan(0);
  });
});

describe('nightFactor', () => {
  it('is 1 without a date or on a plain weeknight', () => {
    expect(nightFactor()).toBe(1);
    expect(nightFactor('2026-11-03')).toBe(1); // Tuesday
  });
  it('uplifts Friday and Saturday nights', () => {
    expect(nightFactor('2026-11-06')).toBe(WEEKEND_LODGING_FACTOR);
    expect(nightFactor('2026-11-07')).toBe(WEEKEND_LODGING_FACTOR);
    expect(nightFactor('2026-11-08')).toBe(1); // Sunday: Monday is a workday
  });
  it('uses the holiday rate for nights before a day off, the larger one winning', () => {
    expect(nightFactor('2026-10-08')).toBe(HOLIDAY_LODGING_FACTOR['long-weekend']); // Thu before Oct 9–11
    expect(nightFactor('2026-10-10')).toBe(HOLIDAY_LODGING_FACTOR['long-weekend']); // Sat inside it
    expect(nightFactor('2026-10-11')).toBe(1); // last night, Monday is a workday
    expect(nightFactor('2027-06-08')).toBe(HOLIDAY_LODGING_FACTOR.day); // Tue before Dragon Boat (Wed)
  });
});

describe('helpers', () => {
  it('seasonFactor follows mode and start month', () => {
    expect(seasonFactor(settings({ season: 'peak' }))).toBe(1.3);
    expect(seasonFactor(settings({ season: 'low', startDate: '2026-07-01' }))).toBe(1);
    expect(seasonFactor(settings({ season: 'auto', startDate: '' }))).toBe(1);
    expect(seasonFactor(settings({ season: 'auto', startDate: '2027-02-01' }))).toBe(1.15);
  });
  it('currencyFor falls back to TWD', () => {
    expect(currencyFor('EUR').code).toBe('EUR');
    expect(currencyFor('XXX').code).toBe('TWD');
  });
});
