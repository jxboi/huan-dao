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
 * `alternatives` (other ways to ride the highlighted day) are drawn pale under it, like a maps app's route choices:
 * hovering one (here or in the list, via `hoverAlt`) darkens it and labels it; tapping it calls `onPickAlt`.
 */
export function RouteMap({
  plan,
  highlightDay,
  focus,
  height = 360,
  controls = true,
  alternatives,
  hoverAlt,
  onHoverAlt,
  onPickAlt,
}: {
  plan: Plan;
  highlightDay?: number;
  focus?: { stopId: string; at: number };
  height?: number | string;
  controls?: boolean;
  alternatives?: MapAlternative[];
  hoverAlt?: string;
  onHoverAlt?: (key: string | undefined) => void;
  onPickAlt?: (key: string) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const fit = useRef<() => void>(() => {});
  const labels = useRef<L.LayerGroup | null>(null);
  const focusLayer = useRef<L.LayerGroup | null>(null);
  const altLayer = useRef<L.LayerGroup | null>(null);
  const altLines = useRef(new Map<string, { line: L.Polyline; casing: L.Polyline; at: L.LatLngExpression; label: string }>());
  // Read at event time, so new callbacks each render don't redraw the map.
  const handlers = useRef({ onHoverAlt, onPickAlt });
  handlers.current = { onHoverAlt, onPickAlt };

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = createBaseMap(el.current, { controls });
    map.current = m;
    // Alternatives sit in their own pane under the planned route, so the ridden day always draws on top.
    m.createPane('alternatives').style.zIndex = '350';
    altLayer.current = L.layerGroup().addTo(m);
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
    const ag = altLayer.current;
    if (!m || !g || !lg || !ag) return;
    g.clearLayers();
    lg.clearLayers();
    ag.clearLayers();
    altLines.current.clear();

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

    const day = highlightDay !== undefined ? plan.days.find((x) => x.day === highlightDay) : undefined;
    const dayPts: L.LatLngExpression[] = day ? pathThrough([day.from, ...day.via], STOP_BY_ID, LEG_GEOMETRY) : [];
    if (day) {
      const ridden = [day.from, ...day.via];
      for (const alt of alternatives ?? []) {
        const latlngs = pathThrough(alt.path, STOP_BY_ID, LEG_GEOMETRY);
        if (latlngs.length < 2) continue;
        dayPts.push(...latlngs);
        const casing = L.polyline(latlngs, { pane: 'alternatives', color: MAP_COLORS.altCasing, weight: 8, opacity: 0.7, interactive: false }).addTo(ag);
        const line = L.polyline(latlngs, { pane: 'alternatives', color: MAP_COLORS.alt, weight: 5, opacity: 1, interactive: false }).addTo(ag);
        // An invisible wider line takes the taps: a 5 px line is hard to hit with a finger.
        L.polyline(latlngs, { pane: 'alternatives', opacity: 0, weight: 20 })
          .on('mouseover', () => handlers.current.onHoverAlt?.(alt.key))
          .on('mouseout', () => handlers.current.onHoverAlt?.(undefined))
          .on('click', () => handlers.current.onPickAlt?.(alt.key))
          .addTo(ag);
        altLines.current.set(alt.key, { line, casing, at: labelPoint(alt.path, ridden) ?? latlngs[0], label: alt.label });
      }
    }

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
        if (dayPts.length) m.fitBounds(L.latLngBounds(dayPts), { padding: [30, 30], maxZoom: 11 });
      } else if (bounds.length) {
        m.fitBounds(L.latLngBounds(bounds), { padding: [20, 20] });
      }
    };
    fit.current();
    toggleLabels();
    return () => {
      m.off('zoomend', toggleLabels);
    };
  }, [plan, highlightDay, alternatives]);

  // The hovered alternative: darker, on top of the other alternatives, with its time and distance.
  useEffect(() => {
    const m = map.current;
    const alt = hoverAlt ? altLines.current.get(hoverAlt) : undefined;
    if (!m || !alt) return;
    alt.casing.setStyle({ color: MAP_COLORS.altHoverCasing, opacity: 0.9 }).bringToFront();
    alt.line.setStyle({ color: MAP_COLORS.altHover }).bringToFront();
    const tip = L.tooltip({ direction: 'top', permanent: true, className: 'alt-label' }).setLatLng(alt.at).setContent(alt.label).addTo(m);
    return () => {
      alt.casing.setStyle({ color: MAP_COLORS.altCasing, opacity: 0.7 });
      alt.line.setStyle({ color: MAP_COLORS.alt });
      tip.remove();
    };
  }, [hoverAlt, alternatives, plan, highlightDay]);

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

/** Another way to ride the highlighted day: its stops, and the label shown while it's hovered. */
export interface MapAlternative {
  key: string;
  path: string[];
  label: string;
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

/** Mid-way along the stretch where an alternative leaves the ridden day's towns, so its label sits on its own line. */
function labelPoint(path: string[], ridden: string[]): L.LatLngExpression | undefined {
  const off = path.map((id, i) => (ridden.includes(id) ? -1 : i)).filter((i) => i >= 0);
  const ids = off.length ? path.slice(Math.max(0, off[0] - 1), off[off.length - 1] + 2) : path;
  return pointAlong(pathThrough(ids, STOP_BY_ID, LEG_GEOMETRY), 0.5);
}
