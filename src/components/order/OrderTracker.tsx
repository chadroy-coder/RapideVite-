import { Check, Bike } from "lucide-react";
import type { OrderStatus } from "@/types/database";

const STEPS: { key: OrderStatus; label: string }[] = [
  { key: "new", label: "Nouvelle" },
  { key: "confirmed", label: "Confirmee" },
  { key: "preparing", label: "En preparation" },
  { key: "ready", label: "Prete" },
  { key: "out_for_delivery", label: "En livraison" },
  { key: "delivered", label: "Livree" },
];

export function OrderTracker({ status }: { status: OrderStatus }) {
  if (status === "cancelled") {
    return (
      <div className="rounded-xl bg-red-50 text-red-600 text-sm font-semibold px-4 py-3">
        Cette commande a ete annulee.
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.key === status);
  const isDelivered = status === "delivered";

  return (
    <ol className="space-y-0">
      {STEPS.map((step, i) => {
        // A step is fully "done" (checkmark) once we've passed it, or once
        // the whole order is delivered (every step is behind us by then).
        const done = i < currentIndex || (i === currentIndex && isDelivered);
        // The bike only sits on the one step actively in progress.
        const current = i === currentIndex && !isDelivered;
        const reached = i <= currentIndex;
        // The connecting line below a step fills in green once the delivery
        // has moved past that point - that's the "empty space" getting
        // covered as the bike makes its way down the timeline.
        const lineFilled = i < currentIndex || isDelivered;

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
                    <Bike className="w-4 h-4 relative z-10" />
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
              {current && <span className="ml-1 text-xs font-normal">(en cours)</span>}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
