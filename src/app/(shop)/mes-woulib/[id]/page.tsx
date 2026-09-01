import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { Car, Motorbike, Phone } from "lucide-react";
import { getCurrentUserAndProfile } from "@/lib/data";
import { getWoulibRequestById } from "@/lib/actions/woulib";
import { WoulibStatusBadge } from "@/components/woulib/WoulibStatusBadge";
import { WoulibLivePanel } from "@/components/woulib/WoulibLivePanel";
import { formatUSD, formatHTGEstimate } from "@/lib/format";
import { PAYMENT_METHOD_LABELS, PROOF_REQUIRED_PAYMENT_METHODS } from "@/types/database";

export default async function WoulibDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await getCurrentUserAndProfile();
  if (!user) redirect(`/login?redirect=/mes-woulib/${id}`);

  const request = await getWoulibRequestById(id);
  if (!request || request.user_id !== user.id) notFound();

  const price = request.final_price ?? request.estimated_price;

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-bold text-xl text-brand-ink">{request.request_number}</h1>
        <WoulibStatusBadge status={request.status} />
      </div>
      <p className="text-brand-gray text-sm mb-4">
        {new Date(request.created_at).toLocaleString("fr-HT")} · {request.service_type === "ride" ? "Course" : "Colis"}
      </p>

      <div className="flex items-center gap-3 border border-brand-border rounded-2xl p-4 mb-6">
        <div className="w-11 h-11 rounded-full bg-brand-orange/10 flex items-center justify-center shrink-0">
          {request.vehicle_type?.kind === "moto" ? (
            <Motorbike className="w-6 h-6 text-brand-orange" />
          ) : (
            <Car className="w-6 h-6 text-brand-orange" />
          )}
        </div>
        <div>
          <p className="font-semibold text-brand-ink text-sm">{request.vehicle_type?.name ?? "Vehicule"}</p>
          <p className="text-xs text-brand-gray">
            {request.driver ? "Chauffeur en route" : "En attente d'un chauffeur"}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <WoulibLivePanel
          requestId={request.id}
          initialStatus={request.status}
          initialDriverLocation={{
            lat: request.driver_lat,
            lng: request.driver_lng,
            updatedAt: request.driver_location_updated_at,
          }}
          pickup={{ lat: request.pickup_lat, lng: request.pickup_lng, address: request.pickup_address }}
          dropoff={{ lat: request.dropoff_lat, lng: request.dropoff_lng, address: request.dropoff_address }}
        />
      </div>

      {request.driver && (
        <div className="border border-brand-orange/30 bg-brand-orange/5 rounded-2xl p-5 mb-6 flex items-center gap-4">
          <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-sm bg-brand-cream shrink-0 flex items-center justify-center">
            {request.driver.photo_url ? (
              <Image src={request.driver.photo_url} alt={request.driver.name} fill sizes="56px" className="object-cover" />
            ) : request.vehicle_type?.kind === "moto" ? (
              <Motorbike className="w-6 h-6 text-brand-orange" />
            ) : (
              <Car className="w-6 h-6 text-brand-orange" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-brand-ink text-sm">{request.driver.name}</p>
            <p className="text-xs text-brand-gray">Votre chauffeur</p>
            {request.driver.phone && (
              <a
                href={`tel:${request.driver.phone}`}
                className="flex items-center gap-1 text-xs text-brand-orange font-semibold mt-1"
              >
                <Phone className="w-3.5 h-3.5" />
                {request.driver.phone}
              </a>
            )}
          </div>
        </div>
      )}

      <div className="border border-brand-border rounded-2xl p-5 space-y-3 mb-6 text-sm">
        <div>
          <p className="font-semibold text-brand-ink mb-0.5">Depart</p>
          <p className="text-brand-gray">{request.pickup_address || "Position sur la carte"}</p>
        </div>
        <div>
          <p className="font-semibold text-brand-ink mb-0.5">Destination</p>
          <p className="text-brand-gray">{request.dropoff_address || "Position sur la carte"}</p>
        </div>
        {request.service_type === "package" && request.package_description && (
          <div>
            <p className="font-semibold text-brand-ink mb-0.5">Colis</p>
            <p className="text-brand-gray">{request.package_description}</p>
          </div>
        )}
        {request.notes && (
          <div>
            <p className="font-semibold text-brand-ink mb-0.5">Note</p>
            <p className="text-brand-gray italic">{request.notes}</p>
          </div>
        )}
        {(request.distance_km != null || request.duration_minutes != null) && (
          <p className="text-brand-gray">
            {request.distance_km != null && `${request.distance_km} km`}
            {request.distance_km != null && request.duration_minutes != null && " · "}
            {request.duration_minutes != null && `~${request.duration_minutes} min`}
          </p>
        )}
        <div className="border-t border-brand-border pt-3 flex justify-between font-bold text-brand-ink">
          <span>{request.final_price != null ? "Total" : "Prix estime"}</span>
          <div className="text-right">
            {price != null ? (
              <>
                <span>{formatUSD(price)}</span>
                <p className="text-[11px] font-normal text-brand-gray">{formatHTGEstimate(price)}</p>
              </>
            ) : (
              <span className="text-brand-gray">--</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-brand-gray">Paiement: {PAYMENT_METHOD_LABELS[request.payment_method]}</p>
          {PROOF_REQUIRED_PAYMENT_METHODS.includes(request.payment_method) && (
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                request.payment_status === "paid"
                  ? "bg-brand-green/10 text-brand-green"
                  : request.payment_status === "failed"
                  ? "bg-red-50 text-red-600"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {request.payment_status === "paid"
                ? "Confirme"
                : request.payment_status === "failed"
                ? "Rejete - contactez-nous"
                : "En attente de verification"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
