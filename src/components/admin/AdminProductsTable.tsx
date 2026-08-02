"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatHTG } from "@/lib/format";
import { ProductRowActions } from "@/components/admin/ProductRowActions";
import {
  bulkUpdateCategory,
  bulkUpdatePrice,
  bulkUpdateStock,
  bulkMarkVerified,
  bulkDeleteProducts,
} from "@/lib/actions/admin-products";
import { useToastStore } from "@/store/toast-store";
import type { Category } from "@/types/database";

interface VariantLike {
  is_default: boolean;
  selling_price: number;
  inventory_quantity: number;
  low_stock_threshold: number;
}

type ImageQualityStatus = "approved" | "needs_replacement" | "missing";

interface ProductRow {
  id: string;
  name: string;
  active: boolean;
  is_draft_product: boolean;
  image_quality_status: ImageQualityStatus;
  category: { name: string } | null;
  variants: VariantLike[];
}

const IMAGE_QUALITY_LABELS: Record<ImageQualityStatus, string> = {
  approved: "Image OK",
  needs_replacement: "Image a remplacer",
  missing: "Image manquante",
};

const IMAGE_QUALITY_STYLES: Record<ImageQualityStatus, string> = {
  approved: "bg-green-50 text-brand-green",
  needs_replacement: "bg-amber-100 text-amber-700",
  missing: "bg-gray-100 text-brand-gray",
};

export function AdminProductsTable({
  products,
  categories,
}: {
  products: ProductRow[];
  categories: Category[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkStock, setBulkStock] = useState("");
  const [isPending, startTransition] = useTransition();
  const push = useToastStore((s) => s.push);
  const router = useRouter();

  const allSelected = products.length > 0 && selected.size === products.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(products.map((p) => p.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function ids() {
    return Array.from(selected);
  }

  function runBulk(action: () => Promise<{ error: string | null }>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) push(result.error, "error");
      else {
        push("Mise a jour effectuee", "success");
        setSelected(new Set());
        router.refresh();
      }
    });
  }

  return (
    <div>
      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 bg-brand-ink text-white rounded-2xl px-4 py-3 text-sm">
          <span className="font-semibold">{selected.size} selectionne(s)</span>

          <select
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value)}
            className="rounded-lg px-2 py-1.5 text-brand-ink"
          >
            <option value="">Categorie...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            disabled={!bulkCategory || isPending}
            onClick={() => runBulk(() => bulkUpdateCategory(ids(), bulkCategory))}
            className="rounded-lg bg-white/10 px-3 py-1.5 disabled:opacity-40 hover:bg-white/20"
          >
            Appliquer
          </button>

          <input
            type="number"
            placeholder="Prix HTG"
            value={bulkPrice}
            onChange={(e) => setBulkPrice(e.target.value)}
            className="w-24 rounded-lg px-2 py-1.5 text-brand-ink"
          />
          <button
            disabled={!bulkPrice || isPending}
            onClick={() => runBulk(() => bulkUpdatePrice(ids(), Number(bulkPrice)))}
            className="rounded-lg bg-white/10 px-3 py-1.5 disabled:opacity-40 hover:bg-white/20"
          >
            Appliquer
          </button>

          <input
            type="number"
            placeholder="Stock"
            value={bulkStock}
            onChange={(e) => setBulkStock(e.target.value)}
            className="w-20 rounded-lg px-2 py-1.5 text-brand-ink"
          />
          <button
            disabled={!bulkStock || isPending}
            onClick={() => runBulk(() => bulkUpdateStock(ids(), Number(bulkStock)))}
            className="rounded-lg bg-white/10 px-3 py-1.5 disabled:opacity-40 hover:bg-white/20"
          >
            Appliquer
          </button>

          <button
            disabled={isPending}
            onClick={() => runBulk(() => bulkMarkVerified(ids()))}
            className="rounded-lg bg-brand-green px-3 py-1.5 font-semibold hover:opacity-90"
          >
            Marquer verifie
          </button>

          <button
            disabled={isPending}
            onClick={() => {
              if (confirm(`Supprimer ${selected.size} produit(s) ? Cette action est irreversible.`)) {
                runBulk(() => bulkDeleteProducts(ids()));
              }
            }}
            className="rounded-lg bg-red-600 px-3 py-1.5 font-semibold hover:opacity-90"
          >
            Supprimer
          </button>
        </div>
      )}

      <div className="bg-white border border-brand-border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-brand-gray border-b border-brand-border">
              <th className="px-4 py-3 w-10">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
              </th>
              <th className="px-4 py-3 font-medium">Produit</th>
              <th className="px-4 py-3 font-medium">Categorie</th>
              <th className="px-4 py-3 font-medium">Prix</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const variant = p.variants?.find((v) => v.is_default) ?? p.variants?.[0];
              return (
                <tr key={p.id} className="border-b border-brand-border last:border-0">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleOne(p.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/produits/${p.id}`} className="font-medium text-brand-ink hover:text-brand-orange">
                      {p.name}
                    </Link>
                    {p.is_draft_product && (
                      <span className="ml-2 inline-block text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                        Draft
                      </span>
                    )}
                    <span
                      className={`ml-2 inline-block text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${IMAGE_QUALITY_STYLES[p.image_quality_status]}`}
                    >
                      {IMAGE_QUALITY_LABELS[p.image_quality_status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-brand-gray">{p.category?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-brand-ink">{variant ? formatHTG(variant.selling_price) : "-"}</td>
                  <td className="px-4 py-3">
                    <span className={variant && variant.inventory_quantity <= variant.low_stock_threshold ? "text-amber-600 font-semibold" : "text-brand-ink"}>
                      {variant?.inventory_quantity ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${p.active ? "bg-green-50 text-brand-green" : "bg-gray-100 text-brand-gray"}`}>
                      {p.active ? "Actif" : "Masque"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ProductRowActions id={p.id} active={p.active} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
