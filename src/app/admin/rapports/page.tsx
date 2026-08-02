import { requireStaff } from "@/lib/require-staff";
import { formatHTG } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const { supabase } = await requireStaff();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: orders } = await supabase
    .from("orders")
    .select("total, status, created_at, payment_method")
    .gte("created_at", thirtyDaysAgo.toISOString());

  const delivered = (orders ?? []).filter((o) => o.status === "delivered");
  const totalRevenue = delivered.reduce((sum, o) => sum + Number(o.total), 0);
  const cancelledCount = (orders ?? []).filter((o) => o.status === "cancelled").length;

  const byPaymentMethod = new Map<string, number>();
  for (const o of orders ?? []) {
    byPaymentMethod.set(o.payment_method, (byPaymentMethod.get(o.payment_method) ?? 0) + 1);
  }

  return (
    <div>
      <h1 className="font-bold text-2xl text-brand-ink mb-6">Rapports (30 derniers jours)</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-brand-border rounded-2xl p-5">
          <p className="text-xs text-brand-gray font-medium">Commandes totales</p>
          <p className="text-2xl font-extrabold text-brand-ink mt-1">{orders?.length ?? 0}</p>
        </div>
        <div className="bg-white border border-brand-border rounded-2xl p-5">
          <p className="text-xs text-brand-gray font-medium">Commandes livrees</p>
          <p className="text-2xl font-extrabold text-brand-ink mt-1">{delivered.length}</p>
        </div>
        <div className="bg-white border border-brand-border rounded-2xl p-5">
          <p className="text-xs text-brand-gray font-medium">Revenu (livrees)</p>
          <p className="text-2xl font-extrabold text-brand-ink mt-1">{formatHTG(totalRevenue)}</p>
        </div>
        <div className="bg-white border border-brand-border rounded-2xl p-5">
          <p className="text-xs text-brand-gray font-medium">Commandes annulees</p>
          <p className="text-2xl font-extrabold text-brand-ink mt-1">{cancelledCount}</p>
        </div>
      </div>

      <div className="bg-white border border-brand-border rounded-2xl p-5">
        <h2 className="font-semibold text-brand-ink mb-4">Repartition par mode de paiement</h2>
        <ul className="space-y-2">
          {Array.from(byPaymentMethod.entries()).map(([method, count]) => (
            <li key={method} className="flex justify-between text-sm py-2 border-b border-brand-border last:border-0">
              <span className="text-brand-ink capitalize">{method.replace(/_/g, " ")}</span>
              <span className="font-semibold text-brand-ink">{count}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
