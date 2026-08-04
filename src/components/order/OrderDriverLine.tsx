import Image from "next/image";
import { Bike } from "lucide-react";

// Compact "driver + ETA" line shown under an order row (account page live
// orders, order history list) once staff has assigned a driver. Renders
// nothing if no driver/ETA has been set yet for that order.
export function OrderDriverLine({
  name,
  photoUrl,
  eta,
}: {
  name: string | null;
  photoUrl: string | null;
  eta: string | null;
}) {
  if (!name && !eta) return null;

  return (
    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-brand-orange font-medium">
      <div className="relative w-5 h-5 rounded-full overflow-hidden border border-white shadow-sm bg-brand-cream shrink-0 flex items-center justify-center">
        {photoUrl ? (
          <Image src={photoUrl} alt={name ?? "Livreur"} fill sizes="20px" className="object-cover" />
        ) : (
          <Bike className="w-3 h-3 text-brand-orange" />
        )}
      </div>
      <span className="truncate">
        {name}
        {eta &&
          ` · ${new Date(eta).toLocaleString("fr-HT", { dateStyle: "short", timeStyle: "short" })}`}
      </span>
    </div>
  );
}
