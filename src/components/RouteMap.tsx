import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { createBaseMap, MAP_COLORS } from './leaflet';
import { LEG_GEOMETRY } from '../data/geo/legs';
import { STOP_BY_ID } from '../data/stops';
import { pathThrough, pointAlong } from '../lib/geo';
import type { Plan } from '../lib/planner';
import { stopName } from '../lib/format';
import { parseRoads, roadTitle } from '../lib/roads';

/**
 * Leaflet map of the planned loop. Lines follow the roads where snapped geometry exists
 * (data/geo/legs.ts) and are straight stop-to-stop otherwise. Overnight stops get numbered day markers.
 * Road numbers (台9, 縣道102) label each stretch: always for the highlighted day, on the whole loop once zoomed in.
 * `focus` (a stop tapped in the day list) flies the map to that stop and rings it; `at` makes a repeat tap fly again.
 */
export function RouteMap({
  plan,
  highlightDay,
  focus,
  height = 360,
  controls = true,
}: {
  plan: Plan;
  highlightDay?: number;
  focus?: { stopId: string; at: number };
  height?: number | string;
  controls?: boolean;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const fit = useRef<() => void>(() => {});
  const labels = useRef<L.LayerGroup | null>(null);
  const focusLayer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = createBaseMap(el.current, { controls });
    map.current = m;
    layer.current = L.layerGroup().addTo(m);
    labels.current = L.layerGroup();
    focusLayer.current = L.layerGroup().addTo(m);
    // The container can change size (e.g. the desktop route panel opening/closing): re-measure and re-frame.
    const ro = new ResizeObserver(() => {
      m.invalidateSize();
      fit.current();
    });
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    const lg = labels.current;
    if (!m || !g || !lg) return;
    g.clearLayers();
    lg.clearLayers();

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
      if (highlightDay === undefined || active) addRoadLabels(d.legs, lg);
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

    // On the whole-loop map, labels would pile up at island scale: show them from zoom 9.
    const toggleLabels = () => {
      const show = highlightDay !== undefined || m.getZoom() >= LABEL_MIN_ZOOM;
      if (show && !m.hasLayer(lg)) lg.addTo(m);
      if (!show && m.hasLayer(lg)) lg.remove();
    };
    m.on('zoomend', toggleLabels);

    fit.current = () => {
      if (highlightDay !== undefined) {
        const d = plan.days.find((x) => x.day === highlightDay);
        const pts = d ? pathThrough([d.from, ...d.via], STOP_BY_ID, LEG_GEOMETRY) : [];
        if (pts.length) m.fitBounds(L.latLngBounds(pts), { padding: [30, 30], maxZoom: 11 });
      } else if (bounds.length) {
        m.fitBounds(L.latLngBounds(bounds), { padding: [20, 20] });
      }
    };
    fit.current();
    toggleLabels();
    return () => {
      m.off('zoomend', toggleLabels);
    };
  }, [plan, highlightDay]);

  useEffect(() => {
    const m = map.current;
    const g = focusLayer.current;
    if (!m || !g) return;
    g.clearLayers();
    const s = focus && STOP_BY_ID[focus.stopId];
    if (!s) return;
    L.marker([s.lat, s.lng], {
      icon: L.divIcon({ className: 'focus-pin', html: '<span></span>', iconSize: [34, 34] }),
      interactive: false,
      keyboard: false,
    }).addTo(g);
    L.tooltip({ direction: 'top', offset: [0, -16], permanent: true, className: 'focus-label' })
      .setLatLng([s.lat, s.lng])
      .setContent(`<strong>${s.name}</strong> ${s.zh}`)
      .addTo(g);
    m.flyTo([s.lat, s.lng], Math.max(m.getZoom(), FOCUS_ZOOM), { duration: 0.8 });
  }, [focus]);

  return <div ref={el} className="map" style={{ height }} role="img" aria-label="Map of the planned route around Taiwan" />;
}

const LABEL_MIN_ZOOM = 9;
const FOCUS_ZOOM = 13;

/** One road-number label mid-way along each run of consecutive legs on the same road(s). */
function addRoadLabels(legs: Plan['days'][number]['legs'], g: L.LayerGroup) {
  for (let i = 0; i < legs.length; ) {
    let j = i;
    while (j + 1 < legs.length && legs[j + 1].road === legs[i].road) j++;
    const ids = [legs[i].from, ...legs.slice(i, j + 1).map((l) => l.to)];
    const at = pointAlong(pathThrough(ids, STOP_BY_ID, LEG_GEOMETRY), 0.5);
    const roads = parseRoads(legs[i].road);
    if (at && roads.length) {
      // Frontage roads keep their "frontage" tag on the map: a bare 台61 would point riders at the expressway.
      const html = roads
        .map((r) => `<span class="road ${r.kind}${r.frontage ? ' frontage' : ''}">${r.zh || r.label}${r.frontage ? ' <small>frontage</small>' : ''}</span>`)
        .join('');
      L.marker(at, {
        icon: L.divIcon({ className: 'road-label', html, iconSize: undefined }),
        interactive: true,
        keyboard: false,
      })
        .bindTooltip(roads.map(roadTitle).join(' / '))
        .addTo(g);
    }
    i = j + 1;
  }
}
