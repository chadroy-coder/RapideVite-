import Link from "next/link";
import { getDashboardStats } from "@/lib/actions/admin-stats";
import { formatUSD } from "@/lib/format";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const stats = await getDashboardStats();

  const cards = [
    { label: "Commandes aujourd'hui", value: stats.ordersTodayCount },
    { label: "Revenu aujourd'hui", value: formatUSD(stats.revenueToday) },
    { label: "Commandes en attente", value: stats.pendingOrdersCount },
    { label: "Produits en stock faible", value: stats.lowStockItems.length },
  ];

  return (
    <div>
      <h1 className="font-bold text-2xl text-brand-ink mb-6">Vue d&apos;ensemble</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border border-brand-border rounded-2xl p-5">
            <p className="text-xs text-brand-gray font-medium">{c.label}</p>
            <p className="text-2xl font-extrabold text-brand-ink mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-brand-border rounded-2xl p-5">
          <h2 className="font-semibold text-brand-ink mb-4">Commandes recentes</h2>
          {stats.recentOrders.length === 0 ? (
            <p className="text-sm text-brand-gray">Aucune commande pour le moment.</p>
          ) : (
            <ul className="space-y-2">
              {stats.recentOrders.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/admin/commandes/${o.id}`}
                    className="flex items-center justify-between text-sm py-2 border-b border-brand-border last:border-0"
                  >
                    <span className="font-medium text-brand-ink">{o.order_number}</span>
                    <span className="text-brand-gray">{formatUSD(o.total)}</span>
                    <OrderStatusBadge status={o.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-brand-border rounded-2xl p-5">
          <h2 className="font-semibold text-brand-ink mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Stock faible
          </h2>
          {stats.lowStockItems.length === 0 ? (
            <p className="text-sm text-brand-gray">Tous les produits ont un stock suffisant.</p>
          ) : (
            <ul className="space-y-2">
              {stats.lowStockItems.map((item) => (
                <li key={item.id} className="flex items-center justify-between text-sm py-2 border-b border-brand-border last:border-0">
                  <span className="text-brand-ink">
                    {(item.product as unknown as { name: string } | null)?.name ?? "Produit"} {item.size ? `(${item.size})` : ""}
                  </span>
                  <span className="font-semibold text-amber-600">{item.inventory_quantity} restant</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-brand-border rounded-2xl p-5 lg:col-span-2">
          <h2 className="font-semibold text-brand-ink mb-4">Produits les plus vendus</h2>
          {stats.topProducts.length === 0 ? (
            <p className="text-sm text-brand-gray">Pas encore de ventes.</p>
          ) : (
            <ul className="space-y-2">
              {stats.topProducts.map((p) => (
                <li key={p.name} className="flex items-center justify-between text-sm py-2 border-b border-brand-border last:border-0">
                  <span className="text-brand-ink">{p.name}</span>
                  <span className="font-semibold text-brand-ink">{p.qty} vendus</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
