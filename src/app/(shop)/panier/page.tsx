"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { formatUSD } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotal } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <EmptyState
          icon={ShoppingBag}
          title="Votre panier est vide"
          description="Parcourez nos categories et ajoutez des produits."
          actionLabel="Commencer mes achats"
          actionHref="/"
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="font-bold text-xl text-brand-ink mb-4">Mon panier ({items.length})</h1>
      <ul className="space-y-4">
        {items.map((item) => (
          <li key={item.variantId} className="flex gap-3 border-b border-brand-border pb-4">
            <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-brand-cream shrink-0">
              <Image
                src={item.imageUrl || "/products/placeholder.svg"}
                alt={item.name}
                fill
                sizes="80px"
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-brand-ink line-clamp-2">{item.name}</p>
              {item.size && <p className="text-xs text-brand-gray">{item.size}</p>}
              <p className="font-bold text-brand-ink mt-1">{formatUSD(item.unitPrice)}</p>
            </div>
            <div className="flex flex-col items-end justify-between">
              <button
                onClick={() => removeItem(item.variantId)}
                aria-label="Retirer"
                className="text-brand-gray hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-3 border border-brand-border rounded-full px-2.5 py-1.5">
                <button onClick={() => updateQuantity(item.variantId, item.quantity - 1)} aria-label="Diminuer">
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm w-4 text-center">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                  disabled={item.quantity >= item.maxQuantity}
                  aria-label="Augmenter"
                  className="disabled:opacity-30"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 space-y-2">
        <div className="flex justify-between text-sm text-brand-gray">
          <span>Sous-total</span>
          <span className="font-semibold text-brand-ink">{formatUSD(subtotal())}</span>
        </div>
        <p className="text-xs text-brand-gray">Les frais de livraison seront calcules a l&apos;etape suivante.</p>
      </div>

      <Link
        href="/checkout"
        className="mt-6 block text-center w-full rounded-full bg-brand-orange text-white font-semibold py-3.5 hover:bg-brand-orange-dark transition"
      >
        Passer a la caisse
      </Link>
    </div>
  );
}
