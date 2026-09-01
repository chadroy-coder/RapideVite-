import type { WoulibVehicleType } from "@/types/database";

// Real driving distance + duration via OSRM's free public routing server -
// same "no API key, no billing" philosophy as the Leaflet/OpenStreetMap map
// already used for driver tracking (src/components/order/LiveMap.tsx). No
// signup needed. The public demo server has fair-use limits; if Woulib
// volume grows, self-hosting an OSRM instance is a drop-in swap (just
// change OSRM_BASE_URL).
const OSRM_BASE_URL = "https://router.project-osrm.org";

export interface RouteEstimate {
  distanceKm: number;
  durationMinutes: number;
}

// OSRM wants "lng,lat" order (GeoJSON convention), not "lat,lng".
export async function getRouteEstimate(
  pickup: { lat: number; lng: number },
  dropoff: { lat: number; lng: number }
): Promise<RouteEstimate | null> {
  try {
    const coords = `${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}`;
    const res = await fetch(
      `${OSRM_BASE_URL}/route/v1/driving/${coords}?overview=false`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) return null;
    return {
      distanceKm: route.distance / 1000,
      durationMinutes: route.duration / 60,
    };
  } catch {
    // Network hiccup or OSRM demo server rate-limit - caller falls back to
    // straight-line distance so the customer still gets a (rougher) quote.
    return null;
  }
}

// Straight-line (haversine) fallback in km, used only if OSRM is
// unreachable - multiplied by 1.3 as a rough "roads aren't straight lines"
// correction factor so the fallback quote isn't wildly optimistic.
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 1.3;
}

export async function estimateRoute(
  pickup: { lat: number; lng: number },
  dropoff: { lat: number; lng: number }
): Promise<RouteEstimate> {
  const real = await getRouteEstimate(pickup, dropoff);
  if (real) return real;
  const distanceKm = haversineKm(pickup, dropoff);
  // ~25 km/h average fallback speed assumption (city driving in Port-au-Prince).
  return { distanceKm, durationMinutes: (distanceKm / 25) * 60 };
}

export function calculateFare(
  vehicleType: Pick<WoulibVehicleType, "base_fare" | "price_per_km" | "price_per_minute">,
  route: RouteEstimate
): number {
  const price =
    Number(vehicleType.base_fare) +
    Number(vehicleType.price_per_km) * route.distanceKm +
    Number(vehicleType.price_per_minute) * route.durationMinutes;
  // Round to nearest $0.25 - avoids ugly quotes like $4.37 for a cash-based
  // payment flow where exact change matters.
  return Math.round(price * 4) / 4;
}
