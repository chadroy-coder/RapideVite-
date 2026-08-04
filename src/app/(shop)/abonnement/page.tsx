import { redirect } from "next/navigation";
import { Check, Sparkles, CreditCard } from "lucide-react";
import { getCurrentUserAndProfile } from "@/lib/data";
import { getMySubscription } from "@/lib/actions/subscription";
import { isSubscriptionActive } from "@/lib/subscription-utils";
import { SubscribeButton } from "@/components/subscription/SubscribeButton";
import { formatUSD } from "@/lib/format";
import { SUBSCRIPTION_PRICE_USD } from "@/types/database";

const BENEFITS = [
  "Livraisons illimitees pendant 1 mois",
  "Frais de livraison a 0$ sur chaque commande",
  "Annulable a tout moment",
];

export default async function AbonnementPage() {
  const { user } = await getCurrentUserAndProfile();
  if (!user) redirect("/login?redirect=/abonnement");

  const subscription = await getMySubscription();
  const active = isSubscriptionActive(subscription);

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <span className="inline-flex items-center gap-1.5 bg-brand-orange/10 text-brand-orange font-bold text-sm px-3 py-1.5 rounded-full">
          <Sparkles className="w-4 h-4" /> RapidVit Plus+
        </span>
        <h1 className="font-bold text-2xl text-brand-ink mt-3">Livraisons illimitees</h1>
        <p className="text-brand-gray text-sm mt-1">
          {formatUSD(SUBSCRIPTION_PRICE_USD)}/mois &middot; paiement par carte uniquement
        </p>
      </div>

      {active && (
        <div className="flex items-center gap-2 bg-brand-green/10 text-brand-green font-semibold text-sm rounded-xl px-4 py-3 mb-4">
          <Sparkles className="w-4 h-4 shrink-0" />
          Vous etes abonne Plus+
          {subscription?.current_period_end && (
            <span className="font-normal text-brand-ink/70">
              &middot; renouvellement le{" "}
              {new Date(subscription.current_period_end).toLocaleDateString("fr-HT")}
            </span>
          )}
        </div>
      )}

      <div className="border border-brand-border rounded-2xl p-6 mb-4">
        <ul className="space-y-3 mb-6">
          {BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2.5 text-sm text-brand-ink">
              <Check className="w-4 h-4 text-brand-green mt-0.5 shrink-0" />
              {benefit}
            </li>
          ))}
        </ul>

        <SubscribeButton isActive={active} />

        <p className="flex items-center justify-center gap-1.5 text-xs text-brand-gray mt-3">
          <CreditCard className="w-3.5 h-3.5" /> Carte bancaire requise, via Stripe
        </p>
      </div>
    </div>
  );
}
