import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { STOP_BY_ID } from '../data/stops';
import type { Plan } from '../lib/planner';
import { stopName } from '../lib/format';

/**
 * Leaflet map of the planned loop. Lines are drawn stop-to-stop (schematic,
 * not snapped to roads). Overnight stops get numbered day markers.
 *
 * Tiles: OpenStreetMap standard tiles. For heavy production use, swap for a
 * tile provider with an API key (see docs/ROADMAP.md).
 */
export function RouteMap({ plan, highlightDay, height = 360, controls = true }: { plan: Plan; highlightDay?: number; height?: number; controls?: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { zoomControl: controls, attributionControl: true, scrollWheelZoom: false, zoomSnap: 0.25 }).setView([23.7, 121], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();

    const bounds: L.LatLngExpression[] = [];
    plan.days.forEach((d) => {
      if (d.kind !== 'ride') return;
      const ids = [d.from, ...d.via];
      const latlngs = ids.map((id) => STOP_BY_ID[id]).filter(Boolean).map((s) => [s.lat, s.lng] as L.LatLngTuple);
      bounds.push(...latlngs);
      const active = highlightDay === undefined || highlightDay === d.day;
      L.polyline(latlngs, {
        color: d.day % 2 ? '#0f5f7f' : '#e0522b',
        weight: active ? 5 : 3,
        opacity: active ? 0.9 : 0.35,
      })
        .bindTooltip(`Day ${d.day}: ${stopName(d.from)} → ${stopName(d.to)}`)
        .addTo(g);
      d.via.slice(0, -1).forEach((id) => {
        const s = STOP_BY_ID[id];
        if (s) L.circleMarker([s.lat, s.lng], { radius: 3, color: '#334155', weight: 1, fillOpacity: 0.8 }).bindTooltip(s.name).addTo(g);
      });
    });

    // Numbered overnight markers (group rest days on the same marker).
    const nights = new Map<string, number[]>();
    plan.days.forEach((d) => {
      if (d.overnight) nights.set(d.overnight, [...(nights.get(d.overnight) ?? []), d.day]);
    });
    nights.forEach((dayNums, id) => {
      const s = STOP_BY_ID[id];
      if (!s) return;
      const label = dayNums.length > 1 ? `${dayNums[0]}+` : String(dayNums[0]);
      L.marker([s.lat, s.lng], {
        icon: L.divIcon({ className: 'day-pin', html: `<span>${label}</span>`, iconSize: [26, 26] }),
      })
        .bindPopup(`<strong>${s.name} ${s.zh}</strong><br/>Night${dayNums.length > 1 ? 's' : ''} ${dayNums.join(', ')}`)
        .addTo(g);
    });
    const start = STOP_BY_ID[plan.route.points[0]];
    if (start) {
      L.marker([start.lat, start.lng], {
        icon: L.divIcon({ className: 'day-pin start', html: '<span>★</span>', iconSize: [28, 28] }),
      })
        .bindPopup(`<strong>Start & finish: ${start.name}</strong>`)
        .addTo(g);
    }

    if (highlightDay !== undefined) {
      const d = plan.days.find((x) => x.day === highlightDay);
      const ids = d ? [d.from, ...d.via] : [];
      const pts = ids.map((id) => STOP_BY_ID[id]).filter(Boolean).map((s) => [s.lat, s.lng] as L.LatLngTuple);
      if (pts.length) m.fitBounds(L.latLngBounds(pts), { padding: [30, 30], maxZoom: 11 });
    } else if (bounds.length) {
      m.fitBounds(L.latLngBounds(bounds), { padding: [20, 20] });
    }
  }, [plan, highlightDay]);

  return <div ref={el} className="map" style={{ height }} role="img" aria-label="Map of the planned route around Taiwan" />;
}
