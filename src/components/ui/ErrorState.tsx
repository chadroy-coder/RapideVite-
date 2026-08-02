"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export function ErrorState({
  title = "Une erreur est survenue",
  description = "Veuillez reessayer dans un instant.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="font-semibold text-brand-ink text-lg">{title}</h3>
      <p className="text-brand-gray text-sm mt-1 max-w-xs">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-brand-border text-sm font-semibold px-6 py-2.5 hover:bg-brand-cream transition"
        >
          <RotateCcw className="w-4 h-4" /> Reessayer
        </button>
      )}
    </div>
  );
}
