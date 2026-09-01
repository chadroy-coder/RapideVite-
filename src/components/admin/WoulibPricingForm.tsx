"use client";

import { useState } from "react";
import { updateVehicleTypePricing } from "@/lib/actions/admin-woulib";
import { useToastStore } from "@/store/toast-store";
import type { WoulibVehicleType } from "@/types/database";

export function WoulibPricingForm({ vehicleTypes }: { vehicleTypes: WoulibVehicleType[] }) {
  return (
    <div className="bg-white border border-brand-border rounded-2xl p-5">
      <h2 className="font-semibold text-brand-ink mb-1">Tarification</h2>
      <p className="text-xs text-brand-gray mb-4">
        Prix = tarif de base + (prix/km &times; distance) + (prix/min &times; duree), arrondi au 0.25$ le plus proche.
      </p>
      <div className="space-y-4">
        {vehicleTypes.map((vt) => (
          <VehicleTypeRow key={vt.id} vehicleType={vt} />
        ))}
      </div>
    </div>
  );
}

function VehicleTypeRow({ vehicleType }: { vehicleType: WoulibVehicleType }) {
  const push = useToastStore((s) => s.push);
  const [baseFare, setBaseFare] = useState(String(vehicleType.base_fare));
  const [pricePerKm, setPricePerKm] = useState(String(vehicleType.price_per_km));
  const [pricePerMinute, setPricePerMinute] = useState(String(vehicleType.price_per_minute));
  const [active, setActive] = useState(vehicleType.active);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const result = await updateVehicleTypePricing(vehicleType.id, {
      base_fare: parseFloat(baseFare),
      price_per_km: parseFloat(pricePerKm),
      price_per_minute: parseFloat(pricePerMinute),
      active,
    });
    setSaving(false);
    if (result.error) {
      push(result.error, "error");
      return;
    }
    push(`${vehicleType.name} mis a jour`, "success");
  }

  return (
    <div className="border border-brand-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-medium text-brand-ink text-sm">{vehicleType.name}</p>
        <label className="flex items-center gap-1.5 text-xs text-brand-gray">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Actif
        </label>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-brand-gray block mb-1">Tarif de base ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={baseFare}
            onChange={(e) => setBaseFare(e.target.value)}
            className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
          />
        </div>
        <div>
          <label className="text-xs text-brand-gray block mb-1">$/km</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={pricePerKm}
            onChange={(e) => setPricePerKm(e.target.value)}
            className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
          />
        </div>
        <div>
          <label className="text-xs text-brand-gray block mb-1">$/min</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={pricePerMinute}
            onChange={(e) => setPricePerMinute(e.target.value)}
            className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="mt-3 rounded-full bg-brand-orange text-white text-xs font-semibold px-4 py-2 disabled:opacity-60"
      >
        {saving ? "Enregistrement..." : "Enregistrer"}
      </button>
    </div>
  );
}
