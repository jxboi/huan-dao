import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Attraction } from '../data/types';
import { STOP_BY_ID } from '../data/stops';
import { createBaseMap, MAP_COLORS } from './leaflet';

/**
 * Attractions as dots over a faint line of the current route. Tapping a dot selects it; the
 * screen shows the details below the map (so saving etc. stays in React, not popup HTML).
 */
export function ExploreMap({
  route,
  items,
  saved,
  selected,
  onSelect,
  height = 420,
}: {
  route: string[];
  items: Attraction[];
  saved: string[];
  selected?: string;
  onSelect: (id: string) => void;
  height?: number;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const routeLayer = useRef<L.LayerGroup | null>(null);
  const dotLayer = useRef<L.LayerGroup | null>(null);
  const select = useRef(onSelect);
  select.current = onSelect;

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = createBaseMap(el.current, { controls: false });
    routeLayer.current = L.layerGroup().addTo(map.current);
    dotLayer.current = L.layerGroup().addTo(map.current);
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const g = routeLayer.current;
    if (!g) return;
    g.clearLayers();
    const pts = route.map((id) => STOP_BY_ID[id]).filter(Boolean).map((s) => [s.lat, s.lng] as L.LatLngTuple);
    L.polyline(pts, { color: MAP_COLORS.primary, weight: 3, opacity: 0.35, interactive: false }).addTo(g);
  }, [route]);

  // Refit only when the set of places changes, not when the selection does.
  const key = items.map((a) => a.id).join();
  useEffect(() => {
    const m = map.current;
    if (!m || !items.length) return;
    m.fitBounds(L.latLngBounds(items.map((a) => [a.lat, a.lng] as L.LatLngTuple)), { padding: [30, 30], maxZoom: 12 });
  }, [key]);

  useEffect(() => {
    const g = dotLayer.current;
    if (!g) return;
    g.clearLayers();
    for (const a of items) {
      const isSaved = saved.includes(a.id);
      const on = a.id === selected;
      L.circleMarker([a.lat, a.lng], {
        radius: on ? 10 : isSaved ? 8 : 6,
        color: '#fff',
        weight: on ? 3 : 1.5,
        fillColor: isSaved || on ? MAP_COLORS.accent : MAP_COLORS.primary,
        fillOpacity: 0.95,
      })
        .bindTooltip(a.name)
        .on('click', () => select.current(a.id))
        .addTo(g);
    }
  }, [items, saved, selected]);

  return <div ref={el} className="map" style={{ height }} role="img" aria-label="Map of places to explore" />;
}
