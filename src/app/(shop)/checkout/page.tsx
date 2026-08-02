"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { checkoutSchema, type CheckoutInput } from "@/lib/validations/schemas";
import { HAITI_DEPARTMENTS, PAYMENT_METHOD_LABELS } from "@/types/database";
import { useCartStore } from "@/store/cart-store";
import { placeOrder } from "@/lib/actions/orders";
import { createCheckoutSession } from "@/lib/actions/stripe";
import { formatHTG } from "@/lib/format";
import { useToastStore } from "@/store/toast-store";
import { EmptyState } from "@/components/ui/EmptyState";
import { ShoppingBag } from "lucide-react";

const DELIVERY_FEE_ESTIMATE = Number(process.env.NEXT_PUBLIC_DEFAULT_DELIVERY_FEE ?? 150);

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clear } = useCartStore();
  const push = useToastStore((s) => s.push);
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Standard Zustand + Next.js hydration guard: avoids an SSR/client mismatch
  // by waiting for the persisted cart to be read from localStorage before
  // deciding whether to show the empty-cart state.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration flag, not a synchronization loop
    setHydrated(true);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { payment_method: "cash_on_delivery", save_address: false },
  });

  if (hydrated && items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        <EmptyState
          icon={ShoppingBag}
          title="Votre panier est vide"
          description="Ajoutez des produits avant de passer a la caisse."
          actionLabel="Retour a l'accueil"
          actionHref="/"
        />
      </div>
    );
  }

  async function onSubmit(values: CheckoutInput) {
    setSubmitting(true);
    const lines = items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
    const result = await placeOrder(lines, values);

    if (result.error) {
      setSubmitting(false);
      push(result.error, "error");
      return;
    }

    if (values.payment_method === "card") {
      const session = await createCheckoutSession(result.orderId!);
      if (session.error || !session.url) {
        setSubmitting(false);
        push(session.error ?? "Le paiement par carte est momentanement indisponible.", "error");
        return;
      }
      clear();
      window.location.href = session.url;
      return;
    }

    setSubmitting(false);
    clear();
    push("Commande passee avec succes !", "success");
    router.push(`/commande-confirmee/${result.orderId}`);
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="font-bold text-xl text-brand-ink mb-5">Finaliser la commande</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <h2 className="font-semibold text-brand-ink mb-2">Coordonnees</h2>
          <div className="space-y-3">
            <div>
              <input
                {...register("customer_name")}
                placeholder="Nom complet"
                className="w-full border border-brand-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
              />
              {errors.customer_name && (
                <p className="text-red-500 text-xs mt-1">{errors.customer_name.message}</p>
              )}
            </div>
            <div>
              <input
                {...register("customer_phone")}
                placeholder="Numero de telephone"
                className="w-full border border-brand-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
              />
              {errors.customer_phone && (
                <p className="text-red-500 text-xs mt-1">{errors.customer_phone.message}</p>
              )}
            </div>
          </div>
        </div>

        <div>
          <h2 className="font-semibold text-brand-ink mb-2">Adresse de livraison</h2>
          <div className="space-y-3">
            <div>
              <select
                {...register("department")}
                className="w-full border border-brand-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
                defaultValue=""
              >
                <option value="" disabled>Departement</option>
                {HAITI_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department.message}</p>}
            </div>
            <div>
              <input
                {...register("commune")}
                placeholder="Commune"
                className="w-full border border-brand-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
              />
              {errors.commune && <p className="text-red-500 text-xs mt-1">{errors.commune.message}</p>}
            </div>
            <input
              {...register("neighborhood")}
              placeholder="Quartier (optionnel)"
              className="w-full border border-brand-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
            />
            <div>
              <input
                {...register("street")}
                placeholder="Adresse / rue"
                className="w-full border border-brand-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
              />
              {errors.street && <p className="text-red-500 text-xs mt-1">{errors.street.message}</p>}
            </div>
            <textarea
              {...register("delivery_instructions")}
              placeholder="Instructions de livraison (optionnel)"
              rows={2}
              className="w-full border border-brand-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
            />
            <label className="flex items-center gap-2 text-sm text-brand-gray">
              <input type="checkbox" {...register("save_address")} className="rounded" />
              Enregistrer cette adresse pour la prochaine fois
            </label>
          </div>
        </div>

        <div>
          <h2 className="font-semibold text-brand-ink mb-2">Mode de paiement</h2>
          <div className="space-y-2">
            {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <label
                key={value}
                className="flex items-center gap-3 border border-brand-border rounded-xl px-4 py-3 text-sm cursor-pointer has-[:checked]:border-brand-orange has-[:checked]:bg-brand-orange/5"
              >
                <input type="radio" value={value} {...register("payment_method")} />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="border-t border-brand-border pt-4 space-y-1.5 text-sm">
          <div className="flex justify-between text-brand-gray">
            <span>Sous-total</span>
            <span className="text-brand-ink font-medium">{formatHTG(subtotal())}</span>
          </div>
          <div className="flex justify-between text-brand-gray">
            <span>Frais de livraison (estime)</span>
            <span className="text-brand-ink font-medium">{formatHTG(DELIVERY_FEE_ESTIMATE)}</span>
          </div>
          <div className="flex justify-between font-bold text-brand-ink text-base pt-1">
            <span>Total</span>
            <span>{formatHTG(subtotal() + DELIVERY_FEE_ESTIMATE)}</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-brand-orange text-white font-semibold py-3.5 hover:bg-brand-orange-dark transition disabled:opacity-60"
        >
          {submitting ? "Traitement en cours..." : "Confirmer la commande"}
        </button>
      </form>
    </div>
  );
}
