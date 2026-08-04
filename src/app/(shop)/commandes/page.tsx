import Link from "next/link";
import { getMyOrders } from "@/lib/actions/orders";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatUSD } from "@/lib/format";
import { OrderItemsPreview } from "@/components/order/OrderItemsPreview";
import { ClipboardList } from "lucide-react";

export default async function OrdersListPage() {
  const orders = await getMyOrders();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="font-bold text-xl text-brand-ink mb-4">Mes commandes</h1>

      {orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Aucune commande pour le moment"
          description="Vos commandes passees apparaitront ici."
          actionLabel="Commencer mes achats"
          actionHref="/"
        />
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/commandes/${order.id}`}
                className="flex items-center justify-between gap-3 border border-brand-border rounded-2xl px-4 py-3.5 hover:border-brand-orange transition"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-brand-ink text-sm">{order.order_number}</p>
                  <p className="text-xs text-brand-gray mt-0.5">
                    {new Date(order.created_at).toLocaleDateString("fr-HT")} · {formatUSD(order.total)}
                  </p>
                  <OrderItemsPreview items={order.items} />
                </div>
                <OrderStatusBadge status={order.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
