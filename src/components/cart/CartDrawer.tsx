"use client";

import Image from "next/image";
import Link from "next/link";
import { X, Minus, Plus, Trash2 } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { formatUSD, formatHTGEstimate } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { ShoppingBag } from "lucide-react";

export function CartDrawer() {
  const { items, isOpen, closeCart, updateQuantity, removeItem, subtotal } = useCartStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-end">
      <button
        aria-label="Fermer le panier"
        onClick={closeCart}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative bg-white w-full sm:w-[420px] sm:h-full rounded-t-3xl sm:rounded-none max-h-[85vh] sm:max-h-none flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-right">
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
          <h2 className="font-bold text-lg text-brand-ink">Mon panier</h2>
          <button onClick={closeCart} aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="Votre panier est vide"
              description="Ajoutez des produits pour commencer votre commande."
              actionLabel="Commencer mes achats"
              actionHref="/"
            />
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item.variantId} className="flex gap-3">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-brand-cream shrink-0">
                    <Image
                      src={item.imageUrl || "/products/placeholder.svg"}
                      alt={item.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-brand-ink line-clamp-1">{item.name}</p>
                    {item.size && <p className="text-xs text-brand-gray">{item.size}</p>}
                    <p className="text-sm font-bold text-brand-ink mt-1">{formatUSD(item.unitPrice)}</p>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() => removeItem(item.variantId)}
                      aria-label="Retirer"
                      className="text-brand-gray hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2 border border-brand-border rounded-full px-2 py-1">
                      <button
                        onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                        aria-label="Diminuer"
                      >
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
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-brand-border p-5 space-y-3 safe-bottom">
            <div className="flex justify-between text-sm text-brand-gray">
              <span>Sous-total</span>
              <div className="text-right">
                <span className="font-semibold text-brand-ink">{formatUSD(subtotal())}</span>
                <p className="text-[11px] text-brand-gray">{formatHTGEstimate(subtotal())}</p>
              </div>
            </div>
            <Link
              href="/panier"
              onClick={closeCart}
              className="block text-center w-full rounded-full bg-brand-orange text-white font-semibold py-3.5 hover:bg-brand-orange-dark transition"
            >
              Voir le panier
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
