"use client";

import { useEffect, useState } from "react";
import { Phone, MapPin, Package, Navigation } from "lucide-react";
import { updateWoulibDriverLocation, advanceWoulibStatus } from "@/lib/actions/woulib-driver";
import { useToastStore } from "@/store/toast-store";
import { formatUSD } from "@/lib/format";
import { WOULIB_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "@/types/database";
import type { WoulibServiceType, WoulibStatus, PaymentMethod } from "@/types/database";
import { LiveMap } from "@/components/order/LiveMap";

const LOCATION_PING_MS = 15000;

const ACTION_LABELS: Partial<Record<WoulibStatus, string>> = {
  accepted: "En route vers le depart",
  en_route_pickup: "Client/colis recupere",
  picked_up: "En route vers l'arrivee",
  en_route_dropoff: "Terminer la course",
};

export function WoulibDriverConsole({
  token,
  requestNumber,
  serviceType,
  contactName,
  contactPhone,
  pickupAddress,
  pickupLat,
  pickupLng,
  dropoffAddress,
  dropoffLat,
  dropoffLng,
  packageDescription,
  notes,
  paymentMethod,
  price,
  initialStatus,
}: {
  token: string;
  requestNumber: string;
  serviceType: WoulibServiceType;
  contactName: string;
  contactPhone: string;
  pickupAddress: string | null;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string | null;
  dropoffLat: number;
  dropoffLng: number;
  packageDescription: string | null;
  notes: string | null;
  paymentMethod: PaymentMethod;
  price: number | null;
  initialStatus: WoulibStatus;
}) {
  const push = useToastStore((s) => s.push);
  const [status, setStatus] = useState<WoulibStatus>(initialStatus);
  const [locationStatus, setLocationStatus] = useState<"idle" | "active" | "denied">("idle");
  const [advancing, setAdvancing] = useState(false);

  const destination =
    status === "accepted" || status === "en_route_pickup"
      ? { label: "Point de depart", address: pickupAddress, lat: pickupLat, lng: pickupLng }
      : { label: "Destination", address: dropoffAddress, lat: dropoffLat, lng: dropoffLng };

  // ----- GPS broadcasting, same cadence as the grocery driver console -----
  useEffect(() => {
    if (status === "completed" || status === "cancelled") return;
    if (!navigator.geolocation) return;
    let cancelled = false;

    function ping() {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (cancelled) return;
          setLocationStatus("active");
          await updateWoulibDriverLocation(token, pos.coords.latitude, pos.coords.longitude);
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
  }, [token, status]);

  async function handleAdvance() {
    setAdvancing(true);
    const result = await advanceWoulibStatus(token, status);
    setAdvancing(false);
    if (result.error || !result.status) {
      push(result.error ?? "Erreur", "error");
      return;
    }
    setStatus(result.status);
    push(WOULIB_STATUS_LABELS[result.status], "success");
  }

  const actionLabel = ACTION_LABELS[status];

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="font-bold text-xl text-brand-ink">
          {requestNumber} · {serviceType === "ride" ? "Course" : "Colis"}
        </h1>
        <p className="text-sm text-brand-gray">{WOULIB_STATUS_LABELS[status]}</p>
      </div>

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

      {status !== "completed" && status !== "cancelled" && (
        <div>
          <h2 className="text-sm font-semibold text-brand-ink mb-2 flex items-center gap-1.5">
            <Navigation className="w-4 h-4 text-brand-orange" /> {destination.label}
          </h2>
          {destination.address && <p className="text-xs text-brand-gray mb-2">{destination.address}</p>}
          <LiveMap lat={destination.lat} lng={destination.lng} label={destination.label} color="#E5231B" />
        </div>
      )}

      <div className="border border-brand-border rounded-2xl p-4 space-y-2 text-sm">
        <p className="font-semibold text-brand-ink">{contactName}</p>
        <a href={`tel:${contactPhone}`} className="flex items-center gap-1.5 text-brand-orange font-semibold">
          <Phone className="w-4 h-4" /> {contactPhone}
        </a>
        <div className="pt-2 border-t border-brand-border space-y-1.5">
          <p className="flex items-start gap-1.5 text-brand-gray">
            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-brand-green" />
            {pickupAddress || "Point de depart (voir carte)"}
          </p>
          <p className="flex items-start gap-1.5 text-brand-gray">
            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-500" />
            {dropoffAddress || "Destination (voir carte)"}
          </p>
        </div>
        {serviceType === "package" && packageDescription && (
          <p className="flex items-start gap-1.5 text-brand-gray pt-2 border-t border-brand-border">
            <Package className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            {packageDescription}
          </p>
        )}
        {notes && <p className="text-brand-gray italic pt-2 border-t border-brand-border">{notes}</p>}
        <div className="pt-2 border-t border-brand-border flex justify-between">
          <span className="text-brand-gray">{PAYMENT_METHOD_LABELS[paymentMethod]}</span>
          {price != null && <span className="font-bold text-brand-ink">{formatUSD(price)}</span>}
        </div>
      </div>

      {actionLabel && (
        <button
          type="button"
          onClick={handleAdvance}
          disabled={advancing}
          className="w-full rounded-full bg-brand-orange text-white font-semibold py-3.5 disabled:opacity-60"
        >
          {advancing ? "..." : actionLabel}
        </button>
      )}

      {status === "completed" && (
        <div className="rounded-xl bg-brand-green/10 text-brand-green text-sm font-semibold px-4 py-3 text-center">
          Course terminee. Merci !
        </div>
      )}
      {status === "cancelled" && (
        <div className="rounded-xl bg-red-50 text-red-600 text-sm font-semibold px-4 py-3 text-center">
          Cette demande a ete annulee.
        </div>
      )}
      {status === "requested" && (
        <div className="rounded-xl bg-brand-cream text-brand-gray text-sm font-medium px-4 py-3 text-center">
          En attente d&apos;assignation par l&apos;administrateur.
        </div>
      )}
    </div>
  );
}
