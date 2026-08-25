"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendPhoneOtp, verifyPhoneOtp } from "@/lib/actions/auth";
import { useToastStore } from "@/store/toast-store";

// Shared phone-number + SMS-code sign-in/sign-up flow, used on both the
// login and register pages. Supabase's signInWithOtp handles both cases in
// one call - it creates the account on first use and signs in on repeat
// use - so there's nothing to branch on here besides whether to ask for a
// name (only useful the first time, harmless to ask again otherwise).
export function PhoneAuthForm({ redirectTo }: { redirectTo?: string | null }) {
  const router = useRouter();
  const push = useToastStore((s) => s.push);
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("+509 ");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedPhone = phone.replace(/[^\d+]/g, "");

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await sendPhoneOtp({
      phone: normalizedPhone,
      full_name: fullName.trim() || undefined,
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    push("Code envoye par SMS", "success");
    setStep("code");
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await verifyPhoneOtp({
      phone: normalizedPhone,
      token: code.trim(),
      full_name: fullName.trim() || undefined,
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    push("Connexion reussie", "success");
    router.push(redirectTo || "/compte");
    router.refresh();
  }

  if (step === "code") {
    return (
      <form onSubmit={handleVerifyCode} className="space-y-4">
        <p className="text-brand-gray text-sm">
          Code envoye au <span className="font-medium text-brand-ink">{normalizedPhone}</span>.
        </p>
        <div>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            maxLength={6}
            placeholder="Code a 6 chiffres"
            autoFocus
            className="w-full border border-brand-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40 tracking-widest text-center text-lg"
          />
        </div>
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <button
          type="submit"
          disabled={submitting || code.trim().length !== 6}
          className="w-full rounded-full bg-brand-orange text-white font-semibold py-3.5 hover:bg-brand-orange-dark transition disabled:opacity-60"
        >
          {submitting ? "Verification..." : "Verifier"}
        </button>
        <button
          type="button"
          onClick={() => {
            setStep("phone");
            setCode("");
            setError(null);
          }}
          className="w-full text-sm text-brand-gray"
        >
          Changer de numero
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSendCode} className="space-y-4">
      <div>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Nom complet"
          className="w-full border border-brand-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
        />
      </div>
      <div>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+509 XXXX XXXX"
          className="w-full border border-brand-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
        />
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-brand-orange text-white font-semibold py-3.5 hover:bg-brand-orange-dark transition disabled:opacity-60"
      >
        {submitting ? "Envoi..." : "Envoyer le code"}
      </button>
    </form>
  );
}
