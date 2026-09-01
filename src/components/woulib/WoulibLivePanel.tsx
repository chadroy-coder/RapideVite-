"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getWoulibLiveState, cancelWoulibRequest } from "@/lib/actions/woulib";
import { useToastStore } from "@/store/toast-store";
import { WoulibTracker } from "./WoulibTracker";
import { LiveRouteMap } from "./LiveRouteMap";
import type { WoulibStatus } from "@/types/database";

const POLL_MS = 8000;
// If the driver's phone hasn't pinged in this long, hide the map rather
// than show a frozen, misleading position - same threshold as orders.
const STALE_LOCATION_MS = 15 * 60 * 1000;

interface DriverLocation {
  lat: number | null;
  lng: number | null;
  updatedAt: string | null;
}

export function WoulibLivePanel({
  requestId,
  initialStatus,
  initialDriverLocation,
  pickup,
  dropoff,
}: {
  requestId: string;
  initialStatus: WoulibStatus;
  initialDriverLocation: DriverLocation;
  pickup: { lat: number; lng: number; address: string | null };
  dropoff: { lat: number; lng: number; address: string | null };
}) {
  const router = useRouter();
  const push = useToastStore((s) => s.push);
  const [status, setStatus] = useState<WoulibStatus>(initialStatus);
  const [driverLocation, setDriverLocation] = useState<DriverLocation>(initialDriverLocation);
  const [cancelling, setCancelling] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    // No point polling once the request has reached a terminal state.
    if (status === "completed" || status === "cancelled") return;
    const interval = setInterval(async () => {
      const state = await getWoulibLiveState(requestId);
      if (!mountedRef.current || !state) return;
      setStatus(state.status as WoulibStatus);
      setDriverLocation({
        lat: state.driver_lat,
        lng: state.driver_lng,
        updatedAt: state.driver_location_updated_at,
      });
    }, POLL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [requestId, status]);

  const [showMap, setShowMap] = useState(false);
  useEffect(() => {
    function recompute() {
      setShowMap(
        driverLocation.lat != null &&
          driverLocation.lng != null &&
          driverLocation.updatedAt != null &&
          Date.now() - new Date(driverLocation.updatedAt).getTime() < STALE_LOCATION_MS
      );
    }
    recompute();
    const interval = setInterval(recompute, 30000);
    return () => clearInterval(interval);
  }, [driverLocation]);

  async function handleCancel() {
    setCancelling(true);
    const result = await cancelWoulibRequest(requestId);
    setCancelling(false);
    if (result.error) {
      push(result.error, "error");
      return;
    }
    setStatus("cancelled");
    push("Demande annulee", "success");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="border border-brand-border rounded-2xl p-5">
        <WoulibTracker status={status} />
      </div>

      {showMap && (
        <div>
          <h2 className="font-semibold text-brand-ink mb-2 text-sm">
            {status === "picked_up" || status === "en_route_dropoff" ? "Route vers l'arrivee" : "Route vers le depart"}
          </h2>
          <LiveRouteMap
            driver={{ lat: driverLocation.lat!, lng: driverLocation.lng! }}
            destination={
              status === "picked_up" || status === "en_route_dropoff"
                ? { lat: dropoff.lat, lng: dropoff.lng }
                : { lat: pickup.lat, lng: pickup.lng }
            }
            destinationLabel={
              status === "picked_up" || status === "en_route_dropoff"
                ? dropoff.address ?? "Arrivee"
                : pickup.address ?? "Depart"
            }
          />
        </div>
      )}

      {status === "requested" && (
        <button
          type="button"
          onClick={handleCancel}
          disabled={cancelling}
          className="w-full rounded-full border border-red-300 text-red-600 font-semibold py-3 disabled:opacity-50"
        >
          {cancelling ? "Annulation..." : "Annuler la demande"}
        </button>
      )}
    </div>
  );
}
