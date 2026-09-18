// Shared helpers for every MapLibre GL map in the app (Woulib ride tracking,
// grocery order tracking, driver consoles, admin static views). Replaces the
// old src/lib/leaflet-map.ts now that the app has moved off Leaflet's raster
// tiles onto MapLibre GL JS + OpenFreeMap's free vector tiles - smoother
// pan/zoom/rotation, closer to what Uber/Lyft actually use under the hood.
//
// OpenFreeMap (https://openfreemap.org) hosts these styles for free, with no
// API key and no request cap (unlike Mapbox/Google, which meter and bill).
// "positron" is a clean, muted basemap - closer to Uber/Lyft's look than a
// stock OSM raster tile would be.
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

export interface GeoPoint {
  lat: number;
  lng: number;
}

// MapLibre (like all GeoJSON-based mapping) takes coordinates as
// [lng, lat] - the opposite order from our GeoPoint objects and from
// Leaflet's [lat, lng]. Centralizing the conversion here avoids scattering
// `[p.lng, p.lat]` swaps (and the bugs from getting one backwards) across
// every map component.
export function toLngLat(p: GeoPoint): [number, number] {
  return [p.lng, p.lat];
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}
function toDeg(rad: number) {
  return (rad * 180) / Math.PI;
}

// Initial compass bearing (0-360, 0 = north) from point a to point b - used
// to rotate a vehicle icon to face its direction of travel.
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

// A small car/moto glyph inside a circle badge, pointing "up" (north) by
// default and rotated to face the direction of travel. At marker size
// (26px) a literal silhouette would read as a blob, so each shape is
// simplified to its most recognizable feature: a car's boxy body, a moto's
// narrow frame with two wheels - both still clearly distinct from each other
// and unambiguous about heading, same idea as Uber/Lyft's rotating pin.
export function vehicleGlyphSvg(kind: "moto" | "car" | undefined, color: string) {
  const body =
    kind === "moto"
      ? `<circle cx="13" cy="8" r="2.1" fill="white"/>
         <rect x="11.5" y="10" width="3" height="7" rx="1.2" fill="white"/>
         <circle cx="13" cy="18.5" r="2.3" fill="white"/>`
      : `<rect x="9" y="6.5" width="8" height="11" rx="2.4" fill="white"/>
         <rect x="10.3" y="8.5" width="5.4" height="3.2" rx="1" fill="${color}"/>`;
  return `
    <svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
      <circle cx="13" cy="13" r="11.5" fill="${color}" stroke="white" stroke-width="2.5"/>
      ${body}
    </svg>`;
}

// A teardrop map pin (pickup/dropoff/destination style), as a plain DOM
// element for use with `new maplibregl.Marker({ element })`.
export function buildPinElement(color: string): HTMLDivElement {
  const el = document.createElement("div");
  el.style.width = "18px";
  el.style.height = "18px";
  el.style.background = color;
  el.style.borderRadius = "50% 50% 50% 0";
  el.style.transform = "rotate(-45deg)";
  el.style.border = "3px solid white";
  el.style.boxShadow = "0 0 6px rgba(0,0,0,0.4)";
  return el;
}

// A rotating vehicle badge, as a plain DOM element for use with
// `new maplibregl.Marker({ element, rotationAlignment: "map" })`. The
// rotation is applied via CSS transform on an inner wrapper (not the marker
// element MapLibre itself positions), matching the pattern the old Leaflet
// divIcon used, so drop-shadow/anchor math doesn't fight MapLibre's own
// translate transform on the outer element.
export function buildVehicleElement(kind: "moto" | "car" | undefined, color: string): { el: HTMLDivElement; inner: HTMLDivElement } {
  const el = document.createElement("div");
  el.style.width = "26px";
  el.style.height = "26px";
  const inner = document.createElement("div");
  inner.style.width = "26px";
  inner.style.height = "26px";
  inner.style.transition = "transform 0.4s ease";
  inner.style.filter = "drop-shadow(0 1px 3px rgba(0,0,0,0.35))";
  inner.innerHTML = vehicleGlyphSvg(kind, color);
  el.appendChild(inner);
  return { el, inner };
}

export function setVehicleBearing(inner: HTMLDivElement, bearingDeg: number) {
  inner.style.transform = `rotate(${bearingDeg}deg)`;
}

// Adding a GeoJSON source/layer (unlike a Marker) requires the map's style
// to have finished loading - call and await this before any addSource/
// addLayer/getSource call. Resolves immediately if the style is already
// loaded (the common case after the very first render).
export async function ensureStyleLoaded(map: { isStyleLoaded: () => boolean | void; once: (type: "load", listener: () => void) => unknown }) {
  if (map.isStyleLoaded()) return;
  await new Promise<void>((resolve) => {
    map.once("load", () => resolve());
  });
}
