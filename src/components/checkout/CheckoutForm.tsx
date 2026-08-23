"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { checkoutSchema, type CheckoutInput } from "@/lib/validations/schemas";
import { HAITI_DEPARTMENTS, PAYMENT_METHOD_LABELS, PROOF_REQUIRED_PAYMENT_METHODS, type PaymentMethod } from "@/types/database";
import { MANUAL_PAYMENT_ACCOUNTS } from "@/lib/payment-accounts";
import { useCartStore } from "@/store/cart-store";
import { placeOrder, uploadPaymentProof } from "@/lib/actions/orders";
import { createCheckoutSession } from "@/lib/actions/stripe";
import { formatUSD, formatHTGEstimate } from "@/lib/format";
import { useToastStore } from "@/store/toast-store";
import { EmptyState } from "@/components/ui/EmptyState";
import { ShoppingBag } from "lucide-react";

const DELIVERY_FEE_ESTIMATE = Number(process.env.NEXT_PUBLIC_DEFAULT_DELIVERY_FEE ?? 1.15);

export interface CheckoutInitialValues {
  customer_name?: string;
  customer_phone?: string;
  department?: string;
  commune?: string;
  neighborhood?: string;
  street?: string;
  delivery_instructions?: string;
}

export function CheckoutForm({
  initialValues,
  isPlusMember = false,
}: {
  initialValues: CheckoutInitialValues;
  isPlusMember?: boolean;
}) {
  const router = useRouter();
  const { items, subtotal, clear } = useCartStore();
  const push = useToastStore((s) => s.push);
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);

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
    watch,
    formState: { errors },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customer_name: initialValues.customer_name ?? "",
      customer_phone: initialValues.customer_phone ?? "",
      department: initialValues.department ?? "",
      commune: initialValues.commune ?? "",
      neighborhood: initialValues.neighborhood ?? "",
      street: initialValues.street ?? "",
      delivery_instructions: initialValues.delivery_instructions ?? "",
      payment_method: "cash_on_delivery",
      save_address: false,
    },
  });

  const selectedPaymentMethod = watch("payment_method") as PaymentMethod;
  const manualAccount =
    selectedPaymentMethod === "moncash" || selectedPaymentMethod === "natcash" || selectedPaymentMethod === "sogebank"
      ? MANUAL_PAYMENT_ACCOUNTS[selectedPaymentMethod]
      : null;

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
    const needsProof = PROOF_REQUIRED_PAYMENT_METHODS.includes(values.payment_method as PaymentMethod);
    if (needsProof && !proofFile) {
      setProofError("Veuillez joindre une capture d'ecran du transfert avant de continuer.");
      return;
    }
    setProofError(null);
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

    if (needsProof && proofFile) {
      const formData = new FormData();
      formData.append("file", proofFile);
      const proofResult = await uploadPaymentProof(result.orderId!, formData);
      if (proofResult.error) {
        setSubmitting(false);
        push(proofResult.error, "error");
        return;
      }
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

          {manualAccount && (
            <div className="mt-3 border border-brand-orange/30 bg-brand-orange/5 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-brand-border bg-white shrink-0">
                  <Image src={manualAccount.logo} alt={PAYMENT_METHOD_LABELS[selectedPaymentMethod]} fill sizes="48px" className="object-contain" />
                </div>
                <p className="text-sm text-brand-ink font-medium">
                  Envoyez le montant total ci-dessous, puis joignez une capture d&apos;ecran de la transaction.
                </p>
              </div>

              <div className="text-sm space-y-1 bg-white rounded-lg border border-brand-border p-3">
                <p>
                  <span className="text-brand-gray">Titulaire du compte : </span>
                  <span className="font-semibold text-brand-ink">{manualAccount.accountHolder}</span>
                </p>
                {manualAccount.phone && (
                  <p>
                    <span className="text-brand-gray">Numero {PAYMENT_METHOD_LABELS[selectedPaymentMethod]} : </span>
                    <span className="font-semibold text-brand-ink">{manualAccount.phone}</span>
                  </p>
                )}
                {manualAccount.accountNumber && (
                  <p>
                    <span className="text-brand-gray">Numero de compte : </span>
                    <span className="font-semibold text-brand-ink">{manualAccount.accountNumber}</span>
                  </p>
                )}
                {manualAccount.email && (
                  <p>
                    <span className="text-brand-gray">Email : </span>
                    <span className="font-semibold text-brand-ink">{manualAccount.email}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-brand-ink block mb-1">
                  Capture d&apos;ecran de la transaction
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    setProofFile(e.target.files?.[0] ?? null);
                    setProofError(null);
                  }}
                  className="w-full text-sm border border-brand-border rounded-xl px-3 py-2 bg-white"
                />
                <p className="text-[11px] text-brand-gray mt-1">.jpg, .jpeg, .png ou .pdf - max 20 Mo</p>
                {proofFile && <p className="text-xs text-brand-green mt-1">Fichier selectionne : {proofFile.name}</p>}
                {proofError && <p className="text-xs text-red-500 mt-1">{proofError}</p>}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-brand-border pt-4 space-y-1.5 text-sm">
          <div className="flex justify-between text-brand-gray">
            <span>Sous-total</span>
            <span className="text-brand-ink font-medium">{formatUSD(subtotal())}</span>
          </div>
          <div className="flex justify-between text-brand-gray">
            <span>Frais de livraison {isPlusMember ? "" : "(estime)"}</span>
            {isPlusMember ? (
              <span className="text-brand-green font-semibold">Gratuit avec Plus+</span>
            ) : (
              <span className="text-brand-ink font-medium">{formatUSD(DELIVERY_FEE_ESTIMATE)}</span>
            )}
          </div>
          <div className="flex justify-between font-bold text-brand-ink text-base pt-1">
            <span>Total</span>
            <div className="text-right">
              <span>{formatUSD(subtotal() + (isPlusMember ? 0 : DELIVERY_FEE_ESTIMATE))}</span>
              <p className="text-[11px] font-normal text-brand-gray">
                {formatHTGEstimate(subtotal() + (isPlusMember ? 0 : DELIVERY_FEE_ESTIMATE))}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-brand-gray text-right">
            Le paiement par carte est toujours effectue en USD.
          </p>
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
