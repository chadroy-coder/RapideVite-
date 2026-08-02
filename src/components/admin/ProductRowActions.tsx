"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { toggleProductActive, deleteProduct } from "@/lib/actions/admin-products";
import { useToastStore } from "@/store/toast-store";
import { useRouter } from "next/navigation";

export function ProductRowActions({ id, active }: { id: string; active: boolean }) {
  const [isPending, startTransition] = useTransition();
  const push = useToastStore((s) => s.push);
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleProductActive(id, !active);
      if (result.error) push(result.error, "error");
      else {
        push(active ? "Produit masque" : "Produit active", "success");
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    startTransition(async () => {
      const result = await deleteProduct(id);
      if (result.error) push(result.error, "error");
      else {
        push("Produit supprime", "success");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggle}
        disabled={isPending}
        title={active ? "Masquer" : "Afficher"}
        className="p-1.5 rounded-lg hover:bg-brand-cream text-brand-gray"
      >
        {active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </button>
      <button
        onClick={handleDelete}
        disabled={isPending}
        title="Supprimer"
        className={`p-1.5 rounded-lg hover:bg-red-50 ${confirming ? "text-red-600" : "text-brand-gray"}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
