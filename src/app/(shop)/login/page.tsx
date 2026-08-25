"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useState } from "react";
import { loginSchema, type LoginInput } from "@/lib/validations/schemas";
import { signIn } from "@/lib/actions/auth";
import { useToastStore } from "@/store/toast-store";
import { PhoneAuthForm } from "@/components/auth/PhoneAuthForm";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const push = useToastStore((s) => s.push);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"email" | "phone">("email");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setSubmitting(true);
    const result = await signIn(values);
    setSubmitting(false);
    if (result.error) {
      push(result.error, "error");
      return;
    }
    push("Connexion reussie", "success");
    router.push(searchParams.get("redirect") || "/compte");
    router.refresh();
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-10">
      <h1 className="font-bold text-xl text-brand-ink mb-1">Connexion</h1>
      <p className="text-brand-gray text-sm mb-6">Accedez a votre compte RapidVit.</p>

      <div className="flex gap-2 mb-6 bg-brand-cream rounded-full p-1">
        <button
          type="button"
          onClick={() => setMode("email")}
          className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
            mode === "email" ? "bg-white text-brand-ink shadow-sm" : "text-brand-gray"
          }`}
        >
          Email
        </button>
        <button
          type="button"
          onClick={() => setMode("phone")}
          className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
            mode === "phone" ? "bg-white text-brand-ink shadow-sm" : "text-brand-gray"
          }`}
        >
          Telephone
        </button>
      </div>

      {mode === "phone" ? (
        <PhoneAuthForm redirectTo={redirectTo} />
      ) : (
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
        <div>
          <input
            {...register("password")}
            type="password"
            placeholder="Mot de passe"
            className="w-full border border-brand-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
          />
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>
        <div className="text-right -mt-2">
          <Link href="/mot-de-passe-oublie" className="text-xs text-brand-orange font-medium">
            Mot de passe oublie ?
          </Link>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-brand-orange text-white font-semibold py-3.5 hover:bg-brand-orange-dark transition disabled:opacity-60"
        >
          {submitting ? "Connexion..." : "Se connecter"}
        </button>
      </form>
      )}

      <p className="text-sm text-brand-gray mt-5 text-center">
        Pas encore de compte ?{" "}
        <Link
          href={redirectTo ? `/register?redirect=${encodeURIComponent(redirectTo)}` : "/register"}
          className="text-brand-orange font-semibold"
        >
          Creer un compte
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
