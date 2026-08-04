import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, ClipboardList, MapPin, ShieldCheck } from "lucide-react";
import { getCurrentUserAndProfile, getMyAddresses } from "@/lib/data";
import { getMyOrders } from "@/lib/actions/orders";
import { signOut } from "@/lib/actions/auth";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { formatUSD } from "@/lib/format";
import { OrderItemsPreview } from "@/components/order/OrderItemsPreview";

const LIVE_STATUSES = new Set(["new", "confirmed", "preparing", "ready", "out_for_delivery"]);

export default async function AccountPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user) redirect("/login?redirect=/compte");

  const [orders, addresses] = await Promise.all([getMyOrders(), getMyAddresses()]);
  const liveOrders = orders.filter((o) => LIVE_STATUSES.has(o.status));
  const defaultAddress = addresses.find((a) => a.is_default) ?? addresses[0];

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="font-bold text-xl text-brand-ink mb-1">Mon compte</h1>
      <p className="text-brand-gray text-sm mb-6">{user.email}</p>

      <div className="border border-brand-border rounded-2xl p-5 mb-4">
        <p className="font-bold text-lg text-brand-ink">{profile?.full_name || "Client RapidVit"}</p>
        {profile?.phone && <p className="text-brand-gray text-sm mt-1">{profile.phone}</p>}
        {defaultAddress && (
          <p className="flex items-start gap-1.5 text-brand-gray text-sm mt-1">
            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-brand-orange" />
            <span>
              {defaultAddress.street}
              {defaultAddress.neighborhood ? `, ${defaultAddress.neighborhood}` : ""}, {defaultAddress.commune},{" "}
              {defaultAddress.department}
            </span>
          </p>
        )}
        {profile?.role !== "customer" && (
          <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-brand-green">
            <ShieldCheck className="w-3.5 h-3.5" /> Compte {profile?.role}
          </span>
        )}
      </div>

      {liveOrders.length > 0 && (
        <div className="mb-4">
          <h2 className="font-semibold text-sm text-brand-ink mb-2">Commandes en cours</h2>
          <ul className="space-y-2">
            {liveOrders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/commandes/${order.id}`}
                  className="flex items-center justify-between gap-3 border border-brand-orange/30 bg-brand-orange/5 rounded-2xl px-4 py-3.5 hover:border-brand-orange transition"
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
        </div>
      )}

      <nav className="space-y-2">
        <Link
          href="/commandes"
          className="flex items-center gap-3 border border-brand-border rounded-xl px-4 py-3.5 hover:border-brand-orange transition"
        >
          <ClipboardList className="w-5 h-5 text-brand-orange" />
          <span className="text-sm font-medium text-brand-ink">Mes commandes</span>
        </Link>
        <Link
          href="/compte/adresses"
          className="flex items-center gap-3 border border-brand-border rounded-xl px-4 py-3.5 hover:border-brand-orange transition"
        >
          <MapPin className="w-5 h-5 text-brand-orange" />
          <span className="text-sm font-medium text-brand-ink">Mes adresses</span>
        </Link>
        {(profile?.role === "admin" || profile?.role === "staff") && (
          <Link
            href="/admin"
            className="flex items-center gap-3 border border-brand-orange bg-brand-orange/5 rounded-xl px-4 py-3.5"
          >
            <ShieldCheck className="w-5 h-5 text-brand-orange" />
            <span className="text-sm font-semibold text-brand-orange">Tableau de bord administrateur</span>
          </Link>
        )}
      </nav>

      <form action={signOut} className="mt-6">
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 border border-brand-border rounded-full py-3 text-sm font-semibold text-brand-ink hover:bg-brand-cream transition"
        >
          <LogOut className="w-4 h-4" /> Se deconnecter
        </button>
      </form>
    </div>
  );
}
