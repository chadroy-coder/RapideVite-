import { CategoryForm } from "@/components/admin/CategoryForm";

export default function NewCategoryPage() {
  return (
    <div>
      <h1 className="font-bold text-2xl text-brand-ink mb-6">Ajouter une categorie</h1>
      <CategoryForm />
    </div>
  );
}
