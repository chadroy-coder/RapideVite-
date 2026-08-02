"use client";

import { useState, useTransition } from "react";
import { updateVariantInventory } from "@/lib/actions/admin-products";
import { useToastStore } from "@/store/toast-store";

export function InventoryRow({
  variantId,
  initialQuantity,
  initialThreshold,
}: {
  variantId: string;
  initialQuantity: number;
  initialThreshold: number;
}) {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [threshold, setThreshold] = useState(initialThreshold);
  const [isPending, startTransition] = useTransition();
  const push = useToastStore((s) => s.push);

  function handleSave() {
    startTransition(async () => {
      const result = await updateVariantInventory(variantId, quantity, threshold);
      if (result.error) push(result.error, "error");
      else push("Inventaire mis a jour", "success");
    });
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
        className="w-20 border border-brand-border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
      />
      <input
        type="number"
        value={threshold}
        onChange={(e) => setThreshold(Number(e.target.value))}
        title="Seuil de stock faible"
        className="w-16 border border-brand-border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
      />
      <button
        onClick={handleSave}
        disabled={isPending}
        className="text-xs font-semibold text-brand-orange hover:underline disabled:opacity-50"
      >
        {isPending ? "..." : "Enregistrer"}
      </button>
    </div>
  );
}
