import { getProductsByCategorySlug } from "@/lib/data";
import { ProductCard } from "@/components/product/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { notFound } from "next/navigation";
import type { Product, ProductVariant } from "@/types/database";

export const revalidate = 60;

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { category, products } = await getProductsByCategorySlug(slug);
  if (!category) notFound();

  return (
    <div className="max-w-6xl mx-auto px-4 py-5">
      <h1 className="font-bold text-xl text-brand-ink mb-1">{category.name}</h1>
      {category.description && <p className="text-brand-gray text-sm mb-4">{category.description}</p>}

      {products.length === 0 ? (
        <EmptyState
          title="Aucun produit dans cette categorie"
          description="Revenez bientot, nous ajoutons des produits regulierement."
          actionLabel="Retour a l'accueil"
          actionHref="/"
        />
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-2">
          {products.map((p) => (
            <ProductCard key={p.id} product={p as Product & { variants: ProductVariant[] }} />
          ))}
        </div>
      )}
    </div>
  );
}
