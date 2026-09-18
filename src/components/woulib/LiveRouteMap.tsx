"use client";

import { useEffect, useRef, useState } from "react";
import {
  loadGoogleMaps,
  MAP_STYLES,
  bearingBetween,
  haversineMeters,
  easeInOutQuad,
  vehicleIcon,
  dotIcon,
  dashedLineIcons,
  type GeoPoint,
} from "@/lib/google-map";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- no @types/google.maps here, see src/lib/google-map.ts
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const driverMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const destMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const routeLineRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const directionsServiceRef = useRef<any>(null);
  const glideFrameRef = useRef<number | null>(null);
  const prevDriverRef = useRef<Point | null>(null);
  const prevDestRef = useRef<Point | null>(null);
  const bearingRef = useRef(0);

  const [eta, setEta] = useState<{ minutes: number; km: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- no @types/google.maps here, see src/lib/google-map.ts
    function glideMarkerTo(google: any, marker: any, to: Point) {
      if (glideFrameRef.current != null) cancelAnimationFrame(glideFrameRef.current);
      const fromPos = marker.getPosition();
      const from: Point = { lat: fromPos.lat(), lng: fromPos.lng() };
      if (haversineMeters(from, to) < 0.5) return;
      const start = performance.now();
      function step(now: number) {
        if (cancelled) return;
        const t = Math.min(1, (now - start) / GLIDE_MS);
        const eased = easeInOutQuad(t);
        marker.setPosition(
          new google.maps.LatLng(from.lat + (to.lat - from.lat) * eased, from.lng + (to.lng - from.lng) * eased)
        );
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
      const google = await loadGoogleMaps();
      if (cancelled || !containerRef.current) return;

      // Local copies built from the primitive lat/lng deps this effect
      // actually declares, rather than closing over the `driver`/
      // `destination` prop objects directly (whose identity isn't tracked
      // by the dependency array below).
      const driverPoint: Point = { lat: driver.lat, lng: driver.lng };
      const destPoint: Point = { lat: destination.lat, lng: destination.lng };

      if (!mapRef.current) {
        mapRef.current = new google.maps.Map(containerRef.current, {
          center: driverPoint,
          zoom: 14,
          styles: MAP_STYLES,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
        });
      }
      const map = mapRef.current;
      if (!directionsServiceRef.current) {
        directionsServiceRef.current = new google.maps.DirectionsService();
      }

      // Heading: only recompute from real GPS movement (not the animated
      // in-between frames), and ignore sub-3m jitter from a driver who's
      // stopped, so the icon doesn't spin in place at a red light.
      if (prevDriverRef.current && haversineMeters(prevDriverRef.current, driverPoint) > MIN_BEARING_DELTA_M) {
        bearingRef.current = bearingBetween(prevDriverRef.current, driverPoint);
      }

      const isFirstPlacement = !driverMarkerRef.current;

      if (isFirstPlacement) {
        driverMarkerRef.current = new google.maps.Marker({
          position: driverPoint,
          map,
          icon: vehicleIcon(google, driverColor, bearingRef.current),
        });
      } else {
        driverMarkerRef.current.setIcon(vehicleIcon(google, driverColor, bearingRef.current));
        glideMarkerTo(google, driverMarkerRef.current, driverPoint);
      }
      prevDriverRef.current = driverPoint;

      const destChanged = !prevDestRef.current || haversineMeters(prevDestRef.current, destPoint) > 3;

      if (!destMarkerRef.current) {
        destMarkerRef.current = new google.maps.Marker({
          position: destPoint,
          map,
          icon: dotIcon(google, destColor),
          title: destinationLabel,
        });
      } else if (destChanged) {
        destMarkerRef.current.setPosition(destPoint);
      }
      prevDestRef.current = destPoint;

      // Try to draw the real road-following route via Google Directions;
      // fall back to a straight dashed line if it's unreachable so the
      // customer still sees which direction the driver is coming from.
      let path: Point[] = [driverPoint, destPoint];
      let dashed = true;
      let routeDistanceM: number | null = null;
      let routeDurationS: number | null = null;
      try {
        const result = await directionsServiceRef.current.route({
          origin: driverPoint,
          destination: destPoint,
          travelMode: google.maps.TravelMode.DRIVING,
        });
        const route = result?.routes?.[0];
        const overview = route?.overview_path as { lat: () => number; lng: () => number }[] | undefined;
        if (overview?.length) {
          path = overview.map((p) => ({ lat: p.lat(), lng: p.lng() }));
          dashed = false;
        }
        const leg = route?.legs?.[0];
        if (leg?.distance?.value != null) routeDistanceM = leg.distance.value;
        if (leg?.duration?.value != null) routeDurationS = leg.duration.value;
      } catch {
        // Directions unreachable/denied - keep the straight-line fallback above.
      }

      if (cancelled) return;

      if (routeDistanceM != null && routeDurationS != null) {
        setEta({ minutes: Math.max(1, Math.round(routeDurationS / 60)), km: Math.round((routeDistanceM / 1000) * 10) / 10 });
      } else {
        setEta(null);
      }

      if (!routeLineRef.current) {
        routeLineRef.current = new google.maps.Polyline({
          path,
          map,
          strokeColor: driverColor,
          strokeWeight: 4,
          strokeOpacity: dashed ? 0 : 0.8,
          icons: dashed ? dashedLineIcons(google, driverColor) : [],
        });
      } else {
        routeLineRef.current.setPath(path);
        routeLineRef.current.setOptions({ strokeOpacity: dashed ? 0 : 0.8, icons: dashed ? dashedLineIcons(google, driverColor) : [] });
      }

      // Only re-frame the whole route on first load or when the destination
      // itself changes (e.g. pickup -> dropoff leg). On routine driver
      // pings, re-fitting the bounds every 8s would fight the glide
      // animation and make the map feel jumpy - instead, gently pan back
      // into view only if the driver has actually drifted off-screen,
      // similar to Uber/Lyft's soft-follow behavior.
      if (isFirstPlacement || destChanged) {
        const bounds = new google.maps.LatLngBounds();
        for (const p of path) bounds.extend(p);
        map.fitBounds(bounds, 30);
      } else {
        const bounds = map.getBounds();
        if (bounds && !bounds.contains(driverPoint)) {
          map.panTo(driverPoint);
        }
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
      driverMarkerRef.current?.setMap(null);
      destMarkerRef.current?.setMap(null);
      routeLineRef.current?.setMap(null);
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
