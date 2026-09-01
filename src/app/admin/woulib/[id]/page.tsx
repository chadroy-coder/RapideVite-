import { notFound } from "next/navigation";
import { getWoulibRequestAdmin } from "@/lib/actions/admin-woulib";
import { listDrivers } from "@/lib/actions/admin-drivers";
import { WoulibStatusBadge } from "@/components/woulib/WoulibStatusBadge";
import { WoulibStatusForm } from "@/components/admin/WoulibStatusForm";
import { DriverLinkCard } from "@/components/admin/DriverLinkCard";
import { LiveMap } from "@/components/order/LiveMap";
import { formatUSD } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/types/database";

export default async function AdminWoulibDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [request, drivers] = await Promise.all([getWoulibRequestAdmin(id), listDrivers()]);
  if (!request) notFound();

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-2xl text-brand-ink">
            {request.request_number} · {request.service_type === "ride" ? "Course" : "Colis"}
          </h1>
          <WoulibStatusBadge status={request.status} />
        </div>

        <div className="bg-white border border-brand-border rounded-2xl p-5 space-y-3 text-sm">
          <div>
            <p className="font-semibold text-brand-ink">{request.contact_name}</p>
            <p className="text-brand-gray">{request.contact_phone}</p>
          </div>
          <div className="pt-3 border-t border-brand-border space-y-1">
            <p className="text-brand-gray">
              <span className="font-medium text-brand-ink">Depart:</span> {request.pickup_address || "Voir carte"}
            </p>
            <p className="text-brand-gray">
              <span className="font-medium text-brand-ink">Arrivee:</span> {request.dropoff_address || "Voir carte"}
            </p>
          </div>
          {request.service_type === "package" && request.package_description && (
            <p className="text-brand-gray pt-3 border-t border-brand-border">
              <span className="font-medium text-brand-ink">Colis:</span> {request.package_description}
            </p>
          )}
          {request.notes && (
            <p className="text-brand-gray italic pt-3 border-t border-brand-border">{request.notes}</p>
          )}
          <div className="pt-3 border-t border-brand-border flex justify-between">
            <span className="text-brand-gray">{request.vehicle_type?.name} · {PAYMENT_METHOD_LABELS[request.payment_method]}</span>
            {(request.final_price ?? request.estimated_price) != null && (
              <span className="font-bold text-brand-ink">{formatUSD((request.final_price ?? request.estimated_price)!)}</span>
            )}
          </div>
          {(request.distance_km != null || request.duration_minutes != null) && (
            <p className="text-xs text-brand-gray">
              {request.distance_km != null && `${request.distance_km} km`}
              {request.distance_km != null && request.duration_minutes != null && " · "}
              {request.duration_minutes != null && `~${request.duration_minutes} min`}
            </p>
          )}
        </div>

        <div>
          <h2 className="font-semibold text-brand-ink mb-2 text-sm">Depart</h2>
          <LiveMap lat={request.pickup_lat} lng={request.pickup_lng} label="Depart" color="#0F8A5F" />
        </div>
        <div>
          <h2 className="font-semibold text-brand-ink mb-2 text-sm">Arrivee</h2>
          <LiveMap lat={request.dropoff_lat} lng={request.dropoff_lng} label="Arrivee" color="#E5231B" />
        </div>

        {request.driver_access_token && (
          <DriverLinkCard
            url={`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/woulib-livreur/${request.driver_access_token}`}
          />
        )}
      </div>

      <WoulibStatusForm
        requestId={request.id}
        currentStatus={request.status}
        assignedDriverId={request.assigned_driver_id}
        estimatedPrice={request.estimated_price}
        finalPrice={request.final_price}
        drivers={drivers.filter((d) => d.active)}
      />
    </div>
  );
}
