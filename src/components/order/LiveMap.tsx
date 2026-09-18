"use client";

import { useEffect, useRef } from "react";
import { ensureLeafletCss, addBaseTileLayer, easeInOutQuad } from "@/lib/leaflet-map";

// How long a marker takes to glide to an updated position instead of
// jumping there instantly - same idea as the Woulib live-route map, just
// without the route line/ETA/rotation (this component only ever shows a
// single static or slow-moving point: a driver console's view of the
// customer's fixed shared location, an admin's static pickup/dropoff pin,
// etc. - not a full "route toward a destination" tracker).
const GLIDE_MS = 1200;

// Leaflet + CARTO tiles (no API key, no billing, unlike Google Maps).
// Loaded dynamically (client-only) since Leaflet touches `window`.
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- leaflet has no shipped types here (see src/types/leaflet.d.ts)
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  const glideFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current) return;
      ensureLeafletCss();
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current).setView([lat, lng], 15);
        addBaseTileLayer(L, mapRef.current);
        const icon = L.divIcon({
          className: "",
          html: `<div style="background:${color};width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.4)"></div>`,
          iconSize: [16, 16],
        });
        markerRef.current = L.marker([lat, lng], { icon }).addTo(mapRef.current);
        if (label) markerRef.current.bindPopup(label);
      } else {
        mapRef.current.setView([lat, lng]);

        if (glideFrameRef.current != null) cancelAnimationFrame(glideFrameRef.current);
        const marker = markerRef.current;
        const from = marker.getLatLng();
        const to = L.latLng(lat, lng);
        if (from.distanceTo(to) >= 0.5) {
          const start = performance.now();
          const step = (now: number) => {
            if (cancelled) return;
            const t = Math.min(1, (now - start) / GLIDE_MS);
            const eased = easeInOutQuad(t);
            marker.setLatLng([from.lat + (to.lat - from.lat) * eased, from.lng + (to.lng - from.lng) * eased]);
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
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="w-full h-56 rounded-xl overflow-hidden border border-brand-border" />;
}
