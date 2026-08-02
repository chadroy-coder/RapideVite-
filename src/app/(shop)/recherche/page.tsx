import Link from "next/link";
import { getCategories, searchProducts } from "@/lib/data";
import { ProductCard } from "@/components/product/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { CategoryGrid } from "@/components/product/CategoryGrid";
import type { Product, ProductVariant } from "@/types/database";

const POPULAR_SEARCHES = [
  "Oeufs",
  "Lait",
  "Pain",
  "Poulet",
  "Riz",
  "Eau",
  "Jus",
  "Savon",
  "Dentifrice",
  "Rhum",
];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const [products, categories] = await Promise.all([
    query ? searchProducts(query) : Promise.resolve([]),
    query ? Promise.resolve([]) : getCategories(),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-5">
      <h1 className="font-bold text-xl text-brand-ink mb-4">
        {query ? `Resultats pour "${query}"` : "Rechercher un produit"}
      </h1>

      {!query && (
        <div className="space-y-8">
          <section>
            <h2 className="font-bold text-lg text-brand-ink mb-3">Recherches populaires</h2>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {POPULAR_SEARCHES.map((term) => (
                <Link
                  key={term}
                  href={`/recherche?q=${encodeURIComponent(term)}`}
                  className="shrink-0 px-3.5 py-1.5 rounded-full bg-brand-cream border border-brand-border text-sm font-medium text-brand-ink hover:bg-brand-orange hover:text-white hover:border-brand-orange transition"
                >
                  {term}
                </Link>
              ))}
            </div>
          </section>

          {categories.length > 0 && (
            <section>
              <h2 className="font-bold text-lg text-brand-ink mb-3">Magasiner par categorie</h2>
              <CategoryGrid categories={categories} />
            </section>
          )}
        </div>
      )}

      {query && products.length === 0 && (
        <EmptyState
          title="Aucun resultat"
          description={`Nous n'avons trouve aucun produit pour "${query}".`}
          actionLabel="Retour a l'accueil"
          actionHref="/"
        />
      )}

      {products.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p as Product & { variants: ProductVariant[] }} />
          ))}
        </div>
      )}
    </div>
  );
}
