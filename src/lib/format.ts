import { STOP_BY_ID } from '../data/stops';
import type { Currency } from '../data/costs';

export function fmtKm(km: number): string {
  return `${Math.round(km).toLocaleString()} km`;
}

export function fmtHours(h: number): string {
  if (h <= 0) return '—';
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60 / 5) * 5;
  if (mins === 60) return `${whole + 1} h`;
  return whole ? `${whole} h${mins ? ` ${mins}m` : ''}` : `${mins}m`;
}

export function fmtTwd(n: number): string {
  return `NT$${Math.round(n).toLocaleString()}`;
}

/** Converted amount in the user's currency (rounded sensibly). */
export function fmtMoney(twd: number, cur: Currency): string {
  if (cur.code === 'TWD') return fmtTwd(twd);
  const v = twd / cur.twdPer;
  const rounded = v >= 1000 ? Math.round(v / 10) * 10 : Math.round(v);
  return `${cur.symbol}${rounded.toLocaleString()}`;
}

export function fmtDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function stopName(id: string): string {
  return STOP_BY_ID[id]?.name ?? id;
}

/**
 * Google Maps directions through the given stops. Waypoints keep Maps on
 * roughly the same scooter-legal roads; remind users to tick "Avoid highways".
 */
export function googleMapsDirections(stopIds: string[]): string {
  const pts = stopIds.map((id) => STOP_BY_ID[id]).filter(Boolean).map((s) => `${s.lat},${s.lng}`);
  // Google caps URL waypoints (~10); sample evenly if needed.
  const max = 10;
  const sampled = pts.length <= max ? pts : Array.from({ length: max }, (_, i) => pts[Math.round((i * (pts.length - 1)) / (max - 1))]);
  return `https://www.google.com/maps/dir/${sampled.join('/')}`;
}

export function googleMapsPlace(lat: number, lng: number, label?: string): string {
  const q = label ? encodeURIComponent(label) : `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${q}&center=${lat},${lng}`;
}

export function bookingSearch(stopId: string, checkin?: string): string {
  const s = STOP_BY_ID[stopId];
  const q = encodeURIComponent(`${s?.name ?? stopId}, Taiwan`);
  return `https://www.booking.com/searchresults.html?ss=${q}${checkin ? `&checkin=${checkin}` : ''}`;
}
