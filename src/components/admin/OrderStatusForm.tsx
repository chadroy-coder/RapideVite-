"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { orderStatusUpdateSchema, type OrderStatusUpdateInput } from "@/lib/validations/schemas";
import { updateOrderStatus, uploadDriverPhoto } from "@/lib/actions/admin-orders";
import { useToastStore } from "@/store/toast-store";
import { ORDER_STATUS_LABELS, type Driver } from "@/types/database";
import { useRouter } from "next/navigation";
import Image from "next/image";

export function OrderStatusForm({
  orderId,
  currentStatus,
  assignedDeliveryPerson,
  estimatedDeliveryTime,
  driverPhotoUrl,
  drivers,
}: {
  orderId: string;
  currentStatus: string;
  assignedDeliveryPerson: string | null;
  estimatedDeliveryTime: string | null;
  driverPhotoUrl: string | null;
  drivers: Driver[];
}) {
  const push = useToastStore((s) => s.push);
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(driverPhotoUrl || "");

  const { register, handleSubmit, setValue } = useForm<OrderStatusUpdateInput>({
    resolver: zodResolver(orderStatusUpdateSchema),
    defaultValues: {
      order_id: orderId,
      status: currentStatus as OrderStatusUpdateInput["status"],
      assigned_delivery_person: assignedDeliveryPerson ?? "",
      estimated_delivery_time: estimatedDeliveryTime ?? "",
      driver_photo_url: driverPhotoUrl ?? "",
    },
  });

  function handleDriverPick(e: React.ChangeEvent<HTMLSelectElement>) {
    const driver = drivers.find((d) => d.id === e.target.value);
    if (!driver) return;
    setValue("assigned_delivery_person", driver.name);
    setValue("driver_photo_url", driver.photo_url ?? "");
    setPhotoPreview(driver.photo_url ?? "");
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadDriverPhoto(formData);
    setUploading(false);
    if (result.error || !result.url) {
      push(result.error ?? "Echec du telechargement.", "error");
      return;
    }
    setValue("driver_photo_url", result.url);
    setPhotoPreview(result.url);
  }

  async function onSubmit(values: OrderStatusUpdateInput) {
    setSubmitting(true);
    const result = await updateOrderStatus(values);
    setSubmitting(false);
    if (result.error) {
      push(result.error, "error");
      return;
    }
    push("Commande mise a jour", "success");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white border border-brand-border rounded-2xl p-5">
      <h2 className="font-semibold text-brand-ink">Gerer la commande</h2>
      <div>
        <label className="text-sm font-medium text-brand-ink">Statut</label>
        <select {...register("status")} className="mt-1 w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40">
          {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      {drivers.length > 0 && (
        <div>
          <label className="text-sm font-medium text-brand-ink">Livreur disponible</label>
          <select
            onChange={handleDriverPick}
            defaultValue=""
            className="mt-1 w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
          >
            <option value="" disabled>
              Selectionner...
            </option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="text-sm font-medium text-brand-ink">Livreur assigne</label>
        <input {...register("assigned_delivery_person")} className="mt-1 w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40" />
      </div>
      <div>
        <label className="text-sm font-medium text-brand-ink">Heure de livraison estimee</label>
        <input type="datetime-local" {...register("estimated_delivery_time")} className="mt-1 w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40" />
      </div>
      <div>
        <label className="text-sm font-medium text-brand-ink">Photo du livreur</label>
        <div className="mt-1 flex items-center gap-3">
          {photoPreview && (
            <div className="relative w-14 h-14 rounded-full overflow-hidden border border-brand-border shrink-0">
              <Image src={photoPreview} alt="Livreur" fill sizes="56px" className="object-cover" />
            </div>
          )}
          <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} className="text-sm" />
        </div>
        {uploading && <p className="text-xs text-brand-gray mt-1">Telechargement...</p>}
        <input type="hidden" {...register("driver_photo_url")} />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-brand-orange text-white font-semibold px-6 py-2.5 hover:bg-brand-orange-dark transition disabled:opacity-60"
      >
        {submitting ? "Mise a jour..." : "Mettre a jour"}
      </button>
    </form>
  );
}
