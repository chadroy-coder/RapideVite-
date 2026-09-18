// Shared helpers for every Google Map in the app (Woulib ride tracking,
// grocery order tracking, driver consoles, admin static views). Replaces
// src/lib/maplibre-map.ts - OpenFreeMap's tiles weren't loading reliably, so
// the app now runs on the Google Maps JavaScript API instead (requires
// NEXT_PUBLIC_GOOGLE_MAPS_API_KEY - see .env.example).
//
// No @types/google.maps package here (avoiding another npm install in a
// sandbox where package installs have been flaky) - google.maps is treated
// as `any` throughout, same convention this codebase already used for
// Leaflet before it shipped no types either.

declare global {
  interface Window {
    google?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

// Loads the Google Maps JS API exactly once (script-tag approach - no extra
// npm dependency). Subsequent calls reuse the same in-flight/resolved
// promise so multiple map components mounting at once don't inject the
// script twice.
let loaderPromise: Promise<any> | null = null; // eslint-disable-line @typescript-eslint/no-explicit-any

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadGoogleMaps(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser"));
  }
  if (window.google?.maps) return Promise.resolve(window.google);
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) {
      reject(new Error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"));
      return;
    }
    const callbackName = "__rapidviteGoogleMapsReady";
    (window as unknown as Record<string, unknown>)[callbackName] = () => resolve(window.google);
    const script = document.createElement("script");
    script.id = "google-maps-js";
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&callback=${callbackName}`;
    script.onerror = () => reject(new Error("Failed to load the Google Maps script"));
    document.head.appendChild(script);
  });
  return loaderPromise;
}

// A clean, muted basemap ("Silver"-style) closer to Uber/Lyft's look than
// Google's default candy-colored roads and heavy POI icons.
export const MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#f2f3f0" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f2f3f0" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#e2e2e2" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#ececec" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c2c8ca" }] },
];

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}
function toDeg(rad: number) {
  return (rad * 180) / Math.PI;
}

// Initial compass bearing (0-360, 0 = north) from point a to point b - used
// to rotate the vehicle marker to face its direction of travel.
export function bearingBetween(a: GeoPoint, b: GeoPoint) {
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function haversineMeters(a: GeoPoint, b: GeoPoint) {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function easeInOutQuad(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// A rotating direction-arrow icon (google.maps.Symbol) for the driver/rider
// vehicle marker - Google's built-in FORWARD_CLOSED_ARROW path plus a
// `rotation` in degrees does exactly the "rotate to face direction of
// travel" job Uber/Lyft's car icon does, with no custom SVG path or
// Advanced-Marker Map ID setup required.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function vehicleIcon(google: any, color: string, bearingDeg: number) {
  return {
    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
    scale: 6,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
    rotation: bearingDeg,
    anchor: new google.maps.Point(0, 2.6),
  };
}

// A small colored dot with a white ring - used for pickup/dropoff/
// destination pins and the plain single-position dot map.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dotIcon(google: any, color: string, scale = 8) {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 3,
  };
}

// Google Polylines don't take a simple dashArray - dashes are faked by
// drawing the stroke fully transparent and repeating a short line symbol
// along the path instead. Used for the straight-line fallback route (when
// Directions is unreachable) so it still reads as "approximate", same as
// the dashed fallback line the app used under Leaflet/MapLibre.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dashedLineIcons(google: any, color: string) {
  return [
    {
      icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeColor: color, scale: 3 },
      offset: "0",
      repeat: "12px",
    },
  ];
}
