"use client";

import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import { MAP_STYLE_URL, easeInOutQuad, haversineMeters } from "@/lib/maplibre-map";

// How long a marker takes to glide to an updated position instead of
// jumping there instantly - same idea as the Woulib live-route map, just
// without the route line/ETA/rotation (this component only ever shows a
// single static or slow-moving point: a driver console's view of the
// customer's fixed shared location, an admin's static pickup/dropoff pin,
// etc. - not a full "route toward a destination" tracker).
const GLIDE_MS = 1200;

// MapLibre GL JS + OpenFreeMap vector tiles (no API key, no billing, unlike
// Google Maps). Loaded dynamically (client-only) since MapLibre touches
// `window`/WebGL at map-construction time.
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
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<MapLibreMarker | null>(null);
  const glideFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current) return;
      const maplibregl = await import("maplibre-gl");
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = new maplibregl.Map({
          container: containerRef.current,
          style: MAP_STYLE_URL,
          center: [lng, lat],
          zoom: 15,
          attributionControl: { compact: true },
        });
        const el = document.createElement("div");
        el.style.background = color;
        el.style.width = "16px";
        el.style.height = "16px";
        el.style.borderRadius = "50%";
        el.style.border = "3px solid white";
        el.style.boxShadow = "0 0 6px rgba(0,0,0,0.4)";
        const marker = new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([lng, lat]).addTo(mapRef.current);
        if (label) marker.setPopup(new maplibregl.Popup({ offset: 12 }).setText(label));
        markerRef.current = marker;
      } else {
        mapRef.current.setCenter([lng, lat]);

        if (glideFrameRef.current != null) cancelAnimationFrame(glideFrameRef.current);
        const marker = markerRef.current;
        if (!marker) return;
        const from = marker.getLngLat();
        if (haversineMeters({ lat: from.lat, lng: from.lng }, { lat, lng }) >= 0.5) {
          const start = performance.now();
          const step = (now: number) => {
            if (cancelled) return;
            const t = Math.min(1, (now - start) / GLIDE_MS);
            const eased = easeInOutQuad(t);
            marker.setLngLat([from.lng + (lng - from.lng) * eased, from.lat + (lat - from.lat) * eased]);
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
      markerRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="w-full h-56 rounded-xl overflow-hidden border border-brand-border" />;
}
