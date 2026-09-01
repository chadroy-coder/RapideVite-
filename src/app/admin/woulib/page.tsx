import Link from "next/link";
import { Car } from "lucide-react";
import { listWoulibRequestsAdmin, listVehicleTypesAdmin } from "@/lib/actions/admin-woulib";
import { WoulibStatusBadge } from "@/components/woulib/WoulibStatusBadge";
import { WoulibPricingForm } from "@/components/admin/WoulibPricingForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatUSD } from "@/lib/format";
import { WOULIB_STATUS_LABELS, type WoulibStatus } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AdminWoulibPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const [requests, vehicleTypes] = await Promise.all([
    listWoulibRequestsAdmin({ status: (status as WoulibStatus | undefined) || undefined }),
    listVehicleTypesAdmin(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-bold text-2xl text-brand-ink">Woulib</h1>

      <WoulibPricingForm vehicleTypes={vehicleTypes} />

      <div>
        <form className="flex flex-wrap gap-3 mb-4">
          <select
            name="status"
            defaultValue={status || ""}
            className="border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40 bg-white"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(WOULIB_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-xl border border-brand-border px-4 py-2.5 text-sm font-medium hover:bg-brand-cream">
            Filtrer
          </button>
        </form>

        {requests.length === 0 ? (
          <EmptyState icon={Car} title="Aucune demande trouvee" />
        ) : (
          <div className="bg-white border border-brand-border rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-brand-gray border-b border-brand-border">
                  <th className="px-4 py-3 font-medium">Demande</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Chauffeur</th>
                  <th className="px-4 py-3 font-medium">Prix</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b border-brand-border last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/admin/woulib/${r.id}`} className="font-medium text-brand-ink hover:text-brand-orange">
                        {r.request_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-brand-gray">{r.service_type === "ride" ? "Course" : "Colis"}</td>
                    <td className="px-4 py-3 text-brand-gray">{r.contact_name}</td>
                    <td className="px-4 py-3 text-brand-gray">{r.driver?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-brand-ink">
                      {r.final_price ?? r.estimated_price ? formatUSD((r.final_price ?? r.estimated_price)!) : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <WoulibStatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-brand-gray">{new Date(r.created_at).toLocaleDateString("fr-HT")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
