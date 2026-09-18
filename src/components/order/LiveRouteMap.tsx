"use client";

import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapLibreMap, Marker as MapLibreMarker, GeoJSONSource } from "maplibre-gl";
import {
  MAP_STYLE_URL,
  bearingBetween,
  haversineMeters,
  easeInOutQuad,
  buildPinElement,
  buildVehicleElement,
  setVehicleBearing,
  ensureStyleLoaded,
  toLngLat,
  type GeoPoint,
} from "@/lib/maplibre-map";

// Grocery-order counterpart to src/components/woulib/LiveRouteMap.tsx: same
// smooth glide + rotating vehicle icon + road-following route + live ETA,
// applied to a delivery driver heading toward the customer's shared location
// instead of a Woulib rider's pickup/dropoff. Only rendered when the
// customer has shared an exact location (order.customer_lat/lng) - without a
// destination point there's nothing to route to, so LiveOrderPanel falls
// back to the plain single-dot LiveMap in that case.
const OSRM_BASE_URL = "https://router.project-osrm.org";
const GLIDE_MS = 2500;
const MIN_BEARING_DELTA_M = 3;
const ROUTE_SOURCE_ID = "order-route";
const ROUTE_LAYER_ID = "order-route-line";

type Point = GeoPoint;

export function LiveRouteMap({
  driver,
  destination,
  destinationLabel = "Vous",
  driverColor = "#f97316",
  destColor = "#2563eb",
}: {
  driver: Point;
  destination: Point;
  destinationLabel?: string;
  driverColor?: string;
  destColor?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const driverMarkerRef = useRef<MapLibreMarker | null>(null);
  const driverInnerRef = useRef<HTMLDivElement | null>(null);
  const destMarkerRef = useRef<MapLibreMarker | null>(null);
  const glideFrameRef = useRef<number | null>(null);
  const prevDriverRef = useRef<Point | null>(null);
  const bearingRef = useRef(0);
  const hasFramedRef = useRef(false);

  const [eta, setEta] = useState<{ minutes: number; km: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    function glideMarkerTo(marker: MapLibreMarker, to: Point) {
      if (glideFrameRef.current != null) cancelAnimationFrame(glideFrameRef.current);
      const from = marker.getLngLat();
      if (haversineMeters({ lat: from.lat, lng: from.lng }, to) < 0.5) return;
      const start = performance.now();
      function step(now: number) {
        if (cancelled) return;
        const t = Math.min(1, (now - start) / GLIDE_MS);
        const eased = easeInOutQuad(t);
        marker.setLngLat([from.lng + (to.lng - from.lng) * eased, from.lat + (to.lat - from.lat) * eased]);
        if (t < 1) {
          glideFrameRef.current = requestAnimationFrame(step);
        } else {
          glideFrameRef.current = null;
        }
      }
      glideFrameRef.current = requestAnimationFrame(step);
    }

    async function init() {
      if (!containerRef.current) return;
      const maplibregl = await import("maplibre-gl");
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = new maplibregl.Map({
          container: containerRef.current,
          style: MAP_STYLE_URL,
          center: toLngLat({ lat: driver.lat, lng: driver.lng }),
          zoom: 14,
          attributionControl: { compact: true },
        });
      }
      const map = mapRef.current;
      await ensureStyleLoaded(map);
      if (cancelled) return;

      if (!map.getSource(ROUTE_SOURCE_ID)) {
        map.addSource(ROUTE_SOURCE_ID, {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } },
        });
        map.addLayer({
          id: ROUTE_LAYER_ID,
          type: "line",
          source: ROUTE_SOURCE_ID,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": driverColor, "line-width": 4, "line-opacity": 0.8, "line-dasharray": ["literal", [1]] },
        });
      }

      const driverPoint: Point = { lat: driver.lat, lng: driver.lng };
      const destPoint: Point = { lat: destination.lat, lng: destination.lng };

      // Heading: only recompute from real GPS movement (not the animated
      // in-between frames), and ignore sub-3m jitter from a driver who's
      // stopped, so the icon doesn't spin in place at a red light.
      if (prevDriverRef.current && haversineMeters(prevDriverRef.current, driverPoint) > MIN_BEARING_DELTA_M) {
        bearingRef.current = bearingBetween(prevDriverRef.current, driverPoint);
      }

      const isFirstPlacement = !driverMarkerRef.current;

      if (isFirstPlacement) {
        // Grocery drivers in this app aren't tracked by vehicle type (see
        // Driver in types/database.ts) - default to the moto glyph, which
        // matches the Bike fallback icon already used elsewhere for
        // grocery delivery (order tracking page, driver photo placeholder).
        const { el, inner } = buildVehicleElement("moto", driverColor);
        setVehicleBearing(inner, bearingRef.current);
        driverInnerRef.current = inner;
        driverMarkerRef.current = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat(toLngLat(driverPoint))
          .addTo(map);
      } else {
        if (driverInnerRef.current) setVehicleBearing(driverInnerRef.current, bearingRef.current);
        glideMarkerTo(driverMarkerRef.current!, driverPoint);
      }
      prevDriverRef.current = driverPoint;

      if (!destMarkerRef.current) {
        destMarkerRef.current = new maplibregl.Marker({ element: buildPinElement(destColor), anchor: "bottom" })
          .setLngLat(toLngLat(destPoint))
          .addTo(map);
        if (destinationLabel) destMarkerRef.current.setPopup(new maplibregl.Popup({ offset: 12 }).setText(destinationLabel));
      }

      // Try to draw the real road-following route; fall back to a straight
      // dashed line if the routing server is unreachable so the customer
      // still sees which direction the driver is coming from.
      let coords: [number, number][] = [toLngLat(driverPoint), toLngLat(destPoint)];
      let dashed = true;
      let routeDistanceM: number | null = null;
      let routeDurationS: number | null = null;
      try {
        const coordStr = `${driverPoint.lng},${driverPoint.lat};${destPoint.lng},${destPoint.lat}`;
        const res = await fetch(
          `${OSRM_BASE_URL}/route/v1/driving/${coordStr}?overview=full&geometries=geojson`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          const route = data?.routes?.[0];
          const geometry = route?.geometry?.coordinates as [number, number][] | undefined;
          if (geometry?.length) {
            coords = geometry;
            dashed = false;
          }
          if (typeof route?.distance === "number") routeDistanceM = route.distance;
          if (typeof route?.duration === "number") routeDurationS = route.duration;
        }
      } catch {
        // Network hiccup - keep the straight-line fallback above.
      }

      if (cancelled) return;

      if (routeDistanceM != null && routeDurationS != null) {
        setEta({ minutes: Math.max(1, Math.round(routeDurationS / 60)), km: Math.round((routeDistanceM / 1000) * 10) / 10 });
      } else {
        setEta(null);
      }

      const routeSource = map.getSource(ROUTE_SOURCE_ID) as GeoJSONSource | undefined;
      routeSource?.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } });
      map.setPaintProperty(ROUTE_LAYER_ID, "line-dasharray", dashed ? ["literal", [1.5, 1.5]] : ["literal", [1]]);

      // Destination (the customer's shared location) never moves during a
      // delivery, so only the very first render needs to frame the whole
      // route - after that, only pan if the driver has drifted off-screen.
      if (isFirstPlacement && !hasFramedRef.current) {
        const bounds = new maplibregl.LngLatBounds(coords[0], coords[0]);
        for (const c of coords) bounds.extend(c);
        map.fitBounds(bounds, { padding: 30 });
        hasFramedRef.current = true;
      } else if (!map.getBounds().contains(toLngLat(driverPoint))) {
        map.panTo(toLngLat(driverPoint), { animate: true, duration: 800 });
      }
    }

    init();
    return () => {
      cancelled = true;
      if (glideFrameRef.current != null) cancelAnimationFrame(glideFrameRef.current);
    };
  }, [driver.lat, driver.lng, destination.lat, destination.lng, destinationLabel, driverColor, destColor]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      driverMarkerRef.current = null;
      destMarkerRef.current = null;
    };
  }, []);

  return (
    <div className="relative">
      <div ref={containerRef} className="w-full h-56 rounded-xl overflow-hidden border border-brand-border" />
      {eta && (
        <div className="absolute top-2 left-2 z-[1000] bg-white/95 backdrop-blur rounded-full shadow-sm border border-brand-border px-3 py-1.5 flex items-center gap-1.5">
          <span className="font-bold text-sm text-brand-ink">{eta.minutes} min</span>
          <span className="text-brand-gray text-xs">· {eta.km} km</span>
        </div>
      )}
    </div>
  );
}
