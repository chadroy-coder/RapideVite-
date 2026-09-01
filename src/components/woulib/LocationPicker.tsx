"use client";

import { useEffect, useRef, useState } from "react";
import { Locate } from "lucide-react";

// Click-to-place-a-pin map for choosing pickup/dropoff points, built on the
// same Leaflet + OpenStreetMap setup as LiveMap.tsx (no API key, no
// billing). Kept separate from LiveMap since that one is read-only
// (renders a single live-updating position) while this one needs click
// handling and a draggable marker.
export function LocationPicker({
  value,
  onChange,
  color = "#E5231B",
}: {
  value: { lat: number; lng: number } | null;
  onChange: (pos: { lat: number; lng: number }) => void;
  color?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- leaflet has no shipped types here (see src/types/leaflet.d.ts)
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Default center: Port-au-Prince, used until the user shares their
  // location or clicks the map themselves.
  const DEFAULT_CENTER: [number, number] = [18.5944, -72.3074];

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current || mapRef.current) return;
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      const start: [number, number] = value ? [value.lat, value.lng] : DEFAULT_CENTER;
      mapRef.current = L.map(containerRef.current).setView(start, 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(mapRef.current);

      const icon = L.divIcon({
        className: "",
        html: `<div style="background:${color};width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.4)"></div>`,
        iconSize: [18, 18],
      });

      if (value) {
        markerRef.current = L.marker([value.lat, value.lng], { icon, draggable: true }).addTo(mapRef.current);
      }

      mapRef.current.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        const { lat, lng } = e.latlng;
        if (!markerRef.current) {
          markerRef.current = L.marker([lat, lng], { icon, draggable: true }).addTo(mapRef.current);
          markerRef.current.on("dragend", () => {
            const pos = markerRef.current.getLatLng();
            onChangeRef.current({ lat: pos.lat, lng: pos.lng });
          });
        } else {
          markerRef.current.setLatLng([lat, lng]);
        }
        onChangeRef.current({ lat, lng });
      });

      if (markerRef.current) {
        markerRef.current.on("dragend", () => {
          const pos = markerRef.current.getLatLng();
          onChangeRef.current({ lat: pos.lat, lng: pos.lng });
        });
      }
    }

    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map is initialized once; external `value` changes are synced in the effect below
  }, []);

  // Keep the marker in sync if `value` changes from outside (e.g. the "use
  // my location" button), without re-initializing the whole map.
  useEffect(() => {
    if (!mapRef.current || !value) return;
    (async () => {
      const L = await import("leaflet");
      if (!markerRef.current) {
        const icon = L.divIcon({
          className: "",
          html: `<div style="background:${color};width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.4)"></div>`,
          iconSize: [18, 18],
        });
        markerRef.current = L.marker([value.lat, value.lng], { icon, draggable: true }).addTo(mapRef.current);
        markerRef.current.on("dragend", () => {
          const pos = markerRef.current.getLatLng();
          onChangeRef.current({ lat: pos.lat, lng: pos.lng });
        });
      } else {
        markerRef.current.setLatLng([value.lat, value.lng]);
      }
      mapRef.current.setView([value.lat, value.lng], 15);
    })();
  }, [value, color]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  function useMyLocation() {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Votre navigateur ne supporte pas la localisation.");
      return;
    }
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      setLocationError("La localisation necessite une connexion securisee (https).");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError("Localisation refusee - autorisez l'acces a votre position dans les parametres du navigateur.");
        } else if (err.code === err.TIMEOUT) {
          setLocationError("La recherche de votre position a pris trop de temps. Reessayez.");
        } else {
          setLocationError("Impossible d'obtenir votre position. Touchez la carte pour placer le point manuellement.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="relative">
      <div ref={containerRef} className="w-full h-52 rounded-xl overflow-hidden border border-brand-border" />
      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating}
        className="absolute top-2 right-2 z-[1000] bg-white shadow-md rounded-full px-3 py-1.5 text-xs font-semibold text-brand-ink flex items-center gap-1.5 border border-brand-border disabled:opacity-60"
      >
        <Locate className="w-3.5 h-3.5 text-brand-orange" />
        {locating ? "..." : "Ma position"}
      </button>
      {locationError ? (
        <p className="text-xs text-red-600 mt-1.5">{locationError}</p>
      ) : (
        !value && (
          <p className="text-xs text-brand-gray mt-1.5">Touchez la carte pour placer le point, ou utilisez votre position.</p>
        )
      )}
    </div>
  );
}
