"use client";

import { useToastStore } from "@/store/toast-store";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

export function Toaster() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[92%] max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`flex items-start gap-2 rounded-xl px-4 py-3 shadow-lg text-sm font-medium text-white animate-in fade-in slide-in-from-top-2 ${
            t.variant === "success"
              ? "bg-brand-green"
              : t.variant === "error"
              ? "bg-red-600"
              : "bg-brand-ink"
          }`}
        >
          {t.variant === "success" && <CheckCircle2 className="w-5 h-5 shrink-0" />}
          {t.variant === "error" && <XCircle className="w-5 h-5 shrink-0" />}
          {t.variant === "info" && <Info className="w-5 h-5 shrink-0" />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => dismiss(t.id)} aria-label="Fermer" className="shrink-0">
            <X className="w-4 h-4 opacity-80" />
          </button>
        </div>
      ))}
    </div>
  );
}
