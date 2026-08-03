"use client";

import Image from "next/image";
import { useState } from "react";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import type { Product, ProductVariant } from "@/types/database";
import { formatUSD } from "@/lib/format";
import { useCartStore } from "@/store/cart-store";

export function ProductDetailClient({
  product,
}: {
  product: Product & { variants: ProductVariant[] };
}) {
  const variants = product.variants ?? [];
  const [variant, setVariant] = useState<ProductVariant | undefined>(
    variants.find((v) => v.is_default) ?? variants[0]
  );
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((s) => s.addItem);

  if (!variant) {
    return <p className="text-brand-gray">Ce produit n&apos;est pas disponible actuellement.</p>;
  }

  const outOfStock = !variant.in_stock || variant.inventory_quantity <= 0;
  const onSale = variant.previous_price && variant.previous_price > variant.selling_price;

  function handleAdd() {
    if (!variant || outOfStock) return;
    addItem(
      {
        variantId: variant.id,
        productId: product.id,
        productSlug: product.slug,
        name: product.name,
        imageUrl: product.image_url,
        size: variant.size,
        unitPrice: variant.selling_price,
        maxQuantity: variant.inventory_quantity,
      },
      quantity
    );
    setQuantity(1);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-5 grid md:grid-cols-2 gap-8">
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-brand-cream">
        <Image
          src={product.image_url || "/products/placeholder.svg"}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority
        />
        {onSale && (
          <span className="absolute top-3 left-3 bg-brand-orange text-white text-xs font-bold px-2.5 py-1 rounded-full">
            PROMO
          </span>
        )}
      </div>

      <div className="flex flex-col">
        {product.brand && <p className="text-sm text-brand-gray">{product.brand}</p>}
        <h1 className="text-2xl font-extrabold text-brand-ink mt-1">{product.name}</h1>
        {product.category && (
          <p className="text-xs text-brand-gray mt-1">{product.category.name}</p>
        )}

        <div className="flex items-baseline gap-2 mt-4">
          <span className="text-2xl font-bold text-brand-ink">{formatUSD(variant.selling_price)}</span>
          {onSale && (
            <span className="text-brand-gray line-through text-sm">
              {formatUSD(variant.previous_price!)}
            </span>
          )}
        </div>

        {variants.length > 1 && (
          <div className="mt-5">
            <p className="text-sm font-semibold text-brand-ink mb-2">Format</p>
            <div className="flex flex-wrap gap-2">
              {variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setVariant(v);
                    setQuantity(1);
                  }}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    v.id === variant.id
                      ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
                      : "border-brand-border text-brand-ink hover:border-brand-orange"
                  }`}
                >
                  {v.size ?? v.unit ?? "Standard"}
                </button>
              ))}
            </div>
          </div>
        )}

        {product.description && (
          <p className="text-sm text-brand-gray mt-5 leading-relaxed">{product.description}</p>
        )}

        <div className="mt-6">
          {outOfStock ? (
            <p className="text-sm font-semibold text-red-500">Rupture de stock</p>
          ) : (
            <p className="text-sm text-brand-green font-medium">
              En stock ({variant.inventory_quantity} disponibles)
            </p>
          )}
        </div>

        <div className="mt-auto pt-6 flex items-center gap-3">
          <div className="flex items-center gap-3 border border-brand-border rounded-full px-3 py-2.5">
            <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Diminuer">
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-6 text-center font-medium">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => Math.min(variant.inventory_quantity, q + 1))}
              disabled={quantity >= variant.inventory_quantity}
              aria-label="Augmenter"
              className="disabled:opacity-30"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={handleAdd}
            disabled={outOfStock}
            className="flex-1 flex items-center justify-center gap-2 rounded-full bg-brand-orange text-white font-semibold py-3.5 disabled:bg-brand-gray/40 hover:bg-brand-orange-dark transition"
          >
            <ShoppingCart className="w-5 h-5" />
            Ajouter au panier
          </button>
        </div>
      </div>
    </div>
  );
}
