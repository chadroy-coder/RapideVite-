"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { Product, ProductVariant } from "@/types/database";
import { formatHTG } from "@/lib/format";
import { useCartStore } from "@/store/cart-store";

export function ProductCard({ product }: { product: Product & { variants: ProductVariant[] } }) {
  const variant = product.variants?.find((v) => v.is_default) ?? product.variants?.[0];
  const addItem = useCartStore((s) => s.addItem);

  if (!variant) return null;

  const outOfStock = !variant.in_stock || variant.inventory_quantity <= 0;
  const onSale = variant.previous_price && variant.previous_price > variant.selling_price;

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    addItem({
      variantId: variant.id,
      productId: product.id,
      productSlug: product.slug,
      name: product.name,
      imageUrl: product.image_url,
      size: variant.size,
      unitPrice: variant.selling_price,
      maxQuantity: variant.inventory_quantity,
    });
  }

  return (
    <Link
      href={`/produit/${product.slug}`}
      className="group rounded-2xl border border-brand-border overflow-hidden bg-white hover:shadow-md transition flex flex-col"
    >
      <div className="relative aspect-square bg-brand-cream">
        <Image
          src={product.image_url || "/products/placeholder.svg"}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, 25vw"
          className="object-cover"
        />
        {onSale && (
          <span className="absolute top-2 left-2 bg-brand-orange text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
            PROMO
          </span>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="text-xs font-semibold text-brand-gray bg-white px-2 py-1 rounded-full border border-brand-border">
              Rupture de stock
            </span>
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-sm font-medium text-brand-ink line-clamp-2">{product.name}</p>
        {variant.size && <p className="text-xs text-brand-gray">{variant.size}</p>}
        <div className="mt-auto flex items-center justify-between pt-1">
          <div className="flex flex-col">
            <span className="font-bold text-brand-ink text-sm">{formatHTG(variant.selling_price)}</span>
            {onSale && (
              <span className="text-xs text-brand-gray line-through">
                {formatHTG(variant.previous_price!)}
              </span>
            )}
          </div>
          <button
            onClick={handleAdd}
            disabled={outOfStock}
            aria-label={`Ajouter ${product.name} au panier`}
            className="w-8 h-8 rounded-full bg-brand-orange text-white flex items-center justify-center disabled:bg-brand-gray/40 hover:bg-brand-orange-dark transition"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Link>
  );
}
