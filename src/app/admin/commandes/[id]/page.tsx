import { notFound } from "next/navigation";
import { getOrderAdmin } from "@/lib/actions/admin-orders";
import { listDrivers } from "@/lib/actions/admin-drivers";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";
import { formatUSD } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/types/database";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [order, drivers] = await Promise.all([getOrderAdmin(id), listDrivers()]);
  if (!order) notFound();

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-2xl text-brand-ink">{order.order_number}</h1>
          <OrderStatusBadge status={order.status} />
        </div>

        <div className="bg-white border border-brand-border rounded-2xl p-5">
          <h2 className="font-semibold text-brand-ink mb-3">Articles</h2>
          <ul className="space-y-2">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between text-sm py-2 border-b border-brand-border last:border-0">
                <span>{item.quantity} x {item.product_name}{item.variant_label ? ` (${item.variant_label})` : ""}</span>
                <span className="text-brand-gray">{formatUSD(item.line_total)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-brand-border mt-3 pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-brand-gray"><span>Sous-total</span><span>{formatUSD(order.subtotal)}</span></div>
            <div className="flex justify-between text-brand-gray"><span>Livraison</span><span>{formatUSD(order.delivery_fee)}</span></div>
            {order.discount > 0 && <div className="flex justify-between text-brand-gray"><span>Remise</span><span>-{formatUSD(order.discount)}</span></div>}
            <div className="flex justify-between font-bold text-brand-ink"><span>Total</span><span>{formatUSD(order.total)}</span></div>
          </div>
        </div>

        <div className="bg-white border border-brand-border rounded-2xl p-5 space-y-1 text-sm">
          <h2 className="font-semibold text-brand-ink mb-2">Client et livraison</h2>
          <p className="text-brand-ink font-medium">{order.customer_name}</p>
          <p className="text-brand-gray">{order.customer_phone}</p>
          <p className="text-brand-gray">{order.street}, {order.neighborhood ? `${order.neighborhood}, ` : ""}{order.commune}, {order.department}</p>
          {order.delivery_instructions && <p className="text-brand-gray italic">{order.delivery_instructions}</p>}
          <p className="text-brand-gray mt-2">Paiement: {PAYMENT_METHOD_LABELS[order.payment_method]} · Statut paiement: {order.payment_status}</p>
        </div>
      </div>

      <OrderStatusForm
        orderId={order.id}
        currentStatus={order.status}
        assignedDeliveryPerson={order.assigned_delivery_person}
        estimatedDeliveryTime={order.estimated_delivery_time}
        driverPhotoUrl={order.driver_photo_url}
        drivers={drivers.filter((d) => d.active)}
      />
    </div>
  );
}
