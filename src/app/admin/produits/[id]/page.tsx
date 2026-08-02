import { notFound } from "next/navigation";
import { getProductForEdit } from "@/lib/actions/admin-products";
import { listCategoriesAdmin } from "@/lib/actions/admin-categories";
import { ProductForm } from "@/components/admin/ProductForm";
import type { ProductVariant } from "@/types/database";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([getProductForEdit(id), listCategoriesAdmin()]);
  if (!product) notFound();

  const variant = (product.variants as ProductVariant[] | undefined)?.find((v) => v.is_default) ??
    (product.variants as ProductVariant[] | undefined)?.[0];

  return (
    <div>
      <h1 className="font-bold text-2xl text-brand-ink mb-6">Modifier le produit</h1>
      <ProductForm
        categories={categories}
        productId={id}
        defaultValues={{
          name: product.name,
          slug: product.slug,
          description: product.description ?? "",
          brand: product.brand ?? "",
          category_id: product.category_id ?? "",
          subcategory: product.subcategory ?? "",
          image_url: product.image_url ?? "",
          featured: product.featured,
          promotion: product.promotion,
          active: product.active,
          size: variant?.size ?? "",
          unit: variant?.unit ?? "",
          sku: variant?.sku ?? "",
          barcode: variant?.barcode ?? "",
          selling_price: variant?.selling_price ?? 0,
          previous_price: variant?.previous_price ?? undefined,
          cost_price: variant?.cost_price ?? undefined,
          inventory_quantity: variant?.inventory_quantity ?? 0,
          low_stock_threshold: variant?.low_stock_threshold ?? 5,
        }}
      />
    </div>
  );
}
