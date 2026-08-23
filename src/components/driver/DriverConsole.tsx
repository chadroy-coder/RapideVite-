"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, X, MapPin, Undo2, RotateCcw } from "lucide-react";
import {
  updateDriverLocation,
  markItemFound,
  markItemUnavailable,
  resetItemStatus,
  listSimilarProducts,
  proposeSubstitute,
  refundItem,
  autoApplySubstitute,
  getItemStatuses,
} from "@/lib/actions/driver";
import { useToastStore } from "@/store/toast-store";
import { formatUSD } from "@/lib/format";
import type { ItemFulfillmentStatus, SubstituteStatus } from "@/types/database";
import { LiveMap } from "@/components/order/LiveMap";

const LOCATION_PING_MS = 15000;
const ITEM_POLL_MS = 5000;
const SUBSTITUTE_WAIT_MS = 90000; // how long we wait for the customer before proceeding anyway

interface DriverItem {
  id: string;
  product_id: string | null;
  product_name: string;
  variant_label: string | null;
  quantity: number;
  line_total: number;
  fulfillment_status: ItemFulfillmentStatus;
  substitute_status: SubstituteStatus | null;
  substitute_proposed_at: string | null;
  product?: { image_url: string | null } | null;
  substitute_product?: { name: string; image_url: string | null } | null;
}

type SimilarProduct = {
  productId: string;
  name: string;
  imageUrl: string | null;
  variantId: string;
  size: string | null;
  price: number;
};

export function DriverConsole({
  token,
  orderNumber,
  customerName,
  street,
  neighborhood,
  commune,
  customerLat,
  customerLng,
  initialItems,
}: {
  token: string;
  orderNumber: string;
  customerName: string;
  street: string;
  neighborhood: string | null;
  commune: string | null;
  customerLat?: number | null;
  customerLng?: number | null;
  initialItems: DriverItem[];
}) {
  const push = useToastStore((s) => s.push);
  const [items, setItems] = useState<DriverItem[]>(initialItems);
  const [locationStatus, setLocationStatus] = useState<"idle" | "active" | "denied">("idle");
  const [substitutePickerFor, setSubstitutePickerFor] = useState<string | null>(null);
  const [similarProducts, setSimilarProducts] = useState<SimilarProduct[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  // ----- GPS broadcasting -----
  useEffect(() => {
    if (!navigator.geolocation) return;
    let cancelled = false;

    function ping() {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (cancelled) return;
          setLocationStatus("active");
          await updateDriverLocation(token, pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          if (!cancelled) setLocationStatus("denied");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    ping();
    const interval = setInterval(ping, LOCATION_PING_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token]);

  // ----- Poll for customer responses to pending substitute proposals -----
  useEffect(() => {
    const interval = setInterval(async () => {
      const result = await getItemStatuses(token);
      if (result.items.length === 0) return;
      setItems((prev) =>
        prev.map((item) => {
          const fresh = result.items.find((i) => i.id === item.id);
          return fresh
            ? { ...item, fulfillment_status: fresh.fulfillment_status, substitute_status: fresh.substitute_status }
            : item;
        })
      );
    }, ITEM_POLL_MS);
    return () => clearInterval(interval);
  }, [token]);

  async function handleFound(itemId: string) {
    const result = await markItemFound(token, itemId);
    if (result.error) return push(result.error, "error");
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, fulfillment_status: "found", substitute_status: null } : i)));
  }

  async function handleReset(itemId: string) {
    const result = await resetItemStatus(token, itemId);
    if (result.error) return push(result.error, "error");
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, fulfillment_status: "pending", substitute_status: null } : i)));
  }

  async function openSubstitutePicker(item: DriverItem) {
    await markItemUnavailable(token, item.id);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, fulfillment_status: "unavailable", substitute_status: null } : i)));
    setSubstitutePickerFor(item.id);
    setSimilarProducts([]);
    if (!item.product_id) return;
    setLoadingSimilar(true);
    const result = await listSimilarProducts(token, item.product_id);
    setLoadingSimilar(false);
    setSimilarProducts(result.products);
  }

  async function handlePickSubstitute(itemId: string, product: SimilarProduct) {
    const result = await proposeSubstitute(token, itemId, product.productId, product.variantId);
    if (result.error) return push(result.error, "error");
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? {
              ...i,
              fulfillment_status: "unavailable",
              substitute_status: "proposed",
              substitute_proposed_at: new Date().toISOString(),
              substitute_product: { name: product.name, image_url: product.imageUrl },
            }
          : i
      )
    );
    setSubstitutePickerFor(null);
    push("Remplacement propose au client", "success");
  }

  async function handleRefund(itemId: string) {
    const result = await refundItem(token, itemId);
    if (result.error) return push(result.error, "error");
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, fulfillment_status: "refunded", substitute_status: null } : i)));
    setSubstitutePickerFor(null);
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="font-bold text-xl text-brand-ink">{orderNumber}</h1>
        <p className="text-sm text-brand-gray">{customerName}</p>
        <p className="text-sm text-brand-gray flex items-center gap-1 mt-0.5">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          {street}
          {neighborhood ? `, ${neighborhood}` : ""}
          {commune ? `, ${commune}` : ""}
        </p>
      </div>

      {customerLat != null && customerLng != null && (
        <div>
          <h2 className="text-sm font-semibold text-brand-ink mb-2">Position exacte du client</h2>
          <LiveMap lat={customerLat} lng={customerLng} label="Client" color="#2563eb" />
        </div>
      )}

      <div
        className={`rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-2 ${
          locationStatus === "active"
            ? "bg-brand-green/10 text-brand-green"
            : locationStatus === "denied"
            ? "bg-red-50 text-red-600"
            : "bg-brand-cream text-brand-gray"
        }`}
      >
        <span className={`w-2 h-2 rounded-full ${locationStatus === "active" ? "bg-brand-green animate-pulse" : "bg-brand-gray"}`} />
        {locationStatus === "active" && "Position partagee avec le client"}
        {locationStatus === "denied" && "Localisation refusee - activez le GPS pour partager votre position"}
        {locationStatus === "idle" && "Activation de la localisation..."}
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="border border-brand-border rounded-2xl p-4 bg-white">
            <div className="flex justify-between items-start gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-brand-cream border border-brand-border shrink-0">
                  <Image
                    src={item.product?.image_url || "/products/placeholder.svg"}
                    alt={item.product_name}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-brand-ink text-sm">
                    {item.quantity} x {item.product_name}
                    {item.variant_label ? ` (${item.variant_label})` : ""}
                  </p>
                  <p className="text-xs text-brand-gray">{formatUSD(item.line_total)}</p>
                </div>
              </div>
              <StatusPill status={item.fulfillment_status} />
            </div>

            {item.fulfillment_status === "pending" && (
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => handleFound(item.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-brand-green text-white text-sm font-semibold py-2"
                >
                  <Check className="w-4 h-4" /> Trouve
                </button>
                <button
                  type="button"
                  onClick={() => openSubstitutePicker(item)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-red-300 text-red-600 text-sm font-semibold py-2"
                >
                  <X className="w-4 h-4" /> Indisponible
                </button>
              </div>
            )}

            {item.fulfillment_status === "found" && (
              <button type="button" onClick={() => handleReset(item.id)} className="flex items-center gap-1 text-xs text-brand-gray mt-2 hover:text-brand-orange">
                <Undo2 className="w-3.5 h-3.5" /> Annuler
              </button>
            )}

            {item.fulfillment_status === "unavailable" && item.substitute_status !== "proposed" && (
              <button
                type="button"
                onClick={() => openSubstitutePicker(item)}
                className="mt-2 text-xs text-brand-orange font-semibold"
              >
                Choisir un remplacement
              </button>
            )}

            {item.substitute_status === "proposed" && (
              <SubstituteWaiting
                token={token}
                itemId={item.id}
                proposedAt={item.substitute_proposed_at}
                substituteName={item.substitute_product?.name ?? ""}
                onResolved={(status) =>
                  setItems((prev) =>
                    prev.map((i) =>
                      i.id === item.id
                        ? { ...i, fulfillment_status: status === "accepted" || status === "auto_applied" ? "substituted" : "refunded", substitute_status: status }
                        : i
                    )
                  )
                }
              />
            )}

            {substitutePickerFor === item.id && (
              <div className="mt-3 border-t border-brand-border pt-3">
                <p className="text-xs font-semibold text-brand-ink mb-2">Remplacements suggeres</p>
                {loadingSimilar && <p className="text-xs text-brand-gray">Recherche...</p>}
                {!loadingSimilar && similarProducts.length === 0 && (
                  <p className="text-xs text-brand-gray">Aucun remplacement similaire trouve.</p>
                )}
                <div className="space-y-2">
                  {similarProducts.map((p) => (
                    <button
                      key={p.productId}
                      type="button"
                      onClick={() => handlePickSubstitute(item.id, p)}
                      className="w-full flex items-center gap-3 border border-brand-border rounded-xl p-2 text-left hover:border-brand-orange"
                    >
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-brand-cream shrink-0">
                        {p.imageUrl && <Image src={p.imageUrl} alt={p.name} fill sizes="40px" className="object-contain" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-brand-ink truncate">{p.name}</p>
                        {p.size && <p className="text-[11px] text-brand-gray">{p.size}</p>}
                      </div>
                      <span className="text-xs text-brand-gray shrink-0">{formatUSD(p.price)}</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleRefund(item.id)}
                  className="w-full mt-2 text-xs font-semibold text-red-600 border border-red-200 rounded-xl py-2"
                >
                  Rembourser cet article (pas de remplacement)
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: ItemFulfillmentStatus }) {
  const map: Record<ItemFulfillmentStatus, { label: string; className: string }> = {
    pending: { label: "A verifier", className: "bg-brand-border text-brand-gray" },
    found: { label: "Trouve", className: "bg-brand-green/10 text-brand-green" },
    unavailable: { label: "Indisponible", className: "bg-amber-50 text-amber-700" },
    substituted: { label: "Remplace", className: "bg-brand-orange/10 text-brand-orange" },
    refunded: { label: "Rembourse", className: "bg-red-50 text-red-600" },
  };
  const { label, className } = map[status];
  return <span className={`text-[11px] font-semibold px-2 py-1 rounded-full shrink-0 ${className}`}>{label}</span>;
}

// Shows a live countdown while a substitute is awaiting the customer's
// response, polls aren't enough on their own since we also need to trigger
// the auto-apply call once the window expires (not just read state).
function SubstituteWaiting({
  token,
  itemId,
  proposedAt,
  substituteName,
  onResolved,
}: {
  token: string;
  itemId: string;
  proposedAt: string | null;
  substituteName: string;
  onResolved: (status: SubstituteStatus) => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (!proposedAt) return Math.round(SUBSTITUTE_WAIT_MS / 1000);
    const elapsed = Date.now() - new Date(proposedAt).getTime();
    return Math.max(0, Math.round((SUBSTITUTE_WAIT_MS - elapsed) / 1000));
  });
  const firedRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (secondsLeft > 0 || firedRef.current) return;
    firedRef.current = true;
    autoApplySubstitute(token, itemId).then((result) => {
      if (!result.error) onResolved("auto_applied");
    });
  }, [secondsLeft, token, itemId, onResolved]);

  async function handleForceApply() {
    firedRef.current = true;
    const result = await autoApplySubstitute(token, itemId);
    if (!result.error) onResolved("auto_applied");
  }

  return (
    <div className="mt-2 bg-brand-cream rounded-xl p-3 text-xs">
      <p className="text-brand-ink">
        En attente de reponse du client pour remplacer par <span className="font-semibold">{substituteName}</span>...
      </p>
      <p className="text-brand-gray mt-1">
        {secondsLeft > 0 ? `${secondsLeft}s avant de continuer automatiquement` : "Finalisation..."}
      </p>
      <button type="button" onClick={handleForceApply} className="flex items-center gap-1 text-brand-orange font-semibold mt-1.5">
        <RotateCcw className="w-3 h-3" /> Continuer maintenant
      </button>
    </div>
  );
}
