"use client";

import { useEffect, useRef } from "react";

// Same free OSRM public routing server used server-side in src/lib/woulib.ts
// for pricing - reused here client-side (with overview=full this time) to
// draw the actual road-following path the driver marker sits on, Uber-style,
// instead of just a lone dot. No API key/billing either way.
const OSRM_BASE_URL = "https://router.project-osrm.org";

interface Point {
  lat: number;
  lng: number;
}

export function LiveRouteMap({
  driver,
  destination,
  destinationLabel,
  driverColor = "#0F8A5F",
  destColor = "#E5231B",
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

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current) return;
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(mapRef.current);
      }
      const map = mapRef.current;

      const driverIcon = L.divIcon({
        className: "",
        html: `<div style="background:${driverColor};width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.4)"></div>`,
        iconSize: [16, 16],
      });
      const destIcon = L.divIcon({
        className: "",
        html: `<div style="background:${destColor};width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.4)"></div>`,
        iconSize: [18, 18],
      });

      if (!driverMarkerRef.current) {
        driverMarkerRef.current = L.marker([driver.lat, driver.lng], { icon: driverIcon }).addTo(map);
      } else {
        driverMarkerRef.current.setLatLng([driver.lat, driver.lng]);
      }

      if (!destMarkerRef.current) {
        destMarkerRef.current = L.marker([destination.lat, destination.lng], { icon: destIcon }).addTo(map);
        if (destinationLabel) destMarkerRef.current.bindPopup(destinationLabel);
      } else {
        destMarkerRef.current.setLatLng([destination.lat, destination.lng]);
      }

      // Try to draw the real road-following route; fall back to a straight
      // dashed line if the routing server is unreachable so the customer
      // still sees which direction the driver is coming from.
      let latLngs: [number, number][] = [
        [driver.lat, driver.lng],
        [destination.lat, destination.lng],
      ];
      let dashed = true;
      try {
        const coords = `${driver.lng},${driver.lat};${destination.lng},${destination.lat}`;
        const res = await fetch(
          `${OSRM_BASE_URL}/route/v1/driving/${coords}?overview=full&geometries=geojson`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          const geometry = data?.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined;
          if (geometry?.length) {
            latLngs = geometry.map(([lng, lat]) => [lat, lng]);
            dashed = false;
          }
        }
      } catch {
        // Network hiccup - keep the straight-line fallback above.
      }

      if (cancelled) return;

      if (routeLineRef.current) {
        routeLineRef.current.remove();
      }
      routeLineRef.current = L.polyline(latLngs, {
        color: driverColor,
        weight: 4,
        opacity: 0.8,
        dashArray: dashed ? "6 8" : undefined,
      }).addTo(map);

      map.fitBounds(routeLineRef.current.getBounds(), { padding: [30, 30] });
    }

    init();
    return () => {
      cancelled = true;
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

  return <div ref={containerRef} className="w-full h-64 rounded-xl overflow-hidden border border-brand-border" />;
}
