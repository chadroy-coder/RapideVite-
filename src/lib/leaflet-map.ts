// Shared helpers for every Leaflet map in the app (Woulib ride tracking,
// grocery order tracking, driver consoles, admin static views). Centralizes
// the bits that were previously copy-pasted into each map component:
// - injecting the Leaflet stylesheet once
// - the CARTO Voyager tile layer (cleaner, more muted than stock OSM tiles -
//   closer to the map style riders are used to from Uber/Lyft) and its
//   required attribution, with Leaflet's own "Leaflet" branding link
//   suppressed (map.attributionControl.setPrefix(false)) so the corner of
//   the map reads "© OpenStreetMap contributors © CARTO" instead of
//   "Leaflet | © OpenStreetMap contributors © CARTO" - the OSM/CARTO credit
//   is required by their terms, the "Leaflet" library self-credit is not.
// - small geo helpers (distance, bearing) used for smooth marker glide and
//   direction-of-travel icon rotation.

export function ensureLeafletCss() {
  if (typeof document === "undefined") return;
  if (document.getElementById("leaflet-css")) return;
  const link = document.createElement("link");
  link.id = "leaflet-css";
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(link);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- leaflet has no shipped types here (see src/types/leaflet.d.ts)
export function addBaseTileLayer(L: any, map: any) {
  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; OpenStreetMap contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 20,
    detectRetina: true,
  }).addTo(map);
  // Keep the required tile-provider credit, drop Leaflet's own "Leaflet"
  // self-link from the attribution corner.
  map.attributionControl?.setPrefix(false);
}

export interface GeoPoint {
  lat: number;
  lng: number;
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
