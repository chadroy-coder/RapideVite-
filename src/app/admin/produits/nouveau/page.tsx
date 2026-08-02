import { listCategoriesAdmin } from "@/lib/actions/admin-categories";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  const categories = await listCategoriesAdmin();

  return (
    <div>
      <h1 className="font-bold text-2xl text-brand-ink mb-6">Ajouter un produit</h1>
      <ProductForm categories={categories} />
    </div>
  );
}
