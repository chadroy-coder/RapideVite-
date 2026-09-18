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

// Same free OSRM public routing server used server-side in src/lib/woulib.ts
// for pricing - reused here client-side (with overview=full this time) to
// draw the actual road-following path the driver marker sits on, Uber-style,
// instead of just a lone dot. No API key/billing either way.
const OSRM_BASE_URL = "https://router.project-osrm.org";

// How long the driver marker takes to glide from its last known position to
// the newest GPS ping, instead of teleporting there the instant a poll
// resolves. Pings arrive every POLL_MS (8s, see WoulibLivePanel) - a couple
// of seconds of glide reads as smooth motion without ever looking like the
// marker is "catching up" to a ping that's about to be overtaken by the next.
const GLIDE_MS = 2500;
// Ignore GPS jitter smaller than this (in meters) when deciding whether to
// update the vehicle's heading - a stationary driver's raw lat/lng still
// wobbles by a few meters between pings, which would otherwise spin the
// icon randomly.
const MIN_BEARING_DELTA_M = 3;
const ROUTE_SOURCE_ID = "driver-route";
const ROUTE_LAYER_ID = "driver-route-line";

type Point = GeoPoint;

export function LiveRouteMap({
  driver,
  destination,
  destinationLabel,
  vehicleKind,
  driverColor = "#0F8A5F",
  destColor = "#E5231B",
}: {
  driver: Point;
  destination: Point;
  destinationLabel?: string;
  vehicleKind?: "moto" | "car";
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
  const prevDestRef = useRef<Point | null>(null);
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

      // Local copies built from the primitive lat/lng deps this effect
      // actually declares, rather than closing over the `driver`/
      // `destination` prop objects directly (whose identity isn't tracked
      // by the dependency array below).
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
        const { el, inner } = buildVehicleElement(vehicleKind, driverColor);
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

      const destChanged = !prevDestRef.current || haversineMeters(prevDestRef.current, destPoint) > 3;

      if (!destMarkerRef.current) {
        destMarkerRef.current = new maplibregl.Marker({ element: buildPinElement(destColor), anchor: "bottom" })
          .setLngLat(toLngLat(destPoint))
          .addTo(map);
        if (destinationLabel) destMarkerRef.current.setPopup(new maplibregl.Popup({ offset: 12 }).setText(destinationLabel));
      } else if (destChanged) {
        destMarkerRef.current.setLngLat(toLngLat(destPoint));
      }
      prevDestRef.current = destPoint;

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

      // Only re-frame the whole route on first load or when the destination
      // itself changes (e.g. pickup -> dropoff leg). On routine driver
      // pings, re-fitting the bounds every 8s would fight the glide
      // animation and make the map feel jumpy - instead, gently pan back
      // into view only if the driver has actually drifted off-screen,
      // similar to Uber/Lyft's soft-follow behavior.
      if (isFirstPlacement || destChanged) {
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
  }, [driver.lat, driver.lng, destination.lat, destination.lng, destinationLabel, vehicleKind, driverColor, destColor]);

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
      <div ref={containerRef} className="w-full h-64 rounded-xl overflow-hidden border border-brand-border" />
      {eta && (
        <div className="absolute top-2 left-2 z-[1000] bg-white/95 backdrop-blur rounded-full shadow-sm border border-brand-border px-3 py-1.5 flex items-center gap-1.5">
          <span className="font-bold text-sm text-brand-ink">{eta.minutes} min</span>
          <span className="text-brand-gray text-xs">· {eta.km} km</span>
        </div>
      )}
    </div>
  );
}
