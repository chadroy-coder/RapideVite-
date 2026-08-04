"use client";

import { useState } from "react";
import { createBillingPortalSession, createSubscriptionCheckout } from "@/lib/actions/subscription";
import { useToastStore } from "@/store/toast-store";

export function SubscribeButton({ isActive }: { isActive: boolean }) {
  const [loading, setLoading] = useState(false);
  const push = useToastStore((s) => s.push);

  async function handleClick() {
    setLoading(true);
    const result = isActive ? await createBillingPortalSession() : await createSubscriptionCheckout();

    if (result.error || !result.url) {
      setLoading(false);
      push(result.error ?? "Une erreur est survenue.", "error");
      return;
    }

    window.location.href = result.url;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`w-full rounded-full font-semibold py-3.5 transition disabled:opacity-60 ${
        isActive
          ? "border border-brand-border text-brand-ink hover:bg-brand-cream"
          : "bg-brand-orange text-white hover:bg-brand-orange-dark"
      }`}
    >
      {loading ? "Chargement..." : isActive ? "Gerer mon abonnement" : "S'abonner avec une carte"}
    </button>
  );
}
