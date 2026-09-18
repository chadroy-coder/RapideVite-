"use client";

import { useEffect, useRef, useState } from "react";
import { Locate, Check } from "lucide-react";
import { ensureLeafletCss, addBaseTileLayer } from "@/lib/leaflet-map";

type LatLng = { lat: number; lng: number };
type Pin = "pickup" | "dropoff";

const PICKUP_COLOR = "#0F8A5F";
const DROPOFF_COLOR = "#E5231B";
// Default center: Port-au-Prince, used until the user shares their
// location or taps the map themselves.
const DEFAULT_CENTER: [number, number] = [18.5944, -72.3074];

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- leaflet has no shipped types here (see src/types/leaflet.d.ts)
function pinIcon(L: any, color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.4)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 18],
  });
}

// One map for both ends of the trip, Uber-style: tap the map to drop
// whichever pin is currently active ("Depart" / "Destination" chips above
// the map), drag either pin to fine-tune it, and the map auto-advances from
// pickup to dropoff the first time so most riders only ever tap twice.
// Replaces the old two-separate-maps layout (LocationPicker.tsx x2) on the
// Woulib request form.
export function RouteLocationPicker({
  pickup,
  dropoff,
  onPickupChange,
  onDropoffChange,
}: {
  pickup: LatLng | null;
  dropoff: LatLng | null;
  onPickupChange: (pos: LatLng) => void;
  onDropoffChange: (pos: LatLng) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pickupMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dropoffMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const connectorRef = useRef<any>(null);
  const hasFramedRef = useRef(false);

  const [active, setActive] = useState<Pin>("pickup");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Refs so the map's click/drag handlers (registered once) always see the
  // latest callbacks/values without re-registering on every render. Synced
  // in an effect (not during render) per React's rules on ref mutation.
  const activeRef = useRef(active);
  const pickupRef = useRef(pickup);
  const dropoffRef = useRef(dropoff);
  const onPickupChangeRef = useRef(onPickupChange);
  const onDropoffChangeRef = useRef(onDropoffChange);
  useEffect(() => {
    activeRef.current = active;
    pickupRef.current = pickup;
    dropoffRef.current = dropoff;
    onPickupChangeRef.current = onPickupChange;
    onDropoffChangeRef.current = onDropoffChange;
  });

  function place(pin: Pin, pos: LatLng) {
    if (pin === "pickup") {
      const firstTime = !pickupRef.current;
      onPickupChangeRef.current(pos);
      // Auto-advance to dropoff the first time a pin is placed, so tapping
      // the map twice in a row naturally sets both ends of the trip.
      if (firstTime && !dropoffRef.current) setActive("dropoff");
    } else {
      onDropoffChangeRef.current(pos);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current || mapRef.current) return;
      ensureLeafletCss();
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      const start: [number, number] = pickupRef.current
        ? [pickupRef.current.lat, pickupRef.current.lng]
        : DEFAULT_CENTER;
      mapRef.current = L.map(containerRef.current).setView(start, 14);
      addBaseTileLayer(L, mapRef.current);

      mapRef.current.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        place(activeRef.current, { lat: e.latlng.lat, lng: e.latlng.lng });
      });
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the pickup marker in sync with the `pickup` prop (map click, drag,
  // or "Ma position"), without re-initializing the whole map.
  useEffect(() => {
    if (!mapRef.current || !pickup) return;
    (async () => {
      const L = await import("leaflet");
      if (!pickupMarkerRef.current) {
        pickupMarkerRef.current = L.marker([pickup.lat, pickup.lng], {
          icon: pinIcon(L, PICKUP_COLOR),
          draggable: true,
        }).addTo(mapRef.current);
        pickupMarkerRef.current.on("dragend", () => {
          const pos = pickupMarkerRef.current.getLatLng();
          setActive("pickup");
          place("pickup", { lat: pos.lat, lng: pos.lng });
        });
      } else {
        pickupMarkerRef.current.setLatLng([pickup.lat, pickup.lng]);
      }
    })();
  }, [pickup]);

  // Same for the dropoff marker.
  useEffect(() => {
    if (!mapRef.current || !dropoff) return;
    (async () => {
      const L = await import("leaflet");
      if (!dropoffMarkerRef.current) {
        dropoffMarkerRef.current = L.marker([dropoff.lat, dropoff.lng], {
          icon: pinIcon(L, DROPOFF_COLOR),
          draggable: true,
        }).addTo(mapRef.current);
        dropoffMarkerRef.current.on("dragend", () => {
          const pos = dropoffMarkerRef.current.getLatLng();
          setActive("dropoff");
          place("dropoff", { lat: pos.lat, lng: pos.lng });
        });
      } else {
        dropoffMarkerRef.current.setLatLng([dropoff.lat, dropoff.lng]);
      }
    })();
  }, [dropoff]);

  // Light dashed connector between the two pins (purely a visual preview -
  // the actual road-following route is computed separately for the fare
  // quote) plus view framing: fit both pins once they're both set, follow
  // whichever single pin is set before that, otherwise leave the default
  // Port-au-Prince view alone.
  useEffect(() => {
    if (!mapRef.current) return;
    (async () => {
      const L = await import("leaflet");
      const map = mapRef.current;

      if (connectorRef.current) {
        connectorRef.current.remove();
        connectorRef.current = null;
      }

      if (pickup && dropoff) {
        connectorRef.current = L.polyline(
          [
            [pickup.lat, pickup.lng],
            [dropoff.lat, dropoff.lng],
          ],
          { color: "#9CA3AF", weight: 2.5, dashArray: "5 7", opacity: 0.8 }
        ).addTo(map);
        if (!hasFramedRef.current) {
          map.fitBounds(connectorRef.current.getBounds(), { padding: [36, 36] });
          hasFramedRef.current = true;
        }
      } else if (pickup && !hasFramedRef.current) {
        map.setView([pickup.lat, pickup.lng], 15);
        hasFramedRef.current = true;
      } else if (dropoff && !hasFramedRef.current) {
        map.setView([dropoff.lat, dropoff.lng], 15);
        hasFramedRef.current = true;
      }
    })();
  }, [pickup, dropoff]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      pickupMarkerRef.current = null;
      dropoffMarkerRef.current = null;
      connectorRef.current = null;
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
        place(activeRef.current, { lat: pos.coords.latitude, lng: pos.coords.longitude });
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
    <div>
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => setActive("pickup")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${
            active === "pickup" ? "border-brand-orange bg-brand-orange/5 text-brand-ink" : "border-brand-border text-brand-gray"
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PICKUP_COLOR }} />
          Depart
          {pickup && <Check className="w-3.5 h-3.5 text-brand-green" />}
        </button>
        <button
          type="button"
          onClick={() => setActive("dropoff")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${
            active === "dropoff" ? "border-brand-orange bg-brand-orange/5 text-brand-ink" : "border-brand-border text-brand-gray"
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: DROPOFF_COLOR }} />
          Destination
          {dropoff && <Check className="w-3.5 h-3.5 text-brand-green" />}
        </button>
      </div>

      <div className="relative">
        <div ref={containerRef} className="w-full h-64 rounded-xl overflow-hidden border border-brand-border" />
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="absolute top-2 right-2 z-[1000] bg-white shadow-md rounded-full px-3 py-1.5 text-xs font-semibold text-brand-ink flex items-center gap-1.5 border border-brand-border disabled:opacity-60"
        >
          <Locate className="w-3.5 h-3.5 text-brand-orange" />
          {locating ? "..." : "Ma position"}
        </button>
      </div>

      {locationError ? (
        <p className="text-xs text-red-600 mt-1.5">{locationError}</p>
      ) : (
        <p className="text-xs text-brand-gray mt-1.5">
          Touchez la carte pour placer {active === "pickup" ? "le depart" : "la destination"}, ou utilisez votre position.
        </p>
      )}
    </div>
  );
}
