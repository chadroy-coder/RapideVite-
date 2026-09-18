"use client";

import { useEffect, useRef, useState } from "react";
import { Locate, Check } from "lucide-react";
import { loadGoogleMaps, MAP_STYLES, dotIcon, dashedLineIcons, type GeoPoint } from "@/lib/google-map";

type LatLng = GeoPoint;
type Pin = "pickup" | "dropoff";

const PICKUP_COLOR = "#0F8A5F";
const DROPOFF_COLOR = "#E5231B";
// Default center: Port-au-Prince, used until the user shares their
// location or taps the map themselves.
const DEFAULT_CENTER: LatLng = { lat: 18.5944, lng: -72.3074 };

// One map for both ends of the trip, Uber-style: tap the map to drop
// whichever pin is currently active ("Depart" / "Destination" chips above
// the map), drag either pin to fine-tune it, and the map auto-advances from
// pickup to dropoff the first time so most riders only ever tap twice.
// Built on the Google Maps JavaScript API (see src/lib/google-map.ts).
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- no @types/google.maps here, see src/lib/google-map.ts
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
      const google = await loadGoogleMaps();
      if (cancelled || !containerRef.current) return;

      const start = pickupRef.current ?? DEFAULT_CENTER;
      const map = new google.maps.Map(containerRef.current, {
        center: start,
        zoom: 14,
        styles: MAP_STYLES,
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false,
        // Without this, Google Maps defaults to requiring two fingers to pan
        // on touch (so a single-finger swipe scrolls the page instead) -
        // fine for a map buried in a long page, but this map IS the main
        // interaction (tapping/dragging to drop pins), so one finger should
        // just work like every ride-hailing app.
        gestureHandling: "greedy",
      });
      mapRef.current = map;

      map.addListener("click", (e: { latLng: { lat: () => number; lng: () => number } }) => {
        place(activeRef.current, { lat: e.latLng.lat(), lng: e.latLng.lng() });
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
      const google = await loadGoogleMaps();
      const map = mapRef.current;
      if (!map) return;
      if (!pickupMarkerRef.current) {
        const marker = new google.maps.Marker({
          position: pickup,
          map,
          draggable: true,
          icon: dotIcon(google, PICKUP_COLOR),
        });
        marker.addListener("dragend", () => {
          const pos = marker.getPosition();
          setActive("pickup");
          place("pickup", { lat: pos.lat(), lng: pos.lng() });
        });
        pickupMarkerRef.current = marker;
      } else {
        pickupMarkerRef.current.setPosition(pickup);
      }
    })();
  }, [pickup]);

  // Same for the dropoff marker.
  useEffect(() => {
    if (!mapRef.current || !dropoff) return;
    (async () => {
      const google = await loadGoogleMaps();
      const map = mapRef.current;
      if (!map) return;
      if (!dropoffMarkerRef.current) {
        const marker = new google.maps.Marker({
          position: dropoff,
          map,
          draggable: true,
          icon: dotIcon(google, DROPOFF_COLOR),
        });
        marker.addListener("dragend", () => {
          const pos = marker.getPosition();
          setActive("dropoff");
          place("dropoff", { lat: pos.lat(), lng: pos.lng() });
        });
        dropoffMarkerRef.current = marker;
      } else {
        dropoffMarkerRef.current.setPosition(dropoff);
      }
    })();
  }, [dropoff]);

  // Dashed connector between the two pins (purely a visual preview - the
  // actual road-following route is computed separately for the fare quote)
  // plus view framing: fit both pins once they're both set, follow whichever
  // single pin is set before that, otherwise leave the default view alone.
  useEffect(() => {
    if (!mapRef.current) return;
    (async () => {
      const google = await loadGoogleMaps();
      const map = mapRef.current;
      if (!map) return;

      if (pickup && dropoff) {
        if (!connectorRef.current) {
          connectorRef.current = new google.maps.Polyline({
            path: [pickup, dropoff],
            strokeOpacity: 0,
            icons: dashedLineIcons(google, "#9CA3AF"),
            map,
          });
        } else {
          connectorRef.current.setPath([pickup, dropoff]);
          connectorRef.current.setMap(map);
        }
        if (!hasFramedRef.current) {
          const bounds = new google.maps.LatLngBounds();
          bounds.extend(pickup);
          bounds.extend(dropoff);
          map.fitBounds(bounds, 36);
          hasFramedRef.current = true;
        }
      } else {
        connectorRef.current?.setMap(null);
        if (pickup && !hasFramedRef.current) {
          map.setCenter(pickup);
          map.setZoom(15);
          hasFramedRef.current = true;
        } else if (dropoff && !hasFramedRef.current) {
          map.setCenter(dropoff);
          map.setZoom(15);
          hasFramedRef.current = true;
        }
      }
    })();
  }, [pickup, dropoff]);

  useEffect(() => {
    return () => {
      pickupMarkerRef.current?.setMap(null);
      dropoffMarkerRef.current?.setMap(null);
      connectorRef.current?.setMap(null);
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
