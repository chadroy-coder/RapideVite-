import type { OrderStatus } from "@/types/database";
import { ORDER_STATUS_LABELS } from "@/types/database";

const COLORS: Record<OrderStatus, string> = {
  new: "bg-blue-50 text-blue-600",
  confirmed: "bg-indigo-50 text-indigo-600",
  preparing: "bg-amber-50 text-amber-600",
  ready: "bg-purple-50 text-purple-600",
  out_for_delivery: "bg-orange-50 text-brand-orange",
  delivered: "bg-green-50 text-brand-green",
  cancelled: "bg-red-50 text-red-600",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${COLORS[status]}`}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
