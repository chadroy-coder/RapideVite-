import Image from "next/image";
import { Bike, Clock } from "lucide-react";
import { getOrderById } from "@/lib/actions/orders";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { OrderTracker } from "@/components/order/OrderTracker";
import { formatUSD, formatHTGEstimate } from "@/lib/format";
import { PAYMENT_METHOD_LABELS, PROOF_REQUIRED_PAYMENT_METHODS } from "@/types/database";
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

      {(order.assigned_delivery_person || order.estimated_delivery_time || order.driver_photo_url) && (
        <div className="border border-brand-orange/30 bg-brand-orange/5 rounded-2xl p-5 mb-6 flex items-center gap-4">
          <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-sm bg-brand-cream shrink-0 flex items-center justify-center">
            {order.driver_photo_url ? (
              <Image src={order.driver_photo_url} alt={order.assigned_delivery_person ?? "Livreur"} fill sizes="56px" className="object-cover" />
            ) : (
              <Bike className="w-6 h-6 text-brand-orange" />
            )}
          </div>
          <div>
            {order.assigned_delivery_person && (
              <p className="font-semibold text-brand-ink text-sm">{order.assigned_delivery_person}</p>
            )}
            <p className="text-xs text-brand-gray">Votre livreur</p>
            {order.estimated_delivery_time && (
              <p className="flex items-center gap-1 text-xs text-brand-orange font-semibold mt-1">
                <Clock className="w-3.5 h-3.5" />
                Arrivee estimee: {new Date(order.estimated_delivery_time).toLocaleString("fr-HT", { dateStyle: "short", timeStyle: "short" })}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="border border-brand-border rounded-2xl p-5 space-y-3 mb-6">
        <h2 className="font-semibold text-brand-ink">Articles</h2>
        <ul className="space-y-2">
          {(order.items ?? []).map((item) => (
            <li key={item.id} className="flex justify-between text-sm">
              <span>{item.quantity} x {item.product_name}{item.variant_label ? ` (${item.variant_label})` : ""}</span>
              <span className="text-brand-gray">{formatUSD(item.line_total)}</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-brand-border pt-3 flex justify-between font-bold text-brand-ink">
          <span>Total</span>
          <div className="text-right">
            <span>{formatUSD(order.total)}</span>
            <p className="text-[11px] font-normal text-brand-gray">{formatHTGEstimate(order.total)}</p>
          </div>
        </div>
      </div>

      <div className="border border-brand-border rounded-2xl p-5 space-y-1 text-sm">
        <h2 className="font-semibold text-brand-ink mb-2">Livraison</h2>
        <p className="text-brand-gray">{order.street}, {order.neighborhood ? `${order.neighborhood}, ` : ""}{order.commune}, {order.department}</p>
        {order.delivery_instructions && <p className="text-brand-gray italic">{order.delivery_instructions}</p>}
        <p className="text-brand-gray mt-2">
          Paiement: {PAYMENT_METHOD_LABELS[order.payment_method]}
          {PROOF_REQUIRED_PAYMENT_METHODS.includes(order.payment_method) && (
            <>
              {" "}·{" "}
              {order.payment_status === "paid" && <span className="text-brand-green font-medium">Confirme</span>}
              {order.payment_status === "pending" && <span className="text-amber-600 font-medium">En attente de verification</span>}
              {order.payment_status === "failed" && <span className="text-red-600 font-medium">Rejete - contactez-nous</span>}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
