"use client";

import { useEffect, useRef, useState } from "react";

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

interface Point {
  lat: number;
  lng: number;
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}
function toDeg(rad: number) {
  return (rad * 180) / Math.PI;
}

// Initial compass bearing (0-360, 0 = north) from point a to point b -
// used to rotate the driver icon to face the direction of travel.
function bearingBetween(a: Point, b: Point) {
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function haversineMeters(a: Point, b: Point) {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// A small car/moto glyph inside a circle badge, pointing "up" (north) by
// default and rotated to face the direction of travel. At marker size
// (26px) a literal silhouette would read as a blob, so each shape is
// simplified to its most recognizable feature: a car's boxy body, a moto's
// narrow frame with two wheels - both still clearly distinct from each other
// and unambiguous about heading, same idea as Uber/Lyft's rotating pin.
function vehicleGlyphSvg(kind: "moto" | "car" | undefined, color: string) {
  const body =
    kind === "moto"
      ? `<circle cx="13" cy="8" r="2.1" fill="white"/>
         <rect x="11.5" y="10" width="3" height="7" rx="1.2" fill="white"/>
         <circle cx="13" cy="18.5" r="2.3" fill="white"/>`
      : `<rect x="9" y="6.5" width="8" height="11" rx="2.4" fill="white"/>
         <rect x="10.3" y="8.5" width="5.4" height="3.2" rx="1" fill="${color}"/>`;
  return `
    <svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
      <circle cx="13" cy="13" r="11.5" fill="${color}" stroke="white" stroke-width="2.5"/>
      ${body}
    </svg>`;
}

function easeInOutQuad(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

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
  const prevDestRef = useRef<Point | null>(null);
  const bearingRef = useRef(0);

  const [eta, setEta] = useState<{ minutes: number; km: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- leaflet has no shipped types here (see src/types/leaflet.d.ts)
    function buildDriverIcon(L: any, bearingDeg: number) {
      return L.divIcon({
        className: "",
        html: `<div style="width:26px;height:26px;transform:rotate(${bearingDeg}deg);transition:transform 0.4s ease;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.35))">${vehicleGlyphSvg(
          vehicleKind,
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
        // CARTO Voyager: a cleaner, more muted basemap than stock OSM tiles
        // (less saturated colors, lighter labels) - closer to the map style
        // riders are used to from Uber/Lyft. Free, no API key/billing,
        // same "no cost to run" bar as the rest of Woulib's mapping stack.
        L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
          attribution: '&copy; OpenStreetMap contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 20,
          detectRetina: true,
        }).addTo(mapRef.current);
      }
      const map = mapRef.current;

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
      const driverIcon = buildDriverIcon(L, bearingRef.current);

      if (isFirstPlacement) {
        driverMarkerRef.current = L.marker([driverPoint.lat, driverPoint.lng], { icon: driverIcon }).addTo(map);
      } else {
        driverMarkerRef.current.setIcon(driverIcon);
        glideMarkerTo(L, driverMarkerRef.current, driverPoint);
      }
      prevDriverRef.current = driverPoint;

      const destIcon = L.divIcon({
        className: "",
        html: `<div style="background:${destColor};width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.4)"></div>`,
        iconSize: [18, 18],
      });
      const destChanged =
        !prevDestRef.current ||
        haversineMeters(prevDestRef.current, destPoint) > 3;

      if (!destMarkerRef.current) {
        destMarkerRef.current = L.marker([destPoint.lat, destPoint.lng], { icon: destIcon }).addTo(map);
        if (destinationLabel) destMarkerRef.current.bindPopup(destinationLabel);
      } else if (destChanged) {
        destMarkerRef.current.setLatLng([destPoint.lat, destPoint.lng]);
      }
      prevDestRef.current = destPoint;

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

      // Only re-frame the whole route on first load or when the destination
      // itself changes (e.g. pickup -> dropoff leg). On routine driver
      // pings, re-fitting the bounds every 8s would fight the glide
      // animation and make the map feel jumpy - instead, gently pan back
      // into view only if the driver has actually drifted off-screen,
      // similar to Uber/Lyft's soft-follow behavior.
      if (isFirstPlacement || destChanged) {
        map.fitBounds(routeLineRef.current.getBounds(), { padding: [30, 30] });
      } else if (!map.getBounds().pad(-0.1).contains([driverPoint.lat, driverPoint.lng])) {
        map.panTo([driverPoint.lat, driverPoint.lng], { animate: true, duration: 0.8 });
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
      routeLineRef.current = null;
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
