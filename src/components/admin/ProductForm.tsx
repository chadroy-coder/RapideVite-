"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { productSchema, type ProductInput } from "@/lib/validations/schemas";
import { createProduct, updateProduct, uploadProductImage } from "@/lib/actions/admin-products";
import { useToastStore } from "@/store/toast-store";
import { slugify } from "@/lib/format";
import type { Category } from "@/types/database";

export function ProductForm({
  categories,
  productId,
  defaultValues,
}: {
  categories: Category[];
  productId?: string;
  defaultValues?: Partial<ProductInput>;
}) {
  const router = useRouter();
  const push = useToastStore((s) => s.push);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(defaultValues?.image_url || "");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      active: true,
      featured: false,
      promotion: false,
      inventory_quantity: 0,
      low_stock_threshold: 5,
      ...defaultValues,
    },
  });

  const name = watch("name");

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadProductImage(formData);
    setUploading(false);
    if (result.error || !result.url) {
      push(result.error ?? "Erreur de telechargement", "error");
      return;
    }
    setValue("image_url", result.url);
    setImagePreview(result.url);
    push("Image telechargee", "success");
  }

  async function onSubmit(values: ProductInput) {
    setSubmitting(true);
    const result = productId ? await updateProduct(productId, values) : await createProduct(values);
    setSubmitting(false);
    if (result.error) {
      push(result.error, "error");
      return;
    }
    push(productId ? "Produit mis a jour" : "Produit cree", "success");
    router.push("/admin/produits");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <div className="bg-white border border-brand-border rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold text-brand-ink">Informations generales</h2>
        <div>
          <label className="text-sm font-medium text-brand-ink">Nom du produit</label>
          <input
            {...register("name", {
              onChange: (e) => {
                if (!productId) setValue("slug", slugify(e.target.value));
              },
            })}
            className="mt-1 w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-brand-ink">Slug (URL)</label>
          <input
            {...register("slug")}
            className="mt-1 w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
          />
          {errors.slug && <p className="text-red-500 text-xs mt-1">{errors.slug.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-brand-ink">Description</label>
          <textarea
            {...register("description")}
            rows={3}
            className="mt-1 w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-brand-ink">Marque</label>
            <input {...register("brand")} className="mt-1 w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40" />
          </div>
          <div>
            <label className="text-sm font-medium text-brand-ink">Categorie</label>
            <select
              {...register("category_id")}
              className="mt-1 w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40"
              defaultValue=""
            >
              <option value="" disabled>Choisir...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.category_id && <p className="text-red-500 text-xs mt-1">{errors.category_id.message}</p>}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-brand-ink">Sous-categorie (optionnel)</label>
          <input {...register("subcategory")} className="mt-1 w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40" />
        </div>
      </div>

      <div className="bg-white border border-brand-border rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold text-brand-ink">Image du produit</h2>
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-brand-cream border border-brand-border shrink-0">
            <Image src={imagePreview || "/products/placeholder.svg"} alt={name || "produit"} fill className="object-cover" />
          </div>
          <div>
            <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="text-sm" />
            {uploading && <p className="text-xs text-brand-gray mt-1">Telechargement...</p>}
          </div>
        </div>
        <input type="hidden" {...register("image_url")} />
      </div>

      <div className="bg-white border border-brand-border rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold text-brand-ink">Prix et inventaire</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-brand-ink">Taille / volume</label>
            <input {...register("size")} placeholder="ex: 500ml" className="mt-1 w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40" />
          </div>
          <div>
            <label className="text-sm font-medium text-brand-ink">Unite</label>
            <input {...register("unit")} placeholder="ex: bottle" className="mt-1 w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40" />
          </div>
          <div>
            <label className="text-sm font-medium text-brand-ink">SKU</label>
            <input {...register("sku")} className="mt-1 w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40" />
            {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-brand-ink">Code-barres</label>
            <input {...register("barcode")} className="mt-1 w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40" />
          </div>
          <div>
            <label className="text-sm font-medium text-brand-ink">Prix de vente (HTG)</label>
            <input type="number" step="0.01" {...register("selling_price")} className="mt-1 w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40" />
            {errors.selling_price && <p className="text-red-500 text-xs mt-1">{errors.selling_price.message}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-brand-ink">Ancien prix (promo)</label>
            <input type="number" step="0.01" {...register("previous_price")} className="mt-1 w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40" />
          </div>
          <div>
            <label className="text-sm font-medium text-brand-ink">Prix de revient</label>
            <input type="number" step="0.01" {...register("cost_price")} className="mt-1 w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40" />
          </div>
          <div>
            <label className="text-sm font-medium text-brand-ink">Quantite en stock</label>
            <input type="number" {...register("inventory_quantity")} className="mt-1 w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40" />
          </div>
          <div>
            <label className="text-sm font-medium text-brand-ink">Seuil de stock faible</label>
            <input type="number" {...register("low_stock_threshold")} className="mt-1 w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-brand-border rounded-2xl p-5 flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm text-brand-ink">
          <input type="checkbox" {...register("active")} className="rounded" /> Actif (visible sur le site)
        </label>
        <label className="flex items-center gap-2 text-sm text-brand-ink">
          <input type="checkbox" {...register("featured")} className="rounded" /> Vedette
        </label>
        <label className="flex items-center gap-2 text-sm text-brand-ink">
          <input type="checkbox" {...register("promotion")} className="rounded" /> En promotion
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-brand-orange text-white font-semibold px-8 py-3 hover:bg-brand-orange-dark transition disabled:opacity-60"
      >
        {submitting ? "Enregistrement..." : productId ? "Mettre a jour le produit" : "Creer le produit"}
      </button>
    </form>
  );
}
