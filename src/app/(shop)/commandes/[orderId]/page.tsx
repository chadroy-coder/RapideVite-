import { getOrderById } from "@/lib/actions/orders";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { OrderTracker } from "@/components/order/OrderTracker";
import { formatHTG } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/types/database";
import { notFound } from "next/navigation";

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const order = await getOrderById(orderId);
  if (!order) notFound();

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-bold text-xl text-brand-ink">{order.order_number}</h1>
        <OrderStatusBadge status={order.status} />
      </div>
      <p className="text-brand-gray text-sm mb-6">
        {new Date(order.created_at).toLocaleString("fr-HT")}
      </p>

      <div className="border border-brand-border rounded-2xl p-5 mb-6">
        <OrderTracker status={order.status} />
      </div>

      <div className="border border-brand-border rounded-2xl p-5 space-y-3 mb-6">
        <h2 className="font-semibold text-brand-ink">Articles</h2>
        <ul className="space-y-2">
          {(order.items ?? []).map((item) => (
            <li key={item.id} className="flex justify-between text-sm">
              <span>{item.quantity} x {item.product_name}{item.variant_label ? ` (${item.variant_label})` : ""}</span>
              <span className="text-brand-gray">{formatHTG(item.line_total)}</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-brand-border pt-3 flex justify-between font-bold text-brand-ink">
          <span>Total</span>
          <span>{formatHTG(order.total)}</span>
        </div>
      </div>

      <div className="border border-brand-border rounded-2xl p-5 space-y-1 text-sm">
        <h2 className="font-semibold text-brand-ink mb-2">Livraison</h2>
        <p className="text-brand-gray">{order.street}, {order.neighborhood ? `${order.neighborhood}, ` : ""}{order.commune}, {order.department}</p>
        {order.delivery_instructions && <p className="text-brand-gray italic">{order.delivery_instructions}</p>}
        <p className="text-brand-gray mt-2">Paiement: {PAYMENT_METHOD_LABELS[order.payment_method]}</p>
      </div>
    </div>
  );
}
