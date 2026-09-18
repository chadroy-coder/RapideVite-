"use client";

import { useEffect, useRef, useState } from "react";
import { Locate, Check } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapLibreMap, Marker as MapLibreMarker, GeoJSONSource } from "maplibre-gl";
import { MAP_STYLE_URL, buildPinElement, toLngLat, type GeoPoint } from "@/lib/maplibre-map";

type LatLng = GeoPoint;
type Pin = "pickup" | "dropoff";

const PICKUP_COLOR = "#0F8A5F";
const DROPOFF_COLOR = "#E5231B";
// Default center: Port-au-Prince, used until the user shares their
// location or taps the map themselves. MapLibre wants [lng, lat].
const DEFAULT_CENTER: [number, number] = [-72.3074, 18.5944];
const CONNECTOR_SOURCE_ID = "route-connector";
const CONNECTOR_LAYER_ID = "route-connector-line";

// One map for both ends of the trip, Uber-style: tap the map to drop
// whichever pin is currently active ("Depart" / "Destination" chips above
// the map), drag either pin to fine-tune it, and the map auto-advances from
// pickup to dropoff the first time so most riders only ever tap twice.
// Built on MapLibre GL JS + OpenFreeMap vector tiles (see src/lib/maplibre-map.ts).
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
  const mapRef = useRef<MapLibreMap | null>(null);
  const pickupMarkerRef = useRef<MapLibreMarker | null>(null);
  const dropoffMarkerRef = useRef<MapLibreMarker | null>(null);
  const styleLoadedRef = useRef(false);
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

  function syncConnector(map: MapLibreMap) {
    const source = map.getSource(CONNECTOR_SOURCE_ID) as GeoJSONSource | undefined;
    if (!source) return;
    const p = pickupRef.current;
    const d = dropoffRef.current;
    if (p && d) {
      source.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [toLngLat(p), toLngLat(d)] },
      });
      if (map.getLayer(CONNECTOR_LAYER_ID)) {
        map.setLayoutProperty(CONNECTOR_LAYER_ID, "visibility", "visible");
      }
    } else if (map.getLayer(CONNECTOR_LAYER_ID)) {
      map.setLayoutProperty(CONNECTOR_LAYER_ID, "visibility", "none");
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current || mapRef.current) return;
      const maplibregl = await import("maplibre-gl");
      if (cancelled || !containerRef.current) return;

      const start: [number, number] = pickupRef.current ? toLngLat(pickupRef.current) : DEFAULT_CENTER;
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: MAP_STYLE_URL,
        center: start,
        zoom: 14,
        attributionControl: { compact: true },
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");

      map.on("load", () => {
        if (cancelled) return;
        map.addSource(CONNECTOR_SOURCE_ID, {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [start, start] } },
        });
        map.addLayer({
          id: CONNECTOR_LAYER_ID,
          type: "line",
          source: CONNECTOR_SOURCE_ID,
          layout: { "line-cap": "round", visibility: "none" },
          paint: { "line-color": "#9CA3AF", "line-width": 2.5, "line-dasharray": [2, 2.5], "line-opacity": 0.8 },
        });
        styleLoadedRef.current = true;
        syncConnector(map);
        if (pickupRef.current && dropoffRef.current && !hasFramedRef.current) {
          const bounds = new maplibregl.LngLatBounds(toLngLat(pickupRef.current), toLngLat(pickupRef.current));
          bounds.extend(toLngLat(dropoffRef.current));
          map.fitBounds(bounds, { padding: 36, maxZoom: 16 });
          hasFramedRef.current = true;
        }
      });

      map.on("click", (e) => {
        place(activeRef.current, { lat: e.lngLat.lat, lng: e.lngLat.lng });
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
      const maplibregl = await import("maplibre-gl");
      const map = mapRef.current;
      if (!map) return;
      if (!pickupMarkerRef.current) {
        const marker = new maplibregl.Marker({ element: buildPinElement(PICKUP_COLOR), draggable: true, anchor: "bottom" })
          .setLngLat(toLngLat(pickup))
          .addTo(map);
        marker.on("dragend", () => {
          const pos = marker.getLngLat();
          setActive("pickup");
          place("pickup", { lat: pos.lat, lng: pos.lng });
        });
        pickupMarkerRef.current = marker;
      } else {
        pickupMarkerRef.current.setLngLat(toLngLat(pickup));
      }
    })();
  }, [pickup]);

  // Same for the dropoff marker.
  useEffect(() => {
    if (!mapRef.current || !dropoff) return;
    (async () => {
      const maplibregl = await import("maplibre-gl");
      const map = mapRef.current;
      if (!map) return;
      if (!dropoffMarkerRef.current) {
        const marker = new maplibregl.Marker({ element: buildPinElement(DROPOFF_COLOR), draggable: true, anchor: "bottom" })
          .setLngLat(toLngLat(dropoff))
          .addTo(map);
        marker.on("dragend", () => {
          const pos = marker.getLngLat();
          setActive("dropoff");
          place("dropoff", { lat: pos.lat, lng: pos.lng });
        });
        dropoffMarkerRef.current = marker;
      } else {
        dropoffMarkerRef.current.setLngLat(toLngLat(dropoff));
      }
    })();
  }, [dropoff]);

  // Dashed connector between the two pins (purely a visual preview - the
  // actual road-following route is computed separately for the fare quote)
  // plus view framing: fit both pins once they're both set, follow whichever
  // single pin is set before that, otherwise leave the default view alone.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (styleLoadedRef.current) syncConnector(map);

    (async () => {
      const maplibregl = await import("maplibre-gl");
      if (pickup && dropoff) {
        if (!hasFramedRef.current) {
          const bounds = new maplibregl.LngLatBounds(toLngLat(pickup), toLngLat(pickup));
          bounds.extend(toLngLat(dropoff));
          map.fitBounds(bounds, { padding: 36, maxZoom: 16 });
          hasFramedRef.current = true;
        }
      } else if (pickup && !hasFramedRef.current) {
        map.jumpTo({ center: toLngLat(pickup), zoom: 15 });
        hasFramedRef.current = true;
      } else if (dropoff && !hasFramedRef.current) {
        map.jumpTo({ center: toLngLat(dropoff), zoom: 15 });
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
