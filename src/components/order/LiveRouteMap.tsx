"use client";

import { useEffect, useRef, useState } from "react";
import {
  ensureLeafletCss,
  addBaseTileLayer,
  bearingBetween,
  haversineMeters,
  easeInOutQuad,
  vehicleGlyphSvg,
  type GeoPoint,
} from "@/lib/leaflet-map";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- leaflet has no shipped types here (see src/types/leaflet.d.ts)
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const driverMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const destMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const routeLineRef = useRef<any>(null);
  const glideFrameRef = useRef<number | null>(null);
  const prevDriverRef = useRef<Point | null>(null);
  const bearingRef = useRef(0);
  const hasFramedRef = useRef(false);

  const [eta, setEta] = useState<{ minutes: number; km: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- leaflet has no shipped types here (see src/types/leaflet.d.ts)
    function buildDriverIcon(L: any, bearingDeg: number) {
      return L.divIcon({
        className: "",
        // Grocery drivers in this app aren't tracked by vehicle type (see
        // Driver in types/database.ts) - default to the moto glyph, which
        // matches the Bike fallback icon already used elsewhere for
        // grocery delivery (order tracking page, driver photo placeholder).
        html: `<div style="width:26px;height:26px;transform:rotate(${bearingDeg}deg);transition:transform 0.4s ease;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.35))">${vehicleGlyphSvg(
          "moto",
          driverColor
        )}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- leaflet has no shipped types here (see src/types/leaflet.d.ts)
    function glideMarkerTo(L: any, marker: any, to: Point) {
      if (glideFrameRef.current != null) cancelAnimationFrame(glideFrameRef.current);
      const from = marker.getLatLng();
      const toLatLng = L.latLng(to.lat, to.lng);
      if (from.distanceTo(toLatLng) < 0.5) return;
      const start = performance.now();
      function step(now: number) {
        if (cancelled) return;
        const t = Math.min(1, (now - start) / GLIDE_MS);
        const eased = easeInOutQuad(t);
        marker.setLatLng([
          from.lat + (toLatLng.lat - from.lat) * eased,
          from.lng + (toLatLng.lng - from.lng) * eased,
        ]);
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
      ensureLeafletCss();
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current);
        addBaseTileLayer(L, mapRef.current);
      }
      const map = mapRef.current;

      const driverPoint: Point = { lat: driver.lat, lng: driver.lng };
      const destPoint: Point = { lat: destination.lat, lng: destination.lng };

      if (prevDriverRef.current && haversineMeters(prevDriverRef.current, driverPoint) > MIN_BEARING_DELTA_M) {
        bearingRef.current = bearingBetween(prevDriverRef.current, driverPoint);
      }

      const isFirstPlacement = !driverMarkerRef.current;
      const driverIcon = buildDriverIcon(L, bearingRef.current);

      if (isFirstPlacement) {
        driverMarkerRef.current = L.marker([driverPoint.lat, driverPoint.lng], { icon: driverIcon }).addTo(map);
      } else {
        driverMarkerRef.current.setIcon(driverIcon);
        glideMarkerTo(L, driverMarkerRef.current, driverPoint);
      }
      prevDriverRef.current = driverPoint;

      if (!destMarkerRef.current) {
        const destIcon = L.divIcon({
          className: "",
          html: `<div style="background:${destColor};width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.4)"></div>`,
          iconSize: [18, 18],
        });
        destMarkerRef.current = L.marker([destPoint.lat, destPoint.lng], { icon: destIcon }).addTo(map);
        if (destinationLabel) destMarkerRef.current.bindPopup(destinationLabel);
      }

      // Try to draw the real road-following route; fall back to a straight
      // dashed line if the routing server is unreachable so the customer
      // still sees which direction the driver is coming from.
      let latLngs: [number, number][] = [
        [driverPoint.lat, driverPoint.lng],
        [destPoint.lat, destPoint.lng],
      ];
      let dashed = true;
      let routeDistanceM: number | null = null;
      let routeDurationS: number | null = null;
      try {
        const coords = `${driverPoint.lng},${driverPoint.lat};${destPoint.lng},${destPoint.lat}`;
        const res = await fetch(
          `${OSRM_BASE_URL}/route/v1/driving/${coords}?overview=full&geometries=geojson`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          const route = data?.routes?.[0];
          const geometry = route?.geometry?.coordinates as [number, number][] | undefined;
          if (geometry?.length) {
            latLngs = geometry.map(([lng, lat]) => [lat, lng]);
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

      if (routeLineRef.current) {
        routeLineRef.current.remove();
      }
      routeLineRef.current = L.polyline(latLngs, {
        color: driverColor,
        weight: 4,
        opacity: 0.8,
        dashArray: dashed ? "6 8" : undefined,
      }).addTo(map);

      // Destination (the customer's shared location) never moves during a
      // delivery, so only the very first render needs to frame the whole
      // route - after that, only pan if the driver has drifted off-screen.
      if (isFirstPlacement && !hasFramedRef.current) {
        map.fitBounds(routeLineRef.current.getBounds(), { padding: [30, 30] });
        hasFramedRef.current = true;
      } else if (!map.getBounds().pad(-0.1).contains([driverPoint.lat, driverPoint.lng])) {
        map.panTo([driverPoint.lat, driverPoint.lng], { animate: true, duration: 0.8 });
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
      routeLineRef.current = null;
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
