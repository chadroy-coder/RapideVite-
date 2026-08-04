"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, User } from "lucide-react";
import { driverSchema, type DriverInput } from "@/lib/validations/schemas";
import type { Driver } from "@/types/database";
import { createDriver, updateDriver, deleteDriver, uploadDriverAvatarPhoto } from "@/lib/actions/admin-drivers";
import { useToastStore } from "@/store/toast-store";

export function DriverManager({ drivers }: { drivers: Driver[] }) {
  const router = useRouter();
  const push = useToastStore((s) => s.push);
  const [editing, setEditing] = useState<Driver | "new" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<DriverInput>({ resolver: zodResolver(driverSchema) });

  function openNew() {
    reset({ name: "", phone: "", photo_url: "", active: true });
    setPhotoPreview("");
    setEditing("new");
  }

  function openEdit(driver: Driver) {
    reset({
      name: driver.name,
      phone: driver.phone ?? "",
      photo_url: driver.photo_url ?? "",
      active: driver.active,
    });
    setPhotoPreview(driver.photo_url ?? "");
    setEditing(driver);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadDriverAvatarPhoto(formData);
    setUploading(false);
    if (result.error || !result.url) {
      push(result.error ?? "Echec du telechargement.", "error");
      return;
    }
    setValue("photo_url", result.url);
    setPhotoPreview(result.url);
  }

  async function onSubmit(values: DriverInput) {
    setSubmitting(true);
    const result = editing === "new" ? await createDriver(values) : await updateDriver((editing as Driver).id, values);
    setSubmitting(false);
    if (result.error) {
      push(result.error, "error");
      return;
    }
    push(editing === "new" ? "Livreur ajoute" : "Livreur modifie", "success");
    setEditing(null);
    router.refresh();
  }

  async function onDelete(id: string) {
    if (!confirm("Supprimer ce livreur ?")) return;
    const result = await deleteDriver(id);
    if (result.error) {
      push(result.error, "error");
      return;
    }
    push("Livreur supprime", "success");
    router.refresh();
  }

  if (editing) {
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white border border-brand-border rounded-2xl p-5 max-w-md">
        <div>
          <label className="text-sm font-medium text-brand-ink">Nom</label>
          <input {...register("name")} className="mt-1 w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40" />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-brand-ink">Telephone (optionnel)</label>
          <input {...register("phone")} className="mt-1 w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40" />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-ink">Photo</label>
          <div className="mt-1 flex items-center gap-3">
            {photoPreview && (
              <div className="relative w-14 h-14 rounded-full overflow-hidden border border-brand-border shrink-0">
                <Image src={photoPreview} alt="Livreur" fill sizes="56px" className="object-cover" />
              </div>
            )}
            <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} className="text-sm" />
          </div>
          {uploading && <p className="text-xs text-brand-gray mt-1">Telechargement...</p>}
          <input type="hidden" {...register("photo_url")} />
        </div>
        <label className="flex items-center gap-2 text-sm text-brand-gray">
          <input type="checkbox" {...register("active")} className="rounded" />
          Actif (disponible pour assignation)
        </label>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => setEditing(null)}
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
    <div className="space-y-3">
      {drivers.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-10 px-6 border border-dashed border-brand-border rounded-2xl">
          <div className="w-14 h-14 rounded-full bg-brand-cream flex items-center justify-center mb-3">
            <User className="w-7 h-7 text-brand-orange" />
          </div>
          <h3 className="font-semibold text-brand-ink">Aucun livreur enregistre</h3>
          <p className="text-brand-gray text-sm mt-1 max-w-xs">
            Ajoutez vos livreurs pour les assigner rapidement aux commandes.
          </p>
        </div>
      ) : (
        <ul className="space-y-2 max-w-md">
          {drivers.map((driver) => (
            <li key={driver.id} className="flex items-center justify-between gap-3 border border-brand-border rounded-2xl p-3 bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative w-11 h-11 rounded-full overflow-hidden border border-brand-border bg-brand-cream shrink-0 flex items-center justify-center">
                  {driver.photo_url ? (
                    <Image src={driver.photo_url} alt={driver.name} fill sizes="44px" className="object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-brand-orange" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-brand-ink text-sm truncate">{driver.name}</p>
                  <p className="text-xs text-brand-gray">
                    {driver.phone || "Pas de telephone"} · {driver.active ? "Actif" : "Inactif"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(driver)} aria-label="Modifier" className="p-2 rounded-full hover:bg-brand-cream transition">
                  <Pencil className="w-4 h-4 text-brand-gray" />
                </button>
                <button onClick={() => onDelete(driver.id)} aria-label="Supprimer" className="p-2 rounded-full hover:bg-red-50 transition">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={openNew}
        className="max-w-md w-full flex items-center justify-center gap-2 rounded-full border border-brand-orange text-brand-orange font-semibold py-2.5 text-sm hover:bg-brand-orange/5 transition"
      >
        <Plus className="w-4 h-4" /> Ajouter un livreur
      </button>
    </div>
  );
}
