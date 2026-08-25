"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPhone, signUpWithPhone } from "@/lib/actions/auth";
import { useToastStore } from "@/store/toast-store";

// Shared phone-number + password sign-in/sign-up form, used on both the
// login and register pages. Plain password auth (no SMS) since SMS OTP
// costs money per message that isn't worth it for this app right now.
export function PhoneAuthForm({
  mode,
  redirectTo,
}: {
  mode: "login" | "register";
  redirectTo?: string | null;
}) {
  const router = useRouter();
  const push = useToastStore((s) => s.push);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("+509 ");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedPhone = phone.replace(/[^\d+]/g, "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (mode === "register") {
      const result = await signUpWithPhone({
        full_name: fullName,
        phone: normalizedPhone,
        password,
        confirm_password: confirmPassword,
      });
      setSubmitting(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      push("Compte cree !", "success");
      router.push(redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login");
      return;
    }

    const result = await signInWithPhone({ phone: normalizedPhone, password });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    push("Connexion reussie", "success");
    router.push(redirectTo || "/compte");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === "register" && (
        <div>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nom complet"
            className="w-full border border-brand-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
          />
        </div>
      )}
      <div>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+509 XXXX XXXX"
          className="w-full border border-brand-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
        />
      </div>
      <div>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Mot de passe"
          className="w-full border border-brand-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
        />
      </div>
      {mode === "register" && (
        <div>
          <input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            type="password"
            placeholder="Confirmer le mot de passe"
            className="w-full border border-brand-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
          />
        </div>
      )}
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-brand-orange text-white font-semibold py-3.5 hover:bg-brand-orange-dark transition disabled:opacity-60"
      >
        {submitting
          ? mode === "register"
            ? "Creation..."
            : "Connexion..."
          : mode === "register"
            ? "Creer mon compte"
            : "Se connecter"}
      </button>
    </form>
  );
}
