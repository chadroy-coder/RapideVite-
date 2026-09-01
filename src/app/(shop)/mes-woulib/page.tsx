import Link from "next/link";
import { redirect } from "next/navigation";
import { Car } from "lucide-react";
import { getCurrentUserAndProfile } from "@/lib/data";
import { getMyWoulibRequests } from "@/lib/actions/woulib";
import { WoulibStatusBadge } from "@/components/woulib/WoulibStatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatUSD, formatHTGEstimate } from "@/lib/format";

export default async function WoulibListPage() {
  const { user } = await getCurrentUserAndProfile();
  if (!user) redirect("/login?redirect=/mes-woulib");

  const requests = await getMyWoulibRequests();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="font-bold text-xl text-brand-ink mb-4">Mes Woulib</h1>

      {requests.length === 0 ? (
        <EmptyState
          icon={Car}
          title="Aucune demande pour le moment"
          description="Vos courses et livraisons de colis apparaitront ici."
          actionLabel="Faire une demande"
          actionHref="/woulib"
        />
      ) : (
        <ul className="space-y-3">
          {requests.map((request) => (
            <li key={request.id}>
              <Link
                href={`/mes-woulib/${request.id}`}
                className="flex items-center justify-between gap-3 border border-brand-border rounded-2xl px-4 py-3.5 hover:border-brand-orange transition"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-brand-ink text-sm">
                    {request.request_number} · {request.service_type === "ride" ? "Course" : "Colis"}
                  </p>
                  <p className="text-xs text-brand-gray mt-0.5">
                    {new Date(request.created_at).toLocaleDateString("fr-HT")}
                    {request.estimated_price != null && (
                      <>
                        {" "}· {formatUSD(request.estimated_price)} ({formatHTGEstimate(request.estimated_price)})
                      </>
                    )}
                  </p>
                  {request.vehicle_type && (
                    <p className="text-xs text-brand-gray mt-0.5">{request.vehicle_type.name}</p>
                  )}
                </div>
                <WoulibStatusBadge status={request.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
