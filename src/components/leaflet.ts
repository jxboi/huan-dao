import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/** Route colours used on maps; kept in sync with --primary / --accent in app.css (Leaflet needs literal values). */
export const MAP_COLORS = {
  primary: '#0f5f7f',
  accent: '#e0522b',
  ink: '#334155',
  // Other ways to ride a day: pale under the planned route, darker while hovered.
  alt: '#a9cbdb',
  altCasing: '#5d8397',
  altHover: '#6fa3bb',
  altHoverCasing: '#0f5f7f',
} as const;

/**
 * A Leaflet map over Taiwan with OpenStreetMap tiles. For heavy production use, swap for a tile
 * provider with an API key (see docs/ROADMAP.md).
 */
export function createBaseMap(el: HTMLElement, { controls = true }: { controls?: boolean } = {}): L.Map {
  const map = L.map(el, { zoomControl: controls, attributionControl: true, scrollWheelZoom: false, zoomSnap: 0.25 }).setView([23.7, 121], 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);
  return map;
}
