"use client";

import { useEffect, useRef } from "react";
import { loadGoogleMaps, MAP_STYLES, easeInOutQuad, haversineMeters, dotIcon } from "@/lib/google-map";

// How long a marker takes to glide to an updated position instead of
// jumping there instantly - same idea as the Woulib live-route map, just
// without the route line/ETA/rotation (this component only ever shows a
// single static or slow-moving point: a driver console's view of the
// customer's fixed shared location, an admin's static pickup/dropoff pin,
// etc. - not a full "route toward a destination" tracker).
const GLIDE_MS = 1200;

// Google Maps JavaScript API (see src/lib/google-map.ts for the loader and
// shared styling/icon helpers).
export function LiveMap({
  lat,
  lng,
  label,
  color = "#f97316",
}: {
  lat: number;
  lng: number;
  label?: string;
  color?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- no @types/google.maps here, see src/lib/google-map.ts
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  const glideFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current) return;
      const google = await loadGoogleMaps();
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = new google.maps.Map(containerRef.current, {
          center: { lat, lng },
          zoom: 15,
          styles: MAP_STYLES,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
        });
        markerRef.current = new google.maps.Marker({
          position: { lat, lng },
          map: mapRef.current,
          icon: dotIcon(google, color),
          title: label,
        });
      } else {
        mapRef.current.setCenter({ lat, lng });

        if (glideFrameRef.current != null) cancelAnimationFrame(glideFrameRef.current);
        const marker = markerRef.current;
        if (!marker) return;
        const fromPos = marker.getPosition();
        const from = { lat: fromPos.lat(), lng: fromPos.lng() };
        if (haversineMeters(from, { lat, lng }) >= 0.5) {
          const start = performance.now();
          const step = (now: number) => {
            if (cancelled) return;
            const t = Math.min(1, (now - start) / GLIDE_MS);
            const eased = easeInOutQuad(t);
            marker.setPosition(
              new google.maps.LatLng(from.lat + (lat - from.lat) * eased, from.lng + (lng - from.lng) * eased)
            );
            glideFrameRef.current = t < 1 ? requestAnimationFrame(step) : null;
          };
          glideFrameRef.current = requestAnimationFrame(step);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
      if (glideFrameRef.current != null) cancelAnimationFrame(glideFrameRef.current);
    };
  }, [lat, lng, label, color]);

  useEffect(() => {
    return () => {
      markerRef.current?.setMap(null);
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="w-full h-56 rounded-xl overflow-hidden border border-brand-border" />;
}
