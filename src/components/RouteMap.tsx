import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { createBaseMap, MAP_COLORS } from './leaflet';
import { LEG_GEOMETRY } from '../data/geo/legs';
import { STOP_BY_ID } from '../data/stops';
import { pathThrough } from '../lib/geo';
import type { Plan } from '../lib/planner';
import { stopName } from '../lib/format';

/**
 * Leaflet map of the planned loop. Lines follow the roads where snapped geometry exists
 * (data/geo/legs.ts) and are straight stop-to-stop otherwise. Overnight stops get numbered day markers.
 */
export function RouteMap({ plan, highlightDay, height = 360, controls = true }: { plan: Plan; highlightDay?: number; height?: number; controls?: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = createBaseMap(el.current, { controls });
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
      const latlngs = pathThrough(ids, STOP_BY_ID, LEG_GEOMETRY);
      bounds.push(...latlngs);
      const active = highlightDay === undefined || highlightDay === d.day;
      L.polyline(latlngs, {
        color: d.day % 2 ? MAP_COLORS.primary : MAP_COLORS.accent,
        weight: active ? 5 : 3,
        opacity: active ? 0.9 : 0.35,
      })
        .bindTooltip(`Day ${d.day}: ${stopName(d.from)} → ${stopName(d.to)}`)
        .addTo(g);
      d.via.slice(0, -1).forEach((id) => {
        const s = STOP_BY_ID[id];
        if (s) L.circleMarker([s.lat, s.lng], { radius: 3, color: MAP_COLORS.ink, weight: 1, fillOpacity: 0.8 }).bindTooltip(s.name).addTo(g);
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
      const pts = d ? pathThrough([d.from, ...d.via], STOP_BY_ID, LEG_GEOMETRY) : [];
      if (pts.length) m.fitBounds(L.latLngBounds(pts), { padding: [30, 30], maxZoom: 11 });
    } else if (bounds.length) {
      m.fitBounds(L.latLngBounds(bounds), { padding: [20, 20] });
    }
  }, [plan, highlightDay]);

  return <div ref={el} className="map" style={{ height }} role="img" aria-label="Map of the planned route around Taiwan" />;
}
