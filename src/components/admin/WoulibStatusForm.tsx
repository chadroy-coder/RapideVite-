"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { assignWoulibDriver, updateWoulibStatusAdmin, setWoulibFinalPrice } from "@/lib/actions/admin-woulib";
import { useToastStore } from "@/store/toast-store";
import { WOULIB_STATUS_LABELS, type WoulibStatus, type Driver } from "@/types/database";

export function WoulibStatusForm({
  requestId,
  currentStatus,
  assignedDriverId,
  estimatedPrice,
  finalPrice,
  drivers,
}: {
  requestId: string;
  currentStatus: WoulibStatus;
  assignedDriverId: string | null;
  estimatedPrice: number | null;
  finalPrice: number | null;
  drivers: Driver[];
}) {
  const router = useRouter();
  const push = useToastStore((s) => s.push);
  const [status, setStatus] = useState<WoulibStatus>(currentStatus);
  const [driverId, setDriverId] = useState(assignedDriverId ?? "");
  const [price, setPrice] = useState(String(finalPrice ?? estimatedPrice ?? ""));
  const [assigning, setAssigning] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [savingPrice, setSavingPrice] = useState(false);

  async function handleAssign() {
    if (!driverId) return;
    setAssigning(true);
    const result = await assignWoulibDriver(requestId, driverId);
    setAssigning(false);
    if (result.error) {
      push(result.error, "error");
      return;
    }
    if (status === "requested") setStatus("accepted");
    push("Chauffeur assigne", "success");
    router.refresh();
  }

  async function handleStatusChange(next: WoulibStatus) {
    setStatus(next);
    setUpdatingStatus(true);
    const result = await updateWoulibStatusAdmin(requestId, next);
    setUpdatingStatus(false);
    if (result.error) {
      push(result.error, "error");
      return;
    }
    push("Statut mis a jour", "success");
    router.refresh();
  }

  async function handleSavePrice() {
    const value = parseFloat(price);
    if (Number.isNaN(value)) return;
    setSavingPrice(true);
    const result = await setWoulibFinalPrice(requestId, value);
    setSavingPrice(false);
    if (result.error) {
      push(result.error, "error");
      return;
    }
    push("Prix final enregistre", "success");
    router.refresh();
  }

  return (
    <div className="space-y-4 bg-white border border-brand-border rounded-2xl p-5">
      <h2 className="font-semibold text-brand-ink">Gerer la demande</h2>

      <div>
        <label className="text-sm font-medium text-brand-ink">Statut</label>
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value as WoulibStatus)}
          disabled={updatingStatus}
          className="mt-1 w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
        >
          {Object.entries(WOULIB_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {drivers.length > 0 && (
        <div>
          <label className="text-sm font-medium text-brand-ink">Chauffeur</label>
          <div className="mt-1 flex gap-2">
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              className="flex-1 border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
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
            <button
              type="button"
              onClick={handleAssign}
              disabled={assigning || !driverId}
              className="rounded-xl bg-brand-orange text-white text-sm font-semibold px-4 disabled:opacity-60"
            >
              {assigning ? "..." : "Assigner"}
            </button>
          </div>
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-brand-ink">Prix final ($)</label>
        <div className="mt-1 flex gap-2">
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="flex-1 border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
          />
          <button
            type="button"
            onClick={handleSavePrice}
            disabled={savingPrice}
            className="rounded-xl border border-brand-border text-sm font-semibold px-4 hover:bg-brand-cream disabled:opacity-60"
          >
            {savingPrice ? "..." : "Enregistrer"}
          </button>
        </div>
        {estimatedPrice != null && <p className="text-xs text-brand-gray mt-1">Prix estime au depart : {estimatedPrice}$</p>}
      </div>
    </div>
  );
}
