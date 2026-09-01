"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { verifyWoulibPayment } from "@/lib/actions/admin-woulib";
import { useToastStore } from "@/store/toast-store";
import { PAYMENT_METHOD_LABELS, type PaymentMethod, type PaymentStatus } from "@/types/database";

export function WoulibPaymentProofPanel({
  requestId,
  paymentMethod,
  paymentStatus,
  proofSignedUrl,
}: {
  requestId: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  proofSignedUrl: string | null;
}) {
  const push = useToastStore((s) => s.push);
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleVerify(approve: boolean) {
    setSubmitting(true);
    const result = await verifyWoulibPayment(requestId, approve);
    setSubmitting(false);
    if (result.error) {
      push(result.error, "error");
      return;
    }
    push(approve ? "Paiement confirme" : "Paiement rejete", "success");
    router.refresh();
  }

  return (
    <div className="bg-white border border-brand-border rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-brand-ink">Preuve de paiement - {PAYMENT_METHOD_LABELS[paymentMethod]}</h2>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            paymentStatus === "paid"
              ? "bg-brand-green/10 text-brand-green"
              : paymentStatus === "failed"
              ? "bg-red-50 text-red-600"
              : "bg-amber-50 text-amber-600"
          }`}
        >
          {paymentStatus === "paid" ? "Confirme" : paymentStatus === "failed" ? "Rejete" : "En attente de verification"}
        </span>
      </div>

      {proofSignedUrl ? (
        <a href={proofSignedUrl} target="_blank" rel="noopener noreferrer" className="block">
          <div className="relative w-full h-64 rounded-xl overflow-hidden border border-brand-border bg-brand-cream">
            <Image src={proofSignedUrl} alt="Preuve de paiement" fill sizes="400px" className="object-contain" />
          </div>
          <p className="text-xs text-brand-orange mt-1">Ouvrir en plein ecran</p>
        </a>
      ) : (
        <p className="text-sm text-brand-gray">Aucune capture d&apos;ecran envoyee pour cette demande.</p>
      )}

      {paymentStatus === "pending" && (
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            disabled={submitting || !proofSignedUrl}
            onClick={() => handleVerify(true)}
            className="rounded-full bg-brand-green text-white text-sm font-semibold px-5 py-2.5 hover:opacity-90 transition disabled:opacity-50"
          >
            Confirmer le paiement
          </button>
          <button
            type="button"
            disabled={submitting || !proofSignedUrl}
            onClick={() => handleVerify(false)}
            className="rounded-full border border-red-300 text-red-600 text-sm font-semibold px-5 py-2.5 hover:bg-red-50 transition disabled:opacity-50"
          >
            Rejeter
          </button>
        </div>
      )}
    </div>
  );
}
