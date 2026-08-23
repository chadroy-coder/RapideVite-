"use client";

import { useEffect, useRef } from "react";

// Leaflet + OpenStreetMap tiles - no API key, no billing, unlike Google
// Maps. Loaded dynamically (client-only) since Leaflet touches `window`.
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
        mapRef.current = L.map(containerRef.current).setView([lat, lng], 15);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(mapRef.current);
        const icon = L.divIcon({
          className: "",
          html: `<div style="background:${color};width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.4)"></div>`,
          iconSize: [16, 16],
        });
        markerRef.current = L.marker([lat, lng], { icon }).addTo(mapRef.current);
        if (label) markerRef.current.bindPopup(label);
      } else {
        mapRef.current.setView([lat, lng]);
        markerRef.current.setLatLng([lat, lng]);
      }
    }

    init();
    return () => {
      cancelled = true;
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
