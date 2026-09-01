"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Car, Bike, Package, Users } from "lucide-react";
import { quoteWoulib, createWoulibRequest, uploadWoulibPaymentProof } from "@/lib/actions/woulib";
import { formatUSD, formatHTGEstimate } from "@/lib/format";
import { PAYMENT_METHOD_LABELS, PROOF_REQUIRED_PAYMENT_METHODS } from "@/types/database";
import type { PaymentMethod, WoulibServiceType, WoulibVehicleType } from "@/types/database";
import { MANUAL_PAYMENT_ACCOUNTS } from "@/lib/payment-accounts";
import { useToastStore } from "@/store/toast-store";

// LocationPicker touches `window` via Leaflet - load it client-only.
const LocationPicker = dynamic(() => import("./LocationPicker").then((m) => m.LocationPicker), {
  ssr: false,
  loading: () => <div className="w-full h-52 rounded-xl bg-brand-cream animate-pulse" />,
});

type LatLng = { lat: number; lng: number };

export function WoulibRequestForm({ vehicleTypes }: { vehicleTypes: WoulibVehicleType[] }) {
  const router = useRouter();
  const push = useToastStore((s) => s.push);

  const [serviceType, setServiceType] = useState<WoulibServiceType>("ride");
  const [pickup, setPickup] = useState<LatLng | null>(null);
  const [dropoff, setDropoff] = useState<LatLng | null>(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [vehicleTypeId, setVehicleTypeId] = useState(vehicleTypes[0]?.id ?? "");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [packageDescription, setPackageDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash_on_delivery");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);

  const [quote, setQuote] = useState<{ distanceKm: number; durationMinutes: number; price: number } | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const manualAccount = PROOF_REQUIRED_PAYMENT_METHODS.includes(paymentMethod)
    ? MANUAL_PAYMENT_ACCOUNTS[paymentMethod as "moncash" | "natcash" | "sogebank"]
    : null;

  // Re-quote whenever pickup, dropoff, or the chosen vehicle changes -
  // debounced slightly since dragging the pin fires many updates.
  useEffect(() => {
    const handle = setTimeout(async () => {
      if (!pickup || !dropoff || !vehicleTypeId) {
        setQuote(null);
        return;
      }
      setQuoting(true);
      const result = await quoteWoulib(pickup, dropoff, vehicleTypeId);
      setQuoting(false);
      if (!result.error && result.quote) setQuote(result.quote);
    }, 500);
    return () => clearTimeout(handle);
  }, [pickup, dropoff, vehicleTypeId]);

  const canSubmit =
    !!pickup && !!dropoff && !!vehicleTypeId && contactName.trim().length > 1 && contactPhone.trim().length > 6;

  async function onSubmit() {
    if (!pickup || !dropoff) return;

    const needsProof = PROOF_REQUIRED_PAYMENT_METHODS.includes(paymentMethod);
    if (needsProof && !proofFile) {
      setProofError("Veuillez joindre une capture d'ecran du transfert avant de continuer.");
      return;
    }
    setProofError(null);

    setSubmitting(true);
    const result = await createWoulibRequest({
      service_type: serviceType,
      vehicle_type_id: vehicleTypeId,
      pickup_lat: pickup.lat,
      pickup_lng: pickup.lng,
      pickup_address: pickupAddress,
      dropoff_lat: dropoff.lat,
      dropoff_lng: dropoff.lng,
      dropoff_address: dropoffAddress,
      contact_name: contactName,
      contact_phone: contactPhone,
      package_description: serviceType === "package" ? packageDescription : "",
      notes,
      payment_method: paymentMethod,
    });

    if (result.error) {
      setSubmitting(false);
      push(result.error, "error");
      return;
    }

    if (needsProof && proofFile) {
      const formData = new FormData();
      formData.append("file", proofFile);
      const proofResult = await uploadWoulibPaymentProof(result.requestId!, formData);
      if (proofResult.error) {
        setSubmitting(false);
        push(proofResult.error, "error");
        return;
      }
    }

    setSubmitting(false);
    push("Demande envoyee !", "success");
    router.push(`/mes-woulib/${result.requestId}`);
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-28">
      <h1 className="font-bold text-xl text-brand-ink mb-1">Woulib</h1>
      <p className="text-brand-gray text-sm mb-5">Une course ou un colis, livre par nos chauffeurs RapidVit.</p>

      <div className="flex gap-2 mb-6 bg-brand-cream rounded-full p-1">
        <button
          type="button"
          onClick={() => setServiceType("ride")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold transition ${
            serviceType === "ride" ? "bg-white text-brand-ink shadow-sm" : "text-brand-gray"
          }`}
        >
          <Users className="w-4 h-4" /> Course
        </button>
        <button
          type="button"
          onClick={() => setServiceType("package")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold transition ${
            serviceType === "package" ? "bg-white text-brand-ink shadow-sm" : "text-brand-gray"
          }`}
        >
          <Package className="w-4 h-4" /> Colis
        </button>
      </div>

      <div className="space-y-5">
        <div>
          <label className="text-sm font-semibold text-brand-ink block mb-2">Point de depart</label>
          <LocationPicker value={pickup} onChange={setPickup} color="#0F8A5F" />
          <input
            value={pickupAddress}
            onChange={(e) => setPickupAddress(e.target.value)}
            placeholder="Reperes pour le chauffeur (optionnel)"
            className="w-full mt-2 border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-brand-ink block mb-2">Destination</label>
          <LocationPicker value={dropoff} onChange={setDropoff} color="#E5231B" />
          <input
            value={dropoffAddress}
            onChange={(e) => setDropoffAddress(e.target.value)}
            placeholder="Reperes pour le chauffeur (optionnel)"
            className="w-full mt-2 border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-brand-ink block mb-2">Vehicule</label>
          <div className="grid grid-cols-2 gap-3">
            {vehicleTypes.map((vt) => (
              <button
                key={vt.id}
                type="button"
                onClick={() => setVehicleTypeId(vt.id)}
                className={`flex items-center gap-2.5 border rounded-xl px-4 py-3 text-left transition ${
                  vehicleTypeId === vt.id
                    ? "border-brand-orange bg-brand-orange/5"
                    : "border-brand-border"
                }`}
              >
                {vt.kind === "moto" ? (
                  <Bike className="w-5 h-5 text-brand-ink shrink-0" />
                ) : (
                  <Car className="w-5 h-5 text-brand-ink shrink-0" />
                )}
                <span className="text-sm font-medium text-brand-ink">{vt.name}</span>
              </button>
            ))}
          </div>
        </div>

        {(quote || quoting) && (
          <div className="border border-brand-border rounded-xl p-4 bg-brand-cream/50">
            {quoting ? (
              <p className="text-sm text-brand-gray">Calcul du prix...</p>
            ) : quote ? (
              <div className="flex items-center justify-between">
                <div className="text-sm text-brand-gray">
                  <p>{quote.distanceKm} km · ~{quote.durationMinutes} min</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-brand-ink">{formatUSD(quote.price)}</p>
                  <p className="text-[11px] text-brand-gray">{formatHTGEstimate(quote.price)}</p>
                </div>
              </div>
            ) : null}
          </div>
        )}

        <div>
          <label className="text-sm font-semibold text-brand-ink block mb-2">
            {serviceType === "ride" ? "Passager" : "Destinataire du colis"}
          </label>
          <div className="space-y-3">
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Nom complet"
              className="w-full border border-brand-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
            />
            <input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="Numero de telephone"
              className="w-full border border-brand-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
            />
            {serviceType === "package" && (
              <textarea
                value={packageDescription}
                onChange={(e) => setPackageDescription(e.target.value)}
                placeholder="Que contient le colis ?"
                rows={2}
                className="w-full border border-brand-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
              />
            )}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Note pour le chauffeur (optionnel)"
              rows={2}
              className="w-full border border-brand-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-brand-ink block mb-2">Mode de paiement</label>
          <div className="space-y-2">
            {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <label
                key={value}
                className="flex items-center gap-3 border border-brand-border rounded-xl px-4 py-3 text-sm cursor-pointer has-[:checked]:border-brand-orange has-[:checked]:bg-brand-orange/5"
              >
                <input
                  type="radio"
                  value={value}
                  checked={paymentMethod === value}
                  onChange={() => setPaymentMethod(value as PaymentMethod)}
                />
                {label}
              </label>
            ))}
          </div>

          {manualAccount && (
            <div className="mt-3 border border-brand-orange/30 bg-brand-orange/5 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-brand-border bg-white shrink-0">
                  <Image src={manualAccount.logo} alt={PAYMENT_METHOD_LABELS[paymentMethod]} fill sizes="48px" className="object-contain" />
                </div>
                <p className="text-sm text-brand-ink font-medium">
                  Envoyez le montant total ci-dessous, puis joignez une capture d&apos;ecran de la transaction.
                </p>
              </div>

              <div className="text-sm space-y-1 bg-white rounded-lg border border-brand-border p-3">
                <p>
                  <span className="text-brand-gray">Titulaire du compte : </span>
                  <span className="font-semibold text-brand-ink">{manualAccount.accountHolder}</span>
                </p>
                {manualAccount.phone && (
                  <p>
                    <span className="text-brand-gray">Numero {PAYMENT_METHOD_LABELS[paymentMethod]} : </span>
                    <span className="font-semibold text-brand-ink">{manualAccount.phone}</span>
                  </p>
                )}
                {manualAccount.accountNumber && (
                  <p>
                    <span className="text-brand-gray">Numero de compte : </span>
                    <span className="font-semibold text-brand-ink">{manualAccount.accountNumber}</span>
                  </p>
                )}
                {manualAccount.email && (
                  <p>
                    <span className="text-brand-gray">Email : </span>
                    <span className="font-semibold text-brand-ink">{manualAccount.email}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-brand-ink block mb-1">
                  Capture d&apos;ecran de la transaction
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    setProofFile(e.target.files?.[0] ?? null);
                    setProofError(null);
                  }}
                  className="w-full text-sm border border-brand-border rounded-xl px-3 py-2 bg-white"
                />
                <p className="text-[11px] text-brand-gray mt-1">.jpg, .jpeg, .png ou .pdf - max 20 Mo</p>
                {proofFile && <p className="text-xs text-brand-green mt-1">Fichier selectionne : {proofFile.name}</p>}
                {proofError && <p className="text-xs text-red-500 mt-1">{proofError}</p>}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit || submitting}
          className="w-full rounded-full bg-brand-orange text-white font-semibold py-3.5 hover:bg-brand-orange-dark transition disabled:opacity-60"
        >
          {submitting ? "Envoi en cours..." : quote ? `Confirmer - ${formatUSD(quote.price)}` : "Confirmer la demande"}
        </button>
      </div>
    </div>
  );
}
