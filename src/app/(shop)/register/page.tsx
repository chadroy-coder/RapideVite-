"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useState } from "react";
import { registerSchema, type RegisterInput } from "@/lib/validations/schemas";
import { signUp } from "@/lib/actions/auth";
import { useToastStore } from "@/store/toast-store";
import { PhoneAuthForm } from "@/components/auth/PhoneAuthForm";

function RegisterForm() {
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
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterInput) {
    setSubmitting(true);
    const result = await signUp(values);
    setSubmitting(false);
    if (result.error) {
      push(result.error, "error");
      return;
    }
    push("Compte cree ! Verifiez votre email pour confirmer.", "success");
    router.push(redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login");
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-10">
      <h1 className="font-bold text-xl text-brand-ink mb-1">Creer un compte</h1>
      <p className="text-brand-gray text-sm mb-6">Rejoignez RapidVit en quelques secondes.</p>

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
            {...register("full_name")}
            placeholder="Nom complet"
            className="w-full border border-brand-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
          />
          {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
        </div>
        <div>
          <input
            {...register("phone")}
            placeholder="Numero de telephone"
            className="w-full border border-brand-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
          />
          {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
        </div>
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
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-brand-orange text-white font-semibold py-3.5 hover:bg-brand-orange-dark transition disabled:opacity-60"
        >
          {submitting ? "Creation..." : "Creer mon compte"}
        </button>
      </form>
      )}

      <p className="text-sm text-brand-gray mt-5 text-center">
        Deja un compte ?{" "}
        <Link
          href={redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login"}
          className="text-brand-orange font-semibold"
        >
          Se connecter
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
