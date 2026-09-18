"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Sparkles, ShieldCheck } from "lucide-react";
import { profileSchema, type ProfileInput } from "@/lib/validations/schemas";
import { updateProfile } from "@/lib/actions/profile";
import { useToastStore } from "@/store/toast-store";

// Renders the name/phone block on /compte - either as plain text (default)
// or, once the pencil icon is tapped, as an editable form. This is the only
// place account details can be changed now that checkout no longer silently
// syncs them (see src/lib/actions/orders.ts).
export function ProfileEditForm({
  fullName,
  phone,
  isPlusMember,
  role,
  startInEditMode = false,
}: {
  fullName: string;
  phone: string;
  isPlusMember: boolean;
  role: string | null | undefined;
  // Woulib links here with ?edit=1 when a ride can't be booked because the
  // account is missing a name/phone - jump straight into the form instead
  // of making the customer find the pencil icon themselves.
  startInEditMode?: boolean;
}) {
  const router = useRouter();
  const push = useToastStore((s) => s.push);
  const [editing, setEditing] = useState(startInEditMode);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: fullName, phone },
  });

  async function onSubmit(values: ProfileInput) {
    setSubmitting(true);
    const result = await updateProfile(values);
    setSubmitting(false);
    if (result.error) {
      push(result.error, "error");
      return;
    }
    push("Profil mis a jour", "success");
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
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
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="flex-1 rounded-full border border-brand-border py-2.5 text-sm font-semibold text-brand-ink hover:bg-brand-cream transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-full bg-brand-orange text-white py-2.5 text-sm font-semibold hover:bg-brand-orange-dark transition disabled:opacity-60"
          >
            {submitting ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <div className="flex items-center gap-2">
          <p className="font-bold text-lg text-brand-ink">{fullName || "Client RapidVit"}</p>
          {isPlusMember && (
            <span className="inline-flex items-center gap-1 bg-brand-orange/10 text-brand-orange text-xs font-bold px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3" /> Plus+
            </span>
          )}
        </div>
        {phone && <p className="text-brand-gray text-sm mt-1">{phone}</p>}
        {role && role !== "customer" && (
          <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-brand-green">
            <ShieldCheck className="w-3.5 h-3.5" /> Compte {role}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label="Modifier mes informations"
        className="p-2 rounded-full hover:bg-brand-cream transition shrink-0"
      >
        <Pencil className="w-4 h-4 text-brand-gray" />
      </button>
    </div>
  );
}
