import Image from "next/image";
import type { OrderItem } from "@/types/database";

// Small row of overlapping product thumbnails for compact order rows
// (account page live orders, order history list). Shows up to `max`
// images, then a "+N" badge for anything beyond that.
export function OrderItemsPreview({ items, max = 6 }: { items: OrderItem[]; max?: number }) {
  if (items.length === 0) return null;

  const shown = items.slice(0, max);
  const remaining = items.length - shown.length;

  return (
    <div className="flex items-center -space-x-2 mt-1.5">
      {shown.map((item) => (
        <div
          key={item.id}
          className="relative w-8 h-8 rounded-full border-2 border-white bg-brand-cream overflow-hidden shrink-0"
        >
          <Image
            src={item.product?.image_url || "/products/placeholder.svg"}
            alt={item.product_name}
            fill
            sizes="32px"
            className="object-cover"
          />
        </div>
      ))}
      {remaining > 0 && (
        <div className="relative w-8 h-8 rounded-full border-2 border-white bg-brand-orange text-white text-[11px] font-bold flex items-center justify-center shrink-0">
          +{remaining}
        </div>
      )}
    </div>
  );
}
