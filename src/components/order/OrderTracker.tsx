import { Check } from "lucide-react";
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

  return (
    <ol className="space-y-0">
      {STEPS.map((step, i) => {
        const done = i <= currentIndex;
        return (
          <li key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  done ? "bg-brand-green text-white" : "bg-brand-border text-brand-gray"
                }`}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </span>
              {i < STEPS.length - 1 && (
                <span className={`w-0.5 flex-1 min-h-6 ${done ? "bg-brand-green" : "bg-brand-border"}`} />
              )}
            </div>
            <p className={`text-sm pb-6 ${done ? "text-brand-ink font-medium" : "text-brand-gray"}`}>
              {step.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
