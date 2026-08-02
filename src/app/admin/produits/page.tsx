import Link from "next/link";
import { Plus } from "lucide-react";
import { listProductsAdmin } from "@/lib/actions/admin-products";
import { listCategoriesAdmin } from "@/lib/actions/admin-categories";
import { AdminProductsTable } from "@/components/admin/AdminProductsTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Package } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const [products, categories] = await Promise.all([listProductsAdmin(q), listCategoriesAdmin()]);
  const draftCount = products.filter((p) => p.is_draft_product).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bold text-2xl text-brand-ink">Produits</h1>
          {draftCount > 0 && (
            <p className="text-sm text-amber-600 font-medium mt-1">
              {draftCount} produit(s) brouillon a verifier
            </p>
          )}
        </div>
        <Link
          href="/admin/produits/nouveau"
          className="flex items-center gap-2 rounded-full bg-brand-orange text-white text-sm font-semibold px-5 py-2.5 hover:bg-brand-orange-dark transition"
        >
          <Plus className="w-4 h-4" /> Ajouter un produit
        </Link>
      </div>

      <form className="mb-5">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Rechercher par nom ou marque..."
          className="w-full max-w-sm border border-brand-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-orange/40 bg-white"
        />
      </form>

      {products.length === 0 ? (
        <EmptyState icon={Package} title="Aucun produit" description="Ajoutez votre premier produit pour commencer." actionLabel="Ajouter un produit" actionHref="/admin/produits/nouveau" />
      ) : (
        <AdminProductsTable products={products} categories={categories} />
      )}
    </div>
  );
}
