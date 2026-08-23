"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Star, Pencil, Trash2, Plus } from "lucide-react";
import { addressSchema, type AddressInput } from "@/lib/validations/schemas";
import type { Address } from "@/types/database";
import { addAddress, updateAddress, deleteAddress, setDefaultAddress } from "@/lib/actions/addresses";
import { useToastStore } from "@/store/toast-store";

export function AddressManager({ addresses }: { addresses: Address[] }) {
  const router = useRouter();
  const push = useToastStore((s) => s.push);
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressInput>({ resolver: zodResolver(addressSchema) });

  function openNew() {
    reset({
      label: "Maison",
      neighborhood: "",
      street: "",
      delivery_instructions: "",
      is_default: addresses.length === 0,
    });
    setEditing("new");
  }

  function openEdit(addr: Address) {
    reset({
      label: addr.label ?? "Maison",
      neighborhood: addr.neighborhood ?? "",
      street: addr.street,
      delivery_instructions: addr.delivery_instructions ?? "",
      is_default: addr.is_default,
    });
    setEditing(addr);
  }

  async function onSubmit(values: AddressInput) {
    setSubmitting(true);
    const result =
      editing === "new" ? await addAddress(values) : await updateAddress((editing as Address).id, values);
    setSubmitting(false);
    if (result.error) {
      push(result.error, "error");
      return;
    }
    push(editing === "new" ? "Adresse ajoutee" : "Adresse modifiee", "success");
    setEditing(null);
    router.refresh();
  }

  async function onDelete(id: string) {
    if (!confirm("Supprimer cette adresse ?")) return;
    const result = await deleteAddress(id);
    if (result.error) {
      push(result.error, "error");
      return;
    }
    push("Adresse supprimee", "success");
    router.refresh();
  }

  async function onSetDefault(id: string) {
    const result = await setDefaultAddress(id);
    if (result.error) {
      push(result.error, "error");
      return;
    }
    router.refresh();
  }

  if (editing) {
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <input
            {...register("label")}
            placeholder="Nom (ex: Maison, Bureau)"
            className="w-full border border-brand-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
          />
          {errors.label && <p className="text-red-500 text-xs mt-1">{errors.label.message}</p>}
        </div>
        <input
          {...register("neighborhood")}
          placeholder="Quartier (optionnel)"
          className="w-full border border-brand-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
        />
        <div>
          <input
            {...register("street")}
            placeholder="Adresse / rue"
            className="w-full border border-brand-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
          />
          {errors.street && <p className="text-red-500 text-xs mt-1">{errors.street.message}</p>}
        </div>
        <textarea
          {...register("delivery_instructions")}
          placeholder="Instructions de livraison (optionnel)"
          rows={2}
          className="w-full border border-brand-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
        />
        <label className="flex items-center gap-2 text-sm text-brand-gray">
          <input type="checkbox" {...register("is_default")} className="rounded" />
          Definir comme adresse par defaut
        </label>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="flex-1 rounded-full border border-brand-border py-3 text-sm font-semibold text-brand-ink hover:bg-brand-cream transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-full bg-brand-orange text-white py-3 text-sm font-semibold hover:bg-brand-orange-dark transition disabled:opacity-60"
          >
            {submitting ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      {addresses.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-10 px-6 border border-dashed border-brand-border rounded-2xl">
          <div className="w-14 h-14 rounded-full bg-brand-cream flex items-center justify-center mb-3">
            <MapPin className="w-7 h-7 text-brand-orange" />
          </div>
          <h3 className="font-semibold text-brand-ink">Aucune adresse enregistree</h3>
          <p className="text-brand-gray text-sm mt-1 max-w-xs">
            Ajoutez une adresse pour accelerer vos prochaines commandes.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {addresses.map((addr) => (
            <li key={addr.id} className="border border-brand-border rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-brand-ink text-sm">{addr.label || "Adresse"}</p>
                    {addr.is_default && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-orange">
                        <Star className="w-3 h-3 fill-brand-orange" /> Par defaut
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-brand-gray mt-1">
                    {addr.street}
                    {addr.neighborhood ? `, ${addr.neighborhood}` : ""}
                    {addr.commune ? `, ${addr.commune}` : ""}
                    {addr.department ? `, ${addr.department}` : ""}
                  </p>
                  {addr.delivery_instructions && (
                    <p className="text-xs text-brand-gray mt-1 italic">{addr.delivery_instructions}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(addr)}
                    aria-label="Modifier"
                    className="p-2 rounded-full hover:bg-brand-cream transition"
                  >
                    <Pencil className="w-4 h-4 text-brand-gray" />
                  </button>
                  <button
                    onClick={() => onDelete(addr.id)}
                    aria-label="Supprimer"
                    className="p-2 rounded-full hover:bg-red-50 transition"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
              {!addr.is_default && (
                <button
                  onClick={() => onSetDefault(addr.id)}
                  className="mt-2 text-xs font-semibold text-brand-orange hover:underline"
                >
                  Definir par defaut
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={openNew}
        className="w-full flex items-center justify-center gap-2 rounded-full border border-brand-orange text-brand-orange font-semibold py-3 text-sm hover:bg-brand-orange/5 transition"
      >
        <Plus className="w-4 h-4" /> Ajouter une adresse
      </button>
    </div>
  );
}
