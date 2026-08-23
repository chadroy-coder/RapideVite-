import Link from "next/link";
import { listOrdersAdmin, countPendingPaymentVerifications } from "@/lib/actions/admin-orders";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { formatUSD } from "@/lib/format";
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, PROOF_REQUIRED_PAYMENT_METHODS, type OrderStatus } from "@/types/database";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; paiement?: string }>;
}) {
  const { q, status, paiement } = await searchParams;
  const pendingPayment = paiement === "a_verifier";
  const [orders, pendingPaymentCount] = await Promise.all([
    listOrdersAdmin({
      query: q,
      status: (status as OrderStatus | undefined) || undefined,
      pendingPayment,
    }),
    countPendingPaymentVerifications(),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-bold text-2xl text-brand-ink">Commandes</h1>
        <Link
          href={pendingPayment ? "/admin/commandes" : "/admin/commandes?paiement=a_verifier"}
          className={`text-sm font-semibold px-4 py-2 rounded-full transition ${
            pendingPayment
              ? "bg-brand-orange text-white"
              : "bg-amber-50 text-amber-700 hover:bg-amber-100"
          }`}
        >
          {pendingPayment ? "Voir toutes les commandes" : `A verifier (paiement)${pendingPaymentCount > 0 ? ` · ${pendingPaymentCount}` : ""}`}
        </Link>
      </div>

      <form className="flex flex-wrap gap-3 mb-5">
        {pendingPayment && <input type="hidden" name="paiement" value="a_verifier" />}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Numero, nom ou telephone..."
          className="border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40 bg-white w-64"
        />
        <select name="status" defaultValue={status || ""} className="border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40 bg-white">
          <option value="">Tous les statuts</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <button type="submit" className="rounded-xl border border-brand-border px-4 py-2.5 text-sm font-medium hover:bg-brand-cream">
          Filtrer
        </button>
      </form>

      {orders.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Aucune commande trouvee" />
      ) : (
        <div className="bg-white border border-brand-border rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-brand-gray border-b border-brand-border">
                <th className="px-4 py-3 font-medium">Commande</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Paiement</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const needsPaymentReview =
                  PROOF_REQUIRED_PAYMENT_METHODS.includes(o.payment_method) && o.payment_status === "pending";
                return (
                  <tr key={o.id} className="border-b border-brand-border last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/admin/commandes/${o.id}`} className="font-medium text-brand-ink hover:text-brand-orange">
                        {o.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-brand-gray">{o.customer_name}</td>
                    <td className="px-4 py-3 text-brand-ink">{formatUSD(o.total)}</td>
                    <td className="px-4 py-3">
                      <span className="text-brand-gray">{PAYMENT_METHOD_LABELS[o.payment_method as keyof typeof PAYMENT_METHOD_LABELS]}</span>
                      {needsPaymentReview && (
                        <span className="ml-2 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          A verifier
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 text-brand-gray">{new Date(o.created_at).toLocaleDateString("fr-HT")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
