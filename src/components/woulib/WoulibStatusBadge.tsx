import type { WoulibStatus } from "@/types/database";
import { WOULIB_STATUS_LABELS } from "@/types/database";

const COLORS: Record<WoulibStatus, string> = {
  requested: "bg-blue-50 text-blue-600",
  accepted: "bg-indigo-50 text-indigo-600",
  en_route_pickup: "bg-amber-50 text-amber-600",
  picked_up: "bg-purple-50 text-purple-600",
  en_route_dropoff: "bg-orange-50 text-brand-orange",
  completed: "bg-green-50 text-brand-green",
  cancelled: "bg-red-50 text-red-600",
};

export function WoulibStatusBadge({ status }: { status: WoulibStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${COLORS[status]}`}>
      {WOULIB_STATUS_LABELS[status]}
    </span>
  );
}
