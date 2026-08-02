"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/schemas";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordInput) {
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
    });
    setSubmitting(false);
    if (error) {
      if (error.status === 429 || /rate limit/i.test(error.message)) {
        setError("Trop de tentatives. Veuillez patienter une minute avant de reessayer.");
      } else {
        setError("Une erreur est survenue. Veuillez reessayer.");
      }
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="max-w-sm mx-auto px-4 py-10 text-center">
        <h1 className="font-bold text-xl text-brand-ink mb-2">Verifiez vos courriels</h1>
        <p className="text-brand-gray text-sm">
          Si un compte existe avec cette adresse, un lien de reinitialisation vient d&apos;etre envoye.
        </p>
        <Link href="/login" className="text-brand-orange font-semibold text-sm mt-6 inline-block">
          Retour a la connexion
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-10">
      <h1 className="font-bold text-xl text-brand-ink mb-1">Mot de passe oublie</h1>
      <p className="text-brand-gray text-sm mb-6">
        Entrez votre courriel et nous vous enverrons un lien pour reinitialiser votre mot de passe.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <input
            {...register("email")}
            type="email"
            placeholder="Email"
            className="w-full border border-brand-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-brand-orange text-white font-semibold py-3.5 hover:bg-brand-orange-dark transition disabled:opacity-60"
        >
          {submitting ? "Envoi..." : "Envoyer le lien"}
        </button>
      </form>

      <p className="text-sm text-brand-gray mt-5 text-center">
        <Link href="/login" className="text-brand-orange font-semibold">
          Retour a la connexion
        </Link>
      </p>
    </div>
  );
}
