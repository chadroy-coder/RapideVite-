import { Check, Car } from "lucide-react";
import type { WoulibStatus } from "@/types/database";

const STEPS: { key: WoulibStatus; label: string }[] = [
  { key: "requested", label: "Demande envoyee" },
  { key: "accepted", label: "Chauffeur assigne" },
  { key: "en_route_pickup", label: "En route vers le depart" },
  { key: "picked_up", label: "Recupere" },
  { key: "en_route_dropoff", label: "En route vers l'arrivee" },
  { key: "completed", label: "Termine" },
];

export function WoulibTracker({ status }: { status: WoulibStatus }) {
  if (status === "cancelled") {
    return (
      <div className="rounded-xl bg-red-50 text-red-600 text-sm font-semibold px-4 py-3">
        Cette demande a ete annulee.
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.key === status);
  const isCompleted = status === "completed";

  return (
    <ol className="space-y-0 max-w-xs mx-auto">
      {STEPS.map((step, i) => {
        const done = i < currentIndex || (i === currentIndex && isCompleted);
        const current = i === currentIndex && !isCompleted;
        const reached = i <= currentIndex;
        const lineFilled = i < currentIndex || isCompleted;

        return (
          <li key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`relative w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  done
                    ? "bg-brand-green text-white"
                    : current
                      ? "bg-brand-orange text-white"
                      : "bg-brand-border text-brand-gray"
                }`}
              >
                {done ? (
                  <Check className="w-4 h-4" />
                ) : current ? (
                  <>
                    <span className="absolute inset-0 rounded-full bg-brand-orange animate-ping opacity-40" />
                    <Car className="w-4 h-4 relative z-10" />
                  </>
                ) : (
                  i + 1
                )}
              </span>
              {i < STEPS.length - 1 && (
                <span className={`w-0.5 flex-1 min-h-6 transition-colors ${lineFilled ? "bg-brand-green" : "bg-brand-border"}`} />
              )}
            </div>
            <p
              className={`text-sm pb-6 ${
                current
                  ? "text-brand-orange font-semibold"
                  : reached
                    ? "text-brand-ink font-medium"
                    : "text-brand-gray"
              }`}
            >
              {step.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
