import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { getOrderById } from "@/lib/actions/orders";
import { formatUSD, formatHTGEstimate } from "@/lib/format";
import { notFound } from "next/navigation";

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ paiement?: string }>;
}) {
  const { orderId } = await params;
  const { paiement } = await searchParams;
  const order = await getOrderById(orderId);
  if (!order) notFound();

  const isCardOrder = order.payment_method === "card";
  const cardCancelled = isCardOrder && paiement === "annule" && order.payment_status !== "paid";
  const cardPaid = isCardOrder && order.payment_status === "paid";

  return (
    <div className="max-w-xl mx-auto px-4 py-10 text-center">
      <div
        className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
          cardCancelled ? "bg-red-50" : "bg-green-50"
        }`}
      >
        {cardCancelled ? (
          <XCircle className="w-9 h-9 text-red-500" />
        ) : (
          <CheckCircle2 className="w-9 h-9 text-brand-green" />
        )}
      </div>
      {cardCancelled ? (
        <>
          <h1 className="font-bold text-xl text-brand-ink">Paiement non complete</h1>
          <p className="text-brand-gray text-sm mt-1">
            Votre commande <span className="font-semibold text-brand-ink">{order.order_number}</span> a ete
            enregistree, mais le paiement par carte n&apos;a pas ete finalise. Vous pouvez reessayer depuis vos
            commandes.
          </p>
        </>
      ) : (
        <>
          <h1 className="font-bold text-xl text-brand-ink">Merci pour votre commande !</h1>
          <p className="text-brand-gray text-sm mt-1">
            Commande <span className="font-semibold text-brand-ink">{order.order_number}</span> confirmee.
            {isCardOrder && (cardPaid ? " Paiement recu." : " Paiement en cours de confirmation.")}
          </p>
        </>
      )}

      <div className="mt-6 border border-brand-border rounded-2xl p-5 text-left space-y-3">
        <ul className="space-y-2">
          {(order.items ?? []).map((item) => (
            <li key={item.id} className="flex justify-between text-sm">
              <span className="text-brand-ink">
                {item.quantity} x {item.product_name}
                {item.variant_label ? ` (${item.variant_label})` : ""}
              </span>
              <span className="text-brand-gray">{formatUSD(item.line_total)}</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-brand-border pt-3 space-y-1 text-sm">
          <div className="flex justify-between text-brand-gray">
            <span>Sous-total</span>
            <span>{formatUSD(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-brand-gray">
            <span>Livraison</span>
            <span>{formatUSD(order.delivery_fee)}</span>
          </div>
          <div className="flex justify-between font-bold text-brand-ink">
            <span>Total</span>
            <div className="text-right">
              <span>{formatUSD(order.total)}</span>
              <p className="text-[11px] font-normal text-brand-gray">{formatHTGEstimate(order.total)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <Link
          href={`/commandes/${order.id}`}
          className="rounded-full bg-brand-orange text-white font-semibold py-3.5 hover:bg-brand-orange-dark transition"
        >
          Suivre ma commande
        </Link>
        <Link href="/" className="text-brand-gray text-sm hover:text-brand-orange">
          Retour a l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
