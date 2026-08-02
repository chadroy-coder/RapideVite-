"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { orderStatusUpdateSchema, type OrderStatusUpdateInput } from "@/lib/validations/schemas";
import { updateOrderStatus } from "@/lib/actions/admin-orders";
import { useToastStore } from "@/store/toast-store";
import { ORDER_STATUS_LABELS } from "@/types/database";
import { useRouter } from "next/navigation";

export function OrderStatusForm({
  orderId,
  currentStatus,
  assignedDeliveryPerson,
  estimatedDeliveryTime,
}: {
  orderId: string;
  currentStatus: string;
  assignedDeliveryPerson: string | null;
  estimatedDeliveryTime: string | null;
}) {
  const push = useToastStore((s) => s.push);
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit } = useForm<OrderStatusUpdateInput>({
    resolver: zodResolver(orderStatusUpdateSchema),
    defaultValues: {
      order_id: orderId,
      status: currentStatus as OrderStatusUpdateInput["status"],
      assigned_delivery_person: assignedDeliveryPerson ?? "",
      estimated_delivery_time: estimatedDeliveryTime ?? "",
    },
  });

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
      <div>
        <label className="text-sm font-medium text-brand-ink">Livreur assigne</label>
        <input {...register("assigned_delivery_person")} className="mt-1 w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40" />
      </div>
      <div>
        <label className="text-sm font-medium text-brand-ink">Heure de livraison estimee</label>
        <input type="datetime-local" {...register("estimated_delivery_time")} className="mt-1 w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40" />
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
