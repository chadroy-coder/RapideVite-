"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, X, RefreshCw, PackageX } from "lucide-react";
import { getOrderLiveState, respondToSubstitute } from "@/lib/actions/orders";
import { useToastStore } from "@/store/toast-store";
import { formatUSD } from "@/lib/format";
import type { OrderItem } from "@/types/database";
import { LiveMap } from "./LiveMap";

const POLL_MS = 8000;
// If the driver's phone hasn't pinged in this long, treat the dot as stale
// and hide the map rather than show a frozen, misleading position.
const STALE_LOCATION_MS = 15 * 60 * 1000;

interface DriverLocation {
  lat: number | null;
  lng: number | null;
  updatedAt: string | null;
}

export function LiveOrderPanel({
  orderId,
  initialItems,
  initialDriverLocation,
}: {
  orderId: string;
  initialItems: OrderItem[];
  initialDriverLocation: DriverLocation;
}) {
  const push = useToastStore((s) => s.push);
  const [items, setItems] = useState<OrderItem[]>(initialItems);
  const [driverLocation, setDriverLocation] = useState<DriverLocation>(initialDriverLocation);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const interval = setInterval(async () => {
      const state = await getOrderLiveState(orderId);
      if (!mountedRef.current) return;
      if (state.order) {
        setDriverLocation({
          lat: state.order.driver_lat,
          lng: state.order.driver_lng,
          updatedAt: state.order.driver_location_updated_at,
        });
      }
      if (state.items.length > 0) {
        setItems((prev) =>
          prev.map((item) => {
            const fresh = state.items.find((i) => i.id === item.id);
            return fresh ? { ...item, ...fresh } : item;
          })
        );
      }
    }, POLL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [orderId]);

  async function handleRespond(itemId: string, accept: boolean) {
    setRespondingId(itemId);
    const result = await respondToSubstitute(orderId, itemId, accept);
    setRespondingId(null);
    if (result.error) {
      push(result.error, "error");
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, fulfillment_status: accept ? "substituted" : "refunded", substitute_status: accept ? "accepted" : "declined" }
          : item
      )
    );
    push(accept ? "Remplacement accepte" : "Article rembourse", "success");
  }

  // Freshness check needs Date.now(), which is impure - compute it in an
  // effect (allowed to be impure) instead of directly in the render body.
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

  return (
    <div className="space-y-4">
      {showMap && (
        <div>
          <h2 className="font-semibold text-brand-ink mb-2 text-sm">Position du livreur</h2>
          <LiveMap lat={driverLocation.lat!} lng={driverLocation.lng!} label="Votre livreur" />
        </div>
      )}

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="text-sm border-b border-brand-border last:border-0 pb-2 last:pb-0">
            <div className="flex justify-between items-center gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-brand-cream border border-brand-border shrink-0">
                  <Image
                    src={item.product?.image_url || "/products/placeholder.svg"}
                    alt={item.product_name}
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                </div>
                <span className={item.fulfillment_status === "refunded" ? "text-brand-gray line-through" : "text-brand-ink"}>
                  {item.quantity} x {item.product_name}
                  {item.variant_label ? ` (${item.variant_label})` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-brand-gray">{formatUSD(item.line_total)}</span>
                <ItemStatusBadge status={item.fulfillment_status} />
              </div>
            </div>

            {item.substitute_status === "proposed" && (
              <div className="mt-2 border border-brand-orange/30 bg-brand-orange/5 rounded-xl p-3 text-xs">
                <p className="font-medium text-brand-ink mb-2">
                  &quot;{item.product_name}&quot; n&apos;est pas disponible. Remplacer par{" "}
                  <span className="font-semibold">{item.substitute_product?.name ?? "cet article"}</span> ?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={respondingId === item.id}
                    onClick={() => handleRespond(item.id, true)}
                    className="rounded-full bg-brand-green text-white font-semibold px-4 py-1.5 disabled:opacity-50"
                  >
                    Oui, remplacer
                  </button>
                  <button
                    type="button"
                    disabled={respondingId === item.id}
                    onClick={() => handleRespond(item.id, false)}
                    className="rounded-full border border-red-300 text-red-600 font-semibold px-4 py-1.5 disabled:opacity-50"
                  >
                    Non, rembourser
                  </button>
                </div>
              </div>
            )}

            {(item.fulfillment_status === "substituted") && item.substitute_product && (
              <p className="text-xs text-brand-gray mt-1">
                Remplace par : <span className="text-brand-ink font-medium">{item.substitute_product.name}</span>
                {item.substitute_status === "auto_applied" && " (delai depasse, remplacement automatique)"}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ItemStatusBadge({ status }: { status: OrderItem["fulfillment_status"] }) {
  switch (status) {
    case "found":
      return (
        <span className="w-5 h-5 rounded-full bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
          <Check className="w-3.5 h-3.5" />
        </span>
      );
    case "unavailable":
      return (
        <span className="w-5 h-5 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <X className="w-3.5 h-3.5" />
        </span>
      );
    case "substituted":
      return (
        <span className="w-5 h-5 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center shrink-0">
          <RefreshCw className="w-3.5 h-3.5" />
        </span>
      );
    case "refunded":
      return (
        <span className="w-5 h-5 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
          <PackageX className="w-3.5 h-3.5" />
        </span>
      );
    default:
      return <span className="w-5 h-5 rounded-full bg-brand-border shrink-0" />;
  }
}
