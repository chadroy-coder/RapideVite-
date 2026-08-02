"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { toggleCategoryActive, deleteCategory } from "@/lib/actions/admin-categories";
import { useToastStore } from "@/store/toast-store";

export function CategoryRowActions({ id, active }: { id: string; active: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const push = useToastStore((s) => s.push);
  const router = useRouter();

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleCategoryActive(id, !active);
      if (result.error) push(result.error, "error");
      else router.refresh();
    });
  }

  function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    startTransition(async () => {
      const result = await deleteCategory(id);
      if (result.error) push(result.error, "error");
      else router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={handleToggle} disabled={isPending} className="p-1.5 rounded-lg hover:bg-brand-cream text-brand-gray">
        {active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </button>
      <button onClick={handleDelete} disabled={isPending} className={`p-1.5 rounded-lg hover:bg-red-50 ${confirming ? "text-red-600" : "text-brand-gray"}`}>
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
