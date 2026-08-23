"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function DriverLinkCard({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail on non-HTTPS/older browsers - the URL is
      // still selectable in the input below as a fallback.
    }
  }

  return (
    <div className="bg-white border border-brand-border rounded-2xl p-5 space-y-2">
      <h2 className="font-semibold text-brand-ink">Lien livreur</h2>
      <p className="text-xs text-brand-gray">
        Envoyez ce lien au livreur assigne - il l&apos;ouvre sur son telephone pour partager sa position et gerer les
        articles indisponibles. Pas de compte requis.
      </p>
      <div className="flex gap-2">
        <input readOnly value={url} onFocus={(e) => e.target.select()} className="flex-1 min-w-0 border border-brand-border rounded-xl px-3 py-2 text-xs text-brand-gray bg-brand-cream" />
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded-xl border border-brand-border px-3 py-2 text-xs font-semibold hover:bg-brand-cream flex items-center gap-1.5"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-brand-green" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copie" : "Copier"}
        </button>
      </div>
    </div>
  );
}
