"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/schemas";
import { createClient } from "@/lib/supabase/client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"checking" | "ready" | "invalid" | "done">("checking");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  useEffect(() => {
    const supabase = createClient();

    // createBrowserClient uses the PKCE flow, so Supabase's recovery link
    // lands here as `?code=...` (not the old hash-based `#access_token=...`).
    // We have to explicitly exchange that code for a session - without this,
    // the page just sits there with no session and the reset silently fails.
    const code = searchParams.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        setStatus(error ? "invalid" : "ready");
      });
      return;
    }

    // Fallback: older-style recovery links that use hash tokens instead of
    // a `code` query param. The browser client parses these automatically
    // and fires this event once the recovery session is established.
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setStatus("ready");
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setStatus((s) => (s === "checking" ? "ready" : s));
    });

    const timeout = setTimeout(() => {
      setStatus((s) => (s === "checking" ? "invalid" : s));
    }, 4000);

    return () => {
      subscription.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [searchParams]);

  async function onSubmit(values: ResetPasswordInput) {
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: values.password });
    setSubmitting(false);
    if (error) {
      setError("Impossible de mettre a jour le mot de passe. Le lien a peut-etre expire.");
      return;
    }
    setStatus("done");
    setTimeout(() => router.push("/login"), 2000);
  }

  if (status === "checking") {
    return <div className="max-w-sm mx-auto px-4 py-10 text-center text-brand-gray text-sm">Verification du lien...</div>;
  }

  if (status === "invalid") {
    return (
      <div className="max-w-sm mx-auto px-4 py-10 text-center">
        <h1 className="font-bold text-xl text-brand-ink mb-2">Lien invalide ou expire</h1>
        <p className="text-brand-gray text-sm mb-6">
          Veuillez demander un nouveau lien de reinitialisation.
        </p>
        <Link href="/mot-de-passe-oublie" className="text-brand-orange font-semibold text-sm">
          Demander un nouveau lien
        </Link>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="max-w-sm mx-auto px-4 py-10 text-center">
        <h1 className="font-bold text-xl text-brand-ink mb-2">Mot de passe mis a jour</h1>
        <p className="text-brand-gray text-sm">Redirection vers la connexion...</p>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-10">
      <h1 className="font-bold text-xl text-brand-ink mb-1">Nouveau mot de passe</h1>
      <p className="text-brand-gray text-sm mb-6">Choisissez un nouveau mot de passe pour votre compte.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <input
            {...register("password")}
            type="password"
            placeholder="Nouveau mot de passe"
            className="w-full border border-brand-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
          />
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>
        <div>
          <input
            {...register("confirm_password")}
            type="password"
            placeholder="Confirmer le mot de passe"
            className="w-full border border-brand-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
          />
          {errors.confirm_password && (
            <p className="text-red-500 text-xs mt-1">{errors.confirm_password.message}</p>
          )}
        </div>
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-brand-orange text-white font-semibold py-3.5 hover:bg-brand-orange-dark transition disabled:opacity-60"
        >
          {submitting ? "Mise a jour..." : "Mettre a jour le mot de passe"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
